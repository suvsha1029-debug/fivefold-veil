import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRoomStore } from '../server/rooms.js';
import { TwitchSessionApi } from '../server/twitch-session.js';

const ORIGIN = 'https://fivefold.example';
const ACCESS = 'test-access-sensitive';
const REFRESH = 'test-refresh-sensitive';
const NEXT_ACCESS = 'rotated-access-sensitive';
const NEXT_REFRESH = 'rotated-refresh-sensitive';
const ENV = { TWITCH_CLIENT_ID: 'testclient123456', TWITCH_CLIENT_SECRET: 'server-secret-sensitive', TWITCH_TOKEN_KEY: '12'.repeat(32), TWITCH_APP_ORIGIN: ORIGIN };
const ok = (body, status = 200) => Response.json(body, { status });

function fixture() {
  const store = new MemoryRoomStore(), calls = [], diagnostics = [];
  let clock = 1800000000000, expired = false, refreshFails = false, wrongClient = false, wrongScope = false, wrongUser = false, transient = false;
  const identity = () => ({ client_id: wrongClient ? 'another-client' : ENV.TWITCH_CLIENT_ID, user_id: wrongUser ? '999' : '123', login: 'broadcaster', scopes: wrongScope ? [] : ['user:read:chat'] });
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (transient) throw new Error('upstream error containing ' + ACCESS);
    if (url.endsWith('/oauth2/token')) {
      const body = new URLSearchParams(init.body);
      if (body.get('grant_type') === 'refresh_token') {
        await new Promise(resolve => setTimeout(resolve, 20));
        return refreshFails ? ok({ message: REFRESH }, 401) : ok({ access_token: NEXT_ACCESS, refresh_token: NEXT_REFRESH, expires_in: 5000 });
      }
      return ok({ access_token: ACCESS, refresh_token: REFRESH, expires_in: 5000 });
    }
    if (url.endsWith('/validate')) return expired && init.headers.Authorization === 'OAuth ' + ACCESS ? ok({ message: ACCESS }, 401) : ok(identity());
    if (url.includes('/helix/channels?')) return ok({ data: [{ broadcaster_id: '123', game_name: 'Chess', title: 'Together' }] });
    if (url.endsWith('/subscriptions')) return ok({ data: [{ secret: ACCESS }] }, 202);
    if (url.endsWith('/revoke')) return new Response(null, { status: 200 });
    throw new Error('Unexpected mock endpoint');
  };
  const options = { env: ENV, fetchImpl, now: () => clock, diagnostic: entry => diagnostics.push(entry) };
  const api = new TwitchSessionApi(store, options);
  const jar = new Map();
  function request(path, { method = 'GET', body, origin = ORIGIN, cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; '), headers = {} } = {}) {
    return new Request(ORIGIN + '/api/twitch/' + path, { method, headers: { ...(method === 'POST' ? { Origin: origin, 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers }, ...(method === 'POST' ? { body: JSON.stringify(body || {}) } : {}) });
  }
  async function call(path, init) {
    const response = await api.fetch(request(path, init));
    for (const cookie of response.headers.getSetCookie()) {
      const [name, value] = cookie.split(';')[0].split('=');
      if (value) jar.set(name, value); else jar.delete(name);
    }
    return response;
  }
  async function login() {
    const start = await call('start', { method: 'POST' });
    assert.equal(start.status, 200);
    const authorization = new URL((await start.json()).authorizationUrl);
    const state = authorization.searchParams.get('state');
    const pendingCookie = jar.get('fv_twitch_pending');
    const response = await call('exchange', { method: 'POST', body: { state, code: 'temporary-code' } });
    return { response, state, authorization, pendingCookie };
  }
  return { api, store, jar, calls, diagnostics, options, call, request, login, setExpired: value => expired = value, setRefreshFailure: value => refreshFails = value, setWrongClient: value => wrongClient = value, setWrongScope: value => wrongScope = value, setWrongUser: value => wrongUser = value, setTransient: value => transient = value, advance: ms => clock += ms };
}

test('authorization code exchange stores encrypted tokens and restores with only an opaque HttpOnly cookie', async () => {
  const f = fixture(), { response, authorization } = await f.login();
  assert.equal(response.status, 200);
  assert.equal(authorization.searchParams.get('response_type'), 'code');
  assert.equal(authorization.searchParams.get('redirect_uri'), ORIGIN + '/teams');
  assert.equal(authorization.searchParams.get('scope'), 'user:read:chat');
  assert.equal(authorization.searchParams.has('force_verify'), false);
  const data = await response.json();
  assert.equal(data.channel, 'broadcaster');
  const cookies = response.headers.getSetCookie().join('\n');
  assert.match(cookies, /HttpOnly/); assert.match(cookies, /Secure/); assert.match(cookies, /SameSite=Lax/); assert.match(cookies, /Path=\/api\/twitch/);
  assert.match(f.jar.get('fv_twitch_session'), /^[a-f0-9]{64}$/);
  const stored = JSON.stringify([...f.store.rows]);
  for (const secret of [ACCESS, REFRESH, ENV.TWITCH_CLIENT_SECRET, f.jar.get('fv_twitch_session')]) assert.equal(stored.includes(secret), false);
  for (const secret of [ACCESS, REFRESH, ENV.TWITCH_CLIENT_SECRET, 'temporary-code']) assert.equal(JSON.stringify(data).includes(secret), false);
  assert.equal([...f.store.rows.keys()].every(k => k.startsWith('TWITCH:')), true);
  const freshApi = new TwitchSessionApi(f.store, f.options);
  const restored = await freshApi.fetch(f.request('status'));
  assert.deepEqual(await restored.json(), { configured: true, connected: true, clientId: ENV.TWITCH_CLIENT_ID, channel: 'broadcaster', expiresAt: data.expiresAt });
  assert.equal(restored.headers.get('cache-control'), 'no-store, private');
  assert.equal(f.calls.every(c => !c.url.includes(ENV.TWITCH_CLIENT_SECRET) && !c.url.includes(ACCESS)), true);
});

test('rejects mismatched OAuth state, expired requests, cross-site posts and replay without exchanging a token', async () => {
  for (const mode of ['state', 'expiry', 'origin']) {
    const f = fixture();
    const started = await f.call('start', { method: 'POST' });
    const state = new URL((await started.json()).authorizationUrl).searchParams.get('state');
    if (mode === 'expiry') f.advance(600001);
    const response = await f.call('exchange', { method: 'POST', body: { code: 'code', state: mode === 'state' ? 'f'.repeat(64) : state }, ...(mode === 'origin' ? { origin: 'https://attacker.example' } : {}) });
    assert.equal(response.status, mode === 'origin' ? 403 : 400);
    assert.equal(f.calls.length, 0);
  }
  const f = fixture(), { response, state, pendingCookie } = await f.login();
  assert.equal(response.status, 200);
  const replay = await f.call('exchange', { method: 'POST', cookie: `fv_twitch_pending=${pendingCookie}`, body: { state, code: 'temporary-code' } });
  assert.equal(replay.status, 400);
  assert.equal(f.calls.filter(c => c.url.endsWith('/oauth2/token')).length, 1);
});

test('rejects OAuth identities with the wrong application or missing chat permission', async () => {
  for (const bad of ['client', 'scope']) {
    const f = fixture();
    if (bad === 'client') f.setWrongClient(true); else f.setWrongScope(true);
    const { response } = await f.login();
    assert.equal(response.status, 401);
    assert.equal(f.jar.has('fv_twitch_session'), false);
    assert.equal([...f.store.rows.values()].some(r => r.data.kind === 'twitch-session' && r.data.sealed), false);
  }
});

test('refreshes once on unauthorized access, rotates both encrypted tokens, and keeps the browser cookie', async () => {
  const f = fixture(); await f.login();
  const handle = f.jar.get('fv_twitch_session');
  f.setExpired(true);
  const response = await f.call('validate');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user_id, '123');
  assert.equal(f.jar.get('fv_twitch_session'), handle);
  const refreshes = f.calls.filter(c => c.url.endsWith('/oauth2/token') && new URLSearchParams(c.init.body).get('grant_type') === 'refresh_token');
  assert.equal(refreshes.length, 1);
  assert.equal(new URLSearchParams(refreshes[0].init.body).get('refresh_token'), REFRESH);
  const data = [...f.store.rows.values()].find(r => r.data.kind === 'twitch-session').data;
  assert.equal(data.tokenVersion, 1);
  assert.equal(JSON.stringify(data).includes(NEXT_ACCESS), false);
  assert.equal(JSON.stringify(data).includes(NEXT_REFRESH), false);
  f.setExpired(false);
  const second = await f.call('validate'); assert.equal(second.status, 200);
  assert.equal(f.calls.at(-1).init.headers.Authorization, 'OAuth ' + NEXT_ACCESS);
});

test('database compare-and-swap lease serializes token refresh across API instances', async () => {
  const f = fixture(); await f.login(); f.setExpired(true);
  const other = new TwitchSessionApi(f.store, f.options);
  const [a, b] = await Promise.all([f.api.fetch(f.request('validate')), other.fetch(f.request('validate'))]);
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  assert.equal(f.calls.filter(c => c.url.endsWith('/oauth2/token') && new URLSearchParams(c.init.body).get('grant_type') === 'refresh_token').length, 1);
});

test('invalid refresh or changed Twitch identity requires reauthorization and cannot expose upstream errors', async () => {
  for (const mode of ['revoked', 'identity']) {
    const f = fixture(); await f.login(); f.setExpired(true);
    if (mode === 'revoked') f.setRefreshFailure(true); else f.setWrongUser(true);
    const response = await f.call('validate');
    assert.equal(response.status, 401);
    const body = await response.text();
    for (const secret of [ACCESS, REFRESH, NEXT_ACCESS, NEXT_REFRESH, ENV.TWITCH_CLIENT_SECRET]) assert.equal(body.includes(secret), false);
    assert.equal((await (await f.call('status')).json()).connected, false);
  }
});

test('subscriptions use only the authenticated broadcaster, refuse arbitrary proxy destinations, and redact the upstream response', async () => {
  const f = fixture(); await f.login();
  const response = await f.call('subscribe', { method: 'POST', body: { type: 'channel.chat.message', sessionId: 'websocket-session-one' } });
  assert.equal(response.status, 202); assert.deepEqual(await response.json(), { subscribed: true });
  const request = f.calls.find(c => c.url.endsWith('/subscriptions'));
  assert.deepEqual(JSON.parse(request.init.body).condition, { broadcaster_user_id: '123', user_id: '123' });
  for (const body of [{ type: 'channel.ban', sessionId: 'websocket-session-one' }, { type: 'channel.chat.message', sessionId: 'websocket-session-one', broadcaster_user_id: '999' }, { type: 'channel.chat.message', sessionId: 'https://attacker.example' }]) {
    assert.equal((await f.call('subscribe', { method: 'POST', body })).status, 400);
  }
  assert.equal(f.calls.filter(c => c.url.endsWith('/subscriptions')).length, 1);
});

test('disconnect invalidates the vault, revokes best effort, clears cookies and blocks restoration', async () => {
  const f = fixture(); await f.login(); const oldCookie = f.jar.get('fv_twitch_session');
  const response = await f.call('disconnect', { method: 'POST' });
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { disconnected: true });
  assert.equal(f.jar.size, 0);
  const stale = await f.api.fetch(f.request('validate', { cookie: `fv_twitch_session=${oldCookie}` }));
  assert.equal(stale.status, 401);
  assert.equal(f.calls.some(c => c.url.endsWith('/revoke')), true);
  assert.equal([...f.store.rows.values()].filter(r => r.data.kind === 'twitch-session').every(r => r.data.revoked && !r.data.sealed), true);
});

