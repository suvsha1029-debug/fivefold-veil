const encoder = new TextEncoder();
const COOKIE_PATH = '/api/twitch';
const PENDING_COOKIE = 'fv_twitch_pending';
const SESSION_COOKIE = 'fv_twitch_session';
const PENDING_TTL = 10 * 60 * 1000;
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
const TYPES = new Set(['channel.chat.message', 'channel.chat.message_delete', 'channel.chat.clear_user_messages', 'channel.chat.clear']);
const DIAGNOSTIC_STAGES = Object.freeze({
  'exchange-token': ['id.twitch.tv', '/oauth2/token'],
  'exchange-validate': ['id.twitch.tv', '/oauth2/validate'],
  'restore-validate': ['id.twitch.tv', '/oauth2/validate'],
  'refresh-token': ['id.twitch.tv', '/oauth2/token'],
  'refresh-validate': ['id.twitch.tv', '/oauth2/validate'],
  channel: ['api.twitch.tv', '/helix/channels'],
  subscribe: ['api.twitch.tv', '/helix/eventsub/subscriptions'],
  revoke: ['id.twitch.tv', '/oauth2/revoke'],
});
const DIAGNOSTIC_EXCEPTIONS = new Set(['AbortError', 'TimeoutError', 'TypeError', 'SyntaxError', 'Error', 'IdentityRejected', 'TokenRejected']);
const random = () => [...crypto.getRandomValues(new Uint8Array(32))].map(x => x.toString(16).padStart(2, '0')).join('');
const digest = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))].map(x => x.toString(16).padStart(2, '0')).join('');
const sameDigest = (a, b) => { let difference = a.length ^ b.length; for (let i = 0; i < 64; i++) difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return difference === 0; };
const keyFor = async (kind, value) => `TWITCH:${kind}:${await digest(value)}`;
const fault = (status, code, message) => Object.assign(new Error(message), { status, code });
const denied = () => fault(401, 'reauthorization_required', 'Twitch sign-in needs to be renewed. Connect again to continue.');
const unavailable = () => fault(503, 'temporarily_unavailable', 'Twitch could not be reached. Retry the connection in a moment.');
const encode64 = value => btoa(String.fromCharCode(...value));
const decode64 = value => Uint8Array.from(atob(value), x => x.charCodeAt(0));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// OAuth secrets live only in the server environment and encrypted vault rows.
// The generic store is shared with rooms, but reserved keys cannot be room codes.
export class TwitchSessionApi {
  constructor(store, { env = {}, fetchImpl = globalThis.fetch.bind(globalThis), now = Date.now, origin, diagnostic = entry => console.info('Twitch OAuth diagnostic', entry) } = {}) {
    Object.assign(this, { store, env, fetchImpl, now, diagnostic });
    this.clientId = env.TWITCH_CLIENT_ID || 'rkyl33gvhlyqeqwrqcj6ubzj1ruiat';
    try {
      const parsed = new URL(origin || env.TWITCH_APP_ORIGIN || '');
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
      if (parsed.username || parsed.password || parsed.search || parsed.hash || !['', '/'].includes(parsed.pathname) || (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:'))) throw new Error();
      this.origin = parsed.origin;
      this.secure = parsed.protocol === 'https:';
    } catch { this.origin = null; }
    this.configured = !!(this.origin && /^[a-zA-Z0-9]{10,64}$/.test(this.clientId) && typeof env.TWITCH_CLIENT_SECRET === 'string' && env.TWITCH_CLIENT_SECRET.trim() && /^[a-fA-F0-9]{64}$/.test(env.TWITCH_TOKEN_KEY || ''));
  }

  response(body, status = 200, cookies = []) {
    const headers = new Headers({ 'Cache-Control': 'no-store, private', Pragma: 'no-cache', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin', Vary: 'Cookie' });
    for (const cookie of cookies) headers.append('Set-Cookie', cookie);
    return Response.json(body, { status, headers });
  }

  cookie(name, value, age) {
    return `${name}=${value}; Path=${COOKIE_PATH}; HttpOnly; SameSite=Lax; Max-Age=${age}${this.secure ? '; Secure' : ''}`;
  }

  readCookie(request, name) {
    const entries = (request.headers.get('cookie') || '').split(';').map(x => x.trim()).filter(x => x.startsWith(name + '='));
    if (entries.length !== 1) return null;
    const value = entries[0].slice(name.length + 1);
    return /^[a-f0-9]{64}$/.test(value) ? value : null;
  }

  async body(request) {
    if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') || '')) throw fault(415, 'invalid_request', 'Send a JSON request.');
    if (Number(request.headers.get('content-length')) > 4096) throw fault(413, 'invalid_request', 'The connection request is too large.');
    const reader = request.body?.getReader();
    if (!reader) return {};
    let size = 0, chunks = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4096) { await reader.cancel(); throw fault(413, 'invalid_request', 'The connection request is too large.'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const part of chunks) { bytes.set(part, offset); offset += part.length; }
    try {
      const value = JSON.parse(new TextDecoder().decode(bytes));
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
      return value;
    } catch { throw fault(400, 'invalid_request', 'The connection request is invalid.'); }
  }

  async fetch(request) {
    let action;
    try {
      const url = new URL(request.url);
      const route = url.pathname.match(/^\/api\/twitch\/(status|start|exchange|validate|channel|subscribe|disconnect)\/?$/);
      if (!route) return this.response({ error: 'Unknown connection action.' }, 404);
      action = route[1];
      const methods = { status: 'GET', start: 'POST', exchange: 'POST', validate: 'GET', channel: 'GET', subscribe: 'POST', disconnect: 'POST' };
      if (!methods[action]) return this.response({ error: 'Unknown connection action.' }, 404);
      if (request.method !== methods[action]) return this.response({ error: 'This request method is not supported.' }, 405);
      if (this.origin && url.origin !== this.origin) throw fault(403, 'origin_rejected', 'Open the connection from this application.');
      if (request.headers.get('sec-fetch-site') === 'cross-site' || (request.headers.has('origin') && request.headers.get('origin') !== this.origin)) throw fault(403, 'origin_rejected', 'Open the connection from this application.');
      if (request.method === 'POST' && request.headers.get('origin') !== this.origin) throw fault(403, 'origin_rejected', 'Open the connection from this application.');
      if (action === 'status' && !this.configured) return this.response({ configured: false, connected: false, clientId: this.clientId });
      if (!this.configured) throw fault(503, 'not_configured', 'Persistent Twitch connection is not configured yet. Browser room controls are available.');
      const body = request.method === 'POST' ? await this.body(request) : {};
      if (action === 'start') return await this.start(request);
      if (action === 'exchange') return await this.exchange(request, body);
      if (action === 'disconnect') return await this.disconnect(request);
      let session;
      try { session = await this.session(request); }
      catch (error) {
        if (action === 'status' && error.status === 401) return this.response({ configured: true, connected: false, clientId: this.clientId }, 200, [this.cookie(SESSION_COOKIE, '', 0)]);
        throw error;
      }
      if (action === 'status' || action === 'validate') {
        const result = await this.authorized(session, tokens => this.upstream('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: `OAuth ${tokens.access}` } }, 'restore-validate'));
        let identity;
        try { identity = await this.identity(result, session.row.data.identity.user_id); }
        catch (error) {
          if (error.status === 401 && !await this.invalidate(session.storageKey, data => data.tokenVersion === session.row.data.tokenVersion)) throw unavailable();
          throw error;
        }
        await this.assertCurrent(session);
        return this.response(action === 'status' ? { configured: true, connected: true, clientId: this.clientId, channel: identity.login, expiresAt: session.row.data.expiresAt } : identity);
      }
      if (action === 'channel') {
        const result = await this.authorized(session, tokens => this.upstream(`https://api.twitch.tv/helix/channels?broadcaster_id=${encodeURIComponent(session.row.data.identity.user_id)}`, { headers: { Authorization: `Bearer ${tokens.access}`, 'Client-Id': this.clientId } }, 'channel'));
        if (!result.ok) throw unavailable();
        const data = await result.json();
        const channel = data?.data?.find(x => x.broadcaster_id === session.row.data.identity.user_id);
        return this.response({ data: channel ? [{ broadcaster_id: channel.broadcaster_id, game_name: String(channel.game_name || '').slice(0, 200), title: String(channel.title || '').slice(0, 200) }] : [] });
      }
      if (!TYPES.has(body.type) || typeof body.sessionId !== 'string' || !/^[a-zA-Z0-9_-]{8,256}$/.test(body.sessionId) || Object.keys(body).some(k => !['type', 'sessionId'].includes(k))) throw fault(400, 'invalid_request', 'Choose a supported chat subscription.');
      const result = await this.authorized(session, tokens => this.upstream('https://api.twitch.tv/helix/eventsub/subscriptions', {
        method: 'POST', headers: { Authorization: `Bearer ${tokens.access}`, 'Client-Id': this.clientId, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: body.type, version: '1', condition: { broadcaster_user_id: session.row.data.identity.user_id, user_id: session.row.data.identity.user_id }, transport: { method: 'websocket', session_id: body.sessionId } }),
      }, 'subscribe'));
      if (!result.ok) throw fault(result.status === 403 ? 403 : 503, 'subscription_failed', 'Twitch could not start the chat subscription. Reconnect with the broadcaster account.');
      return this.response({ subscribed: true }, 202);
    } catch (error) {
      // Never send or log upstream bodies, OAuth codes, cookies or credentials.
      const status = error.status || 503;
      return this.response({ error: error.status ? error.message : 'The connection could not be restored. Please retry.', code: error.code || 'temporarily_unavailable' }, status, status === 401 ? [this.cookie(SESSION_COOKIE, '', 0)] : []);
    }
  }

  report(stage, httpStatus, error, contentType, failure) {
    // Build records solely from constants, numeric status and an error-name enum.
    // Never log URLs, query strings, bodies, headers, identifiers or raw errors.
    const endpoint = Object.hasOwn(DIAGNOSTIC_STAGES, stage) && DIAGNOSTIC_STAGES[stage];
    if (!endpoint) return;
    const entry = { stage, hostname: endpoint[0], path: endpoint[1] };
    if (Number.isInteger(httpStatus) && httpStatus >= 0 && httpStatus <= 599) entry.httpStatus = httpStatus;
    if (error) entry.exception = DIAGNOSTIC_EXCEPTIONS.has(error.name) ? error.name : 'OtherError';
    if (contentType !== undefined) entry.contentType = !contentType ? 'missing' : /^application\/json(?:\s*;|$)/i.test(contentType) ? 'json' : /^text\/html(?:\s*;|$)/i.test(contentType) ? 'html' : /^text\/plain(?:\s*;|$)/i.test(contentType) ? 'text' : 'other';
    if (['json_invalid', 'token_rejected', 'identity_rejected'].includes(failure)) entry.failure = failure;
    try { this.diagnostic(entry); } catch {}
  }

  async upstream(url, init = {}, stage) {
    try {
      const response = await this.fetchImpl(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(6000) });
      this.report(stage, response.status, undefined, response.headers.get('content-type'));
      return response;
    } catch (error) { this.report(stage, undefined, error); throw unavailable(); }
  }

  async cryptoKey() {
    if (!this.key) this.key = crypto.subtle.importKey('raw', Uint8Array.from(this.env.TWITCH_TOKEN_KEY.match(/../g), x => parseInt(x, 16)), 'AES-GCM', false, ['encrypt', 'decrypt']);
    return this.key;
  }

  async seal(tokens, storageKey) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(storageKey) }, await this.cryptoKey(), encoder.encode(JSON.stringify(tokens)));
    return { iv: encode64(iv), ciphertext: encode64(new Uint8Array(ciphertext)) };
  }

  async unseal(row, storageKey) {
    try {
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode64(row.sealed.iv), additionalData: encoder.encode(storageKey) }, await this.cryptoKey(), decode64(row.sealed.ciphertext));
      return JSON.parse(new TextDecoder().decode(plain));
    } catch { throw denied(); }
  }

  async start(request) {
    await this.store.cleanup(this.now());
    const handle = random(), state = random(), storageKey = await keyFor('pending', handle);
    await this.store.insert(storageKey, { kind: 'twitch-pending', stateHash: await digest(state), expiresAt: this.now() + PENDING_TTL, consumed: false });
    const params = new URLSearchParams({ client_id: this.clientId, redirect_uri: this.origin + '/teams', response_type: 'code', scope: 'user:read:chat', state });
    return this.response({ authorizationUrl: 'https://id.twitch.tv/oauth2/authorize?' + params }, 200, [this.cookie(PENDING_COOKIE, handle, PENDING_TTL / 1000)]);
  }

  async token(parameters) {
    const stage = parameters.grant_type === 'refresh_token' ? 'refresh-token' : 'exchange-token';
    const response = await this.upstream('https://id.twitch.tv/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: this.clientId, client_secret: this.env.TWITCH_CLIENT_SECRET, ...parameters }).toString() }, stage);
    if (!response.ok) {
      if ([400, 401, 403].includes(response.status)) throw denied();
      throw unavailable();
    }
    let data; try { data = await response.json(); } catch (error) { this.report(stage, response.status, error, response.headers.get('content-type'), 'json_invalid'); throw unavailable(); }
    if (typeof data.access_token !== 'string' || !data.access_token || data.access_token.length > 4096 || typeof data.refresh_token !== 'string' || !data.refresh_token || data.refresh_token.length > 4096) { this.report(stage, response.status, { name: 'TokenRejected' }, response.headers.get('content-type'), 'token_rejected'); throw denied(); }
    return { access: data.access_token, refresh: data.refresh_token };
  }

  async identity(response, expectedUser, stage = 'restore-validate') {
    if (!response.ok) throw response.status === 401 || response.status === 403 ? denied() : unavailable();
    let data; try { data = await response.json(); } catch (error) { this.report(stage, response.status, error, response.headers.get('content-type'), 'json_invalid'); throw unavailable(); }
    if (data.client_id !== this.clientId || typeof data.user_id !== 'string' || !/^\d{1,30}$/.test(data.user_id) || typeof data.login !== 'string' || !/^[a-zA-Z0-9_]{1,30}$/.test(data.login) || !Array.isArray(data.scopes) || !data.scopes.includes('user:read:chat') || (expectedUser && data.user_id !== expectedUser)) { this.report(stage, response.status, { name: 'IdentityRejected' }, response.headers.get('content-type'), 'identity_rejected'); throw denied(); }
    return { client_id: this.clientId, user_id: data.user_id, login: data.login, scopes: ['user:read:chat'] };
  }

  async exchange(request, body) {
    const handle = this.readCookie(request, PENDING_COOKIE);
    if (!handle || !/^[a-f0-9]{64}$/.test(body.state || '') || typeof body.code !== 'string' || !body.code || body.code.length > 2048 || /[\p{Cc}\p{Cf}]/u.test(body.code)) throw fault(400, 'invalid_oauth_state', 'This Twitch sign-in request expired or could not be verified. Connect again.');
    const pendingKey = await keyFor('pending', handle), pending = await this.store.get(pendingKey);
    if (!pending || pending.data.kind !== 'twitch-pending' || pending.data.consumed || pending.data.cancelled || pending.data.expiresAt <= this.now() || !sameDigest(pending.data.stateHash, await digest(body.state))) throw fault(400, 'invalid_oauth_state', 'This Twitch sign-in request expired or could not be verified. Connect again.');
    const sessionHandle = random(), storageKey = await keyFor('session', sessionHandle), expiresAt = this.now() + SESSION_TTL, exchangeOwner = random();
    if (!await this.store.save(pendingKey, { ...pending.data, consumed: true, sessionKey: storageKey, exchangeOwner }, pending.version)) throw fault(400, 'invalid_oauth_state', 'This Twitch sign-in request has already been used. Connect again.');
    try {
      // A reserved row lets Disconnect cancel a sign-in before Twitch responds.
      if (!await this.store.insert(storageKey, { kind: 'twitch-session', sealed: null, revoked: false, exchangeOwner, expiresAt })) throw denied();
      const tokens = await this.token({ code: body.code, grant_type: 'authorization_code', redirect_uri: this.origin + '/teams' });
      const identity = await this.identity(await this.upstream('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: `OAuth ${tokens.access}` } }, 'exchange-validate'), undefined, 'exchange-validate');
      const latest = await this.store.get(storageKey), pendingAfter = await this.store.get(pendingKey);
      if (!latest || latest.data.revoked || latest.data.exchangeOwner !== exchangeOwner || pendingAfter?.data.cancelled || pendingAfter?.data.exchangeOwner !== exchangeOwner) throw denied();
      const completed = { kind: 'twitch-session', identity, sealed: await this.seal(tokens, storageKey), tokenVersion: 0, refreshLease: null, revoked: false, expiresAt };
      if (!await this.store.save(storageKey, completed, latest.version)) throw denied();
      const oldHandle = this.readCookie(request, SESSION_COOKIE);
      if (oldHandle) await this.invalidate(await keyFor('session', oldHandle));
      return this.response({ connected: true, clientId: this.clientId, channel: identity.login, expiresAt }, 200, [this.cookie(PENDING_COOKIE, '', 0), this.cookie(SESSION_COOKIE, sessionHandle, SESSION_TTL / 1000)]);
    } catch (error) {
      try { await this.invalidate(storageKey); } catch {}
      throw error;
    }
  }

  async session(request) {
    const handle = this.readCookie(request, SESSION_COOKIE);
    if (!handle) throw denied();
    const storageKey = await keyFor('session', handle), row = await this.store.get(storageKey);
    if (!this.active(row)) throw denied();
    return { storageKey, row };
  }

  active(row) { return row?.data.kind === 'twitch-session' && !row.data.revoked && row.data.expiresAt > this.now() && row.data.sealed; }

  async authorized(session, operation) {
    let result = await operation(await this.unseal(session.row.data, session.storageKey));
    if (result.status !== 401) { await this.assertCurrent(session); return result; }
    session.row = await this.refresh(session);
    result = await operation(await this.unseal(session.row.data, session.storageKey));
    if (result.status === 401) {
      if (!await this.invalidate(session.storageKey, data => data.tokenVersion === session.row.data.tokenVersion)) throw unavailable();
      throw denied();
    }
    await this.assertCurrent(session);
    return result;
  }

  async assertCurrent(session) {
    const latest = await this.store.get(session.storageKey);
    if (!this.active(latest)) throw denied();
    if (latest.data.tokenVersion !== session.row.data.tokenVersion) throw fault(503, 'session_changed', 'Twitch sign-in changed in another tab. Retry the connection in a moment.');
  }

  async refresh(session) {
    const owner = random();
    for (let attempt = 0; attempt < 100; attempt++) {
      const row = await this.store.get(session.storageKey);
      if (!this.active(row)) throw denied();
      if (row.data.tokenVersion !== session.row.data.tokenVersion) return row;
      if (row.data.refreshLease?.until > this.now()) { await sleep(150); continue; }
      const leased = { ...row.data, refreshLease: { owner, until: this.now() + 20000 } };
      if (!await this.store.save(session.storageKey, leased, row.version)) continue;
      try {
        const previous = await this.unseal(row.data, session.storageKey);
        const tokens = await this.token({ grant_type: 'refresh_token', refresh_token: previous.refresh });
        const identity = await this.identity(await this.upstream('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: `OAuth ${tokens.access}` } }, 'refresh-validate'), row.data.identity.user_id, 'refresh-validate');
        const latest = await this.store.get(session.storageKey);
        if (!this.active(latest)) throw denied();
        if (latest.data.tokenVersion !== row.data.tokenVersion) return latest;
        if (latest.data.refreshLease?.owner !== owner) throw unavailable();
        const next = { ...latest.data, identity, sealed: await this.seal(tokens, session.storageKey), tokenVersion: latest.data.tokenVersion + 1, refreshLease: null };
        if (!await this.store.save(session.storageKey, next, latest.version)) throw unavailable();
        return { data: next, version: latest.version + 1 };
      } catch (error) {
        const latest = await this.store.get(session.storageKey);
        if (!this.active(latest)) throw denied();
        if (latest.data.tokenVersion !== row.data.tokenVersion) return latest;
        if (latest.data.refreshLease?.owner !== owner) throw unavailable();
        if (error.status === 401) {
          const invalidated = await this.invalidate(session.storageKey, data => data.refreshLease?.owner === owner && data.tokenVersion === row.data.tokenVersion);
          if (!invalidated) {
            const changed = await this.store.get(session.storageKey);
            if (this.active(changed) && changed.data.tokenVersion !== row.data.tokenVersion) return changed;
            throw unavailable();
          }
        } else await this.store.save(session.storageKey, { ...latest.data, refreshLease: null }, latest.version);
        throw error;
      }
    }
    throw fault(503, 'refresh_busy', 'Twitch sign-in is being restored in another tab. Retry in a moment.');
  }

  async invalidate(storageKey, condition = null) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const row = await this.store.get(storageKey);
      if (condition && (!row || !condition(row.data))) return false;
      if (row?.data.revoked) return true;
      const revoked = { kind: 'twitch-session', revoked: true, sealed: null, expiresAt: this.now() + PENDING_TTL };
      if (!row) { if (await this.store.insert(storageKey, revoked)) return true; }
      else if (await this.store.save(storageKey, revoked, row.version)) return true;
    }
    throw unavailable();
  }

  async disconnect(request) {
    const pendingHandle = this.readCookie(request, PENDING_COOKIE);
    if (pendingHandle) {
      const pendingKey = await keyFor('pending', pendingHandle);
      for (let attempt = 0; attempt < 5; attempt++) {
        const pending = await this.store.get(pendingKey);
        if (!pending || pending.data.kind !== 'twitch-pending') break;
        if (!pending.data.cancelled && !await this.store.save(pendingKey, { ...pending.data, cancelled: true }, pending.version)) continue;
        if (/^TWITCH:session:[a-f0-9]{64}$/.test(pending.data.sessionKey || '')) await this.invalidate(pending.data.sessionKey);
        break;
      }
    }
    const handle = this.readCookie(request, SESSION_COOKIE);
    if (handle) {
      const storageKey = await keyFor('session', handle), row = await this.store.get(storageKey);
      let tokens;
      if (this.active(row)) { try { tokens = await this.unseal(row.data, storageKey); } catch {} }
      await this.invalidate(storageKey);
      if (tokens) {
        try { await this.upstream('https://id.twitch.tv/oauth2/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: this.clientId, token: tokens.access }).toString() }, 'revoke'); } catch {}
      }
    }
    return this.response({ disconnected: true }, 200, [this.cookie(SESSION_COOKIE, '', 0), this.cookie(PENDING_COOKIE, '', 0)]);
  }
}
