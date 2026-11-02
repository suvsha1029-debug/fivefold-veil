import test from 'node:test';
import assert from 'node:assert/strict';
import { TwitchSessionClient, consumeTwitchCode } from '../public/twitch-session-client.js';

function callback(href) {
  const replacements = [];
  return { location: { href }, history: { replaceState: (...args) => replacements.push(args) }, replacements };
}

test('consumes a code and state while removing OAuth values from the address bar', () => {
  const f = callback('https://fivefold.example/teams?room=ABCDEFG&view=host&code=one-use-code&state=expected-state&scope=user%3Aread%3Achat#council');
  assert.deepEqual(consumeTwitchCode(f.location, f.history), { code: 'one-use-code', state: 'expected-state' });
  assert.deepEqual(f.replacements, [[null, '', '/teams?room=ABCDEFG&view=host#council']]);
});

test('clears a cancelled callback before reporting cancellation', () => {
  const f = callback('https://fivefold.example/teams?room=ABCDEFG&error=access_denied&error_description=Private+details&state=old-state');
  assert.throws(() => consumeTwitchCode(f.location, f.history), /cancelled/);
  assert.deepEqual(f.replacements, [[null, '', '/teams?room=ABCDEFG']]);
});

test('strips an old implicit token instead of exposing it to the code flow', () => {
  const f = callback('https://fivefold.example/teams?room=ABCDEFG#access_token=do-not-keep&state=old-state&token_type=bearer');
  assert.throws(() => consumeTwitchCode(f.location, f.history), /older connection link/);
  assert.deepEqual(f.replacements, [[null, '', '/teams?room=ABCDEFG']]);
  assert.ok(!JSON.stringify(f.replacements).includes('do-not-keep'));
});

test('normal room navigation does not rewrite the browser address', () => {
  const f = callback('https://fivefold.example/teams?room=ABCDEFG&view=watch#council');
  assert.equal(consumeTwitchCode(f.location, f.history), null);
  assert.deepEqual(f.replacements, []);
});

test('requests only allowlisted same-origin endpoints with cookies and no bearer header', async () => {
  const requests = [];
  const client = new TwitchSessionClient(async (url, init) => {
    requests.push({ url, init });
    return Response.json({ connected: true });
  });
  await client.request('status');
  await client.request('exchange', { code: 'one-use-code', state: 'expected-state' });
  await assert.rejects(client.request('https://other.example/steal'), /Unknown Twitch/);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, '/api/twitch/status');
  assert.equal(requests[0].init.method, 'GET');
  assert.equal(requests[1].url, '/api/twitch/exchange');
  assert.equal(requests[1].init.method, 'POST');
  assert.deepEqual(JSON.parse(requests[1].init.body), { code: 'one-use-code', state: 'expected-state' });
  for (const { init } of requests) {
    assert.equal(init.credentials, 'same-origin');
    assert.equal(init.cache, 'no-store');
    assert.equal(init.referrerPolicy, 'no-referrer');
    assert.ok(init.signal instanceof AbortSignal);
    assert.equal(new Headers(init.headers).has('authorization'), false);
  }
});

test('allows the expected Twitch authorization-code address', async () => {
  const address = 'https://id.twitch.tv/oauth2/authorize?response_type=code&state=expected-state&client_id=public-client';
  const client = new TwitchSessionClient(async () => Response.json({ authorizationUrl: address }));
  assert.equal(await client.start(), address);
});

test('rejects authorization redirects to another host, protocol, route, or token flow', async () => {
  for (const address of [
    'https://id.twitch.tv.evil.example/oauth2/authorize?response_type=code',
    'http://id.twitch.tv/oauth2/authorize?response_type=code',
    'https://id.twitch.tv/other?response_type=code',
    'https://id.twitch.tv/oauth2/authorize?response_type=token',
  ]) {
    const client = new TwitchSessionClient(async () => Response.json({ authorizationUrl: address }));
    await assert.rejects(client.start(), /could not be verified/);
  }
});

test('network failures do not expose low-level request details', async () => {
  const client = new TwitchSessionClient(async () => { throw new Error('private transport details and fake-secret'); });
  await assert.rejects(client.request('status'), error => {
    assert.match(error.message, /Could not reach Twitch connection settings/);
    assert.ok(!error.message.includes('fake-secret'));
    assert.ok(!error.message.includes('private transport'));
    return true;
  });
});