test('expired sessions stop restoring; transient Twitch failures preserve the encrypted login for retry', async () => {
  const f = fixture(); await f.login();
  f.setTransient(true);
  const transient = await f.call('status'); assert.equal(transient.status, 503);
  assert.equal((await transient.text()).includes(ACCESS), false);
  assert.equal(f.jar.has('fv_twitch_session'), true);
  f.setTransient(false); assert.equal((await (await f.call('status')).json()).connected, true);
  f.advance(7 * 24 * 60 * 60 * 1000 + 1);
  assert.equal((await (await f.call('status')).json()).connected, false);
});

test('configuration, methods, duplicate cookies, content types and bounded bodies fail safely', async () => {
  const f = fixture();
  const unconfigured = new TwitchSessionApi(f.store, { env: { ...ENV, TWITCH_CLIENT_SECRET: '' } });
  assert.deepEqual(await (await unconfigured.fetch(f.request('status'))).json(), { configured: false, connected: false, clientId: ENV.TWITCH_CLIENT_ID });
  assert.equal((await f.api.fetch(f.request('start', { method: 'GET' }))).status, 405);
  assert.equal((await f.call('start', { method: 'POST', headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await f.call('start', { method: 'POST', body: { value: 'x'.repeat(5000) } })).status, 413);
  assert.equal((await f.call('validate', { cookie: `fv_twitch_session=${'a'.repeat(64)}; fv_twitch_session=${'b'.repeat(64)}` })).status, 401);
  assert.equal((await f.call('status', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await f.call('nested/status')).status, 404);
  assert.equal((await f.api.fetch(new Request(ORIGIN + '/status'))).status, 404);
  assert.equal((await f.api.fetch(new Request(ORIGIN + '/api/not-twitch/status'))).status, 404);
});

test('Disconnect cancels an in-flight code exchange before it can create a restored login', async () => {
  const f = fixture();
  let release, announce;
  const waiting = new Promise(resolve => { announce = resolve; });
  const blocked = new Promise(resolve => { release = resolve; });
  const original = f.options.fetchImpl;
  const api = new TwitchSessionApi(f.store, { ...f.options, fetchImpl: async (url, init) => {
    if (url.endsWith('/oauth2/token') && new URLSearchParams(init.body).get('grant_type') === 'authorization_code') { announce(); await blocked; }
    return original(url, init);
  } });
  const start = await f.call('start', { method: 'POST' });
  const state = new URL((await start.json()).authorizationUrl).searchParams.get('state');
  const exchange = api.fetch(f.request('exchange', { method: 'POST', body: { state, code: 'code' } }));
  await waiting;
  const disconnected = await api.fetch(f.request('disconnect', { method: 'POST' }));
  assert.equal(disconnected.status, 200);
  release();
  const result = await exchange;
  assert.equal(result.status, 401);
  assert.equal(result.headers.getSetCookie().some(c => /^fv_twitch_session=[a-f0-9]{64};/.test(c)), false);
  assert.equal([...f.store.rows.values()].some(r => r.data.kind === 'twitch-session' && r.data.sealed), false);
});

test('Disconnect during token refresh wins over the late refresh response', async () => {
  const f = fixture(); await f.login(); f.setExpired(true);
  const restoring = f.api.fetch(f.request('validate'));
  while (!f.calls.some(c => c.url.endsWith('/oauth2/token') && new URLSearchParams(c.init.body).get('grant_type') === 'refresh_token')) await new Promise(resolve => setTimeout(resolve, 1));
  const response = await f.call('disconnect', { method: 'POST' });
  assert.equal(response.status, 200);
  assert.equal((await restoring).status, 401);
  assert.equal([...f.store.rows.values()].some(r => r.data.kind === 'twitch-session' && r.data.sealed), false);
});

test('encrypted vault rows cannot be swapped to another browser session or restored with a different encryption key', async () => {
  const f = fixture(); await f.login();
  const otherKey = new TwitchSessionApi(f.store, { ...f.options, env: { ...ENV, TWITCH_TOKEN_KEY: '34'.repeat(32) } });
  assert.equal((await otherKey.fetch(f.request('validate'))).status, 401);
  const row = [...f.store.rows].find(([, value]) => value.data.kind === 'twitch-session');
  const stolenHandle = 'a'.repeat(64);
  const hashed = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stolenHandle)))].map(x => x.toString(16).padStart(2, '0')).join('');
  await f.store.insert('TWITCH:session:' + hashed, row[1].data);
  const swapped = await f.api.fetch(f.request('validate', { cookie: 'fv_twitch_session=' + stolenHandle }));
  assert.equal(swapped.status, 401);
});

test('a stalled failed refresh cannot invalidate a later successful refresh after its lease expires', async () => {
  const f = fixture(); await f.login(); f.setExpired(true);
  let release, announce, refreshCount = 0;
  const started = new Promise(resolve => { announce = resolve; });
  const blocked = new Promise(resolve => { release = resolve; });
  const original = f.options.fetchImpl;
  const options = { ...f.options, fetchImpl: async (url, init) => {
    if (url.endsWith('/oauth2/token') && new URLSearchParams(init.body).get('grant_type') === 'refresh_token') {
      if (++refreshCount === 1) { announce(); await blocked; return ok({ message: 'invalid refresh token ' + REFRESH }, 401); }
    }
    return original(url, init);
  } };
  const old = new TwitchSessionApi(f.store, options), replacement = new TwitchSessionApi(f.store, options);
  const stalled = old.fetch(f.request('validate'));
  await started;
  f.advance(20001);
  const recovered = await replacement.fetch(f.request('validate'));
  assert.equal(recovered.status, 200);
  release();
  const late = await stalled;
  assert.equal(late.status, 200);
  assert.equal(late.headers.getSetCookie().some(c => c.includes('Max-Age=0')), false);
  const session = [...f.store.rows.values()].find(r => r.data.kind === 'twitch-session').data;
  assert.equal(session.tokenVersion, 1); assert.equal(session.revoked, false);
  assert.equal((await (await f.call('status')).json()).connected, true);
  assert.equal(refreshCount, 2);
});

test('a stale refresh owner returns retryable failure without clearing cookies while a replacement owns the lease', async () => {
  const f = fixture(); await f.login(); f.setExpired(true);
  let releaseOld, releaseNew, announceOld, announceNew, count = 0;
  const oldStarted = new Promise(resolve => { announceOld = resolve; });
  const newStarted = new Promise(resolve => { announceNew = resolve; });
  const oldBlocked = new Promise(resolve => { releaseOld = resolve; });
  const newBlocked = new Promise(resolve => { releaseNew = resolve; });
  const original = f.options.fetchImpl;
  const options = { ...f.options, fetchImpl: async (url, init) => {
    if (url.endsWith('/oauth2/token') && new URLSearchParams(init.body).get('grant_type') === 'refresh_token') {
      if (++count === 1) { announceOld(); await oldBlocked; return ok({ message: REFRESH }, 401); }
      announceNew(); await newBlocked;
    }
    return original(url, init);
  } };
  const stalled = new TwitchSessionApi(f.store, options).fetch(f.request('validate'));
  await oldStarted; f.advance(20001);
  const replacing = new TwitchSessionApi(f.store, options).fetch(f.request('validate'));
  await newStarted; releaseOld();
  const staleResponse = await stalled;
  assert.equal(staleResponse.status, 503);
  assert.equal(staleResponse.headers.getSetCookie().some(c => c.includes('Max-Age=0')), false);
  releaseNew(); assert.equal((await replacing).status, 200);
  assert.equal((await (await f.call('status')).json()).connected, true);
});

test('invalid identity during restoration invalidates the current vault instead of only clearing its cookie', async () => {
  const f = fixture(); await f.login(); const oldCookie = f.jar.get('fv_twitch_session');
  f.setWrongScope(true);
  assert.equal((await f.call('validate')).status, 401);
  f.setWrongScope(false);
  assert.equal((await f.api.fetch(f.request('validate', { cookie: 'fv_twitch_session=' + oldCookie }))).status, 401);
  assert.equal([...f.store.rows.values()].some(r => r.data.kind === 'twitch-session' && r.data.sealed), false);
});

test('a successful upstream response cannot report connected after concurrent Disconnect', async () => {
  const f = fixture(); await f.login();
  let release, announce;
  const started = new Promise(resolve => { announce = resolve; });
  const blocked = new Promise(resolve => { release = resolve; });
  const original = f.options.fetchImpl;
  const delayed = new TwitchSessionApi(f.store, { ...f.options, fetchImpl: async (url, init) => {
    if (url.endsWith('/validate')) { announce(); await blocked; }
    return original(url, init);
  } });
  const checking = delayed.fetch(f.request('status'));
  await started;
  assert.equal((await f.call('disconnect', { method: 'POST' })).status, 200);
  release();
  const response = await checking;
  assert.equal(response.status, 401);
  assert.notEqual((await response.json()).connected, true);
});

test('operational diagnostics distinguish failures using only fixed endpoints, enums and HTTP statuses', async () => {
  for (const mode of ['network', 'timeout', 'http', 'token-json', 'validate-json', 'identity']) {
    const f = fixture(), original = f.options.fetchImpl;
    if (mode === 'identity') f.setWrongScope(true);
    const api = new TwitchSessionApi(f.store, { ...f.options, fetchImpl: async (url, init) => {
      if (url.endsWith('/oauth2/token')) {
        if (mode === 'network' || mode === 'timeout') {
          const error = new Error(ACCESS + ENV.TWITCH_CLIENT_SECRET);
          error.name = mode === 'timeout' ? 'TimeoutError' : REFRESH;
          throw error;
        }
        if (mode === 'http') return new Response(ACCESS + ENV.TWITCH_CLIENT_SECRET, { status: 503, headers: { 'Content-Type': 'text/html; private=' + REFRESH } });
        if (mode === 'token-json') return new Response(ACCESS + ENV.TWITCH_CLIENT_SECRET, { status: 200, headers: { 'Content-Type': 'application/json; private=' + REFRESH } });
      }
      if (mode === 'validate-json' && url.endsWith('/validate')) return new Response(ACCESS, { status: 200, headers: { 'Content-Type': 'text/html; private=' + REFRESH } });
      return original(url, init);
    } });
    const start = await f.call('start', { method: 'POST' });
    const state = new URL((await start.json()).authorizationUrl).searchParams.get('state');
    const response = await api.fetch(f.request('exchange', { method: 'POST', body: { state, code: 'temporary-code' } }));
    assert.equal(response.status, mode === 'identity' ? 401 : 503);
    assert.equal(f.diagnostics.length > 0, true);
    for (const entry of f.diagnostics) {
      assert.deepEqual(Object.keys(entry).filter(key => !['stage', 'hostname', 'path', 'httpStatus', 'exception', 'contentType', 'failure'].includes(key)), []);
      assert.equal(entry.hostname, 'id.twitch.tv');
      assert.equal(['/oauth2/token', '/oauth2/validate'].includes(entry.path), true);
      if (entry.contentType) assert.equal(['json', 'html', 'text', 'other', 'missing'].includes(entry.contentType), true);
    }
    const serialized = JSON.stringify(f.diagnostics) + await response.text();
    for (const secret of [ACCESS, REFRESH, NEXT_ACCESS, NEXT_REFRESH, ENV.TWITCH_CLIENT_SECRET, ENV.TWITCH_CLIENT_ID, ENV.TWITCH_TOKEN_KEY, state, 'temporary-code', f.jar.get('fv_twitch_pending')]) assert.equal(serialized.includes(secret), false);
    const last = f.diagnostics.at(-1);
    assert.equal(last.stage, ['validate-json', 'identity'].includes(mode) ? 'exchange-validate' : 'exchange-token');
    if (mode === 'network') assert.equal(last.exception, 'OtherError');
    if (mode === 'timeout') assert.equal(last.exception, 'TimeoutError');
    if (mode === 'http') { assert.equal(last.httpStatus, 503); assert.equal(last.contentType, 'html'); }
    if (mode.endsWith('-json')) { assert.equal(last.httpStatus, 200); assert.equal(last.failure, 'json_invalid'); assert.equal(last.exception, 'SyntaxError'); }
    if (mode === 'identity') assert.equal(last.failure, 'identity_rejected');
  }
});

test('diagnostic logger failures cannot prevent successful authorization', async () => {
  const f = fixture();
  const api = new TwitchSessionApi(f.store, { ...f.options, diagnostic: () => { throw new Error('logger unavailable'); } });
  const start = await f.call('start', { method: 'POST' });
  const state = new URL((await start.json()).authorizationUrl).searchParams.get('state');
  const response = await api.fetch(f.request('exchange', { method: 'POST', body: { state, code: 'temporary-code' } }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).connected, true);
});
