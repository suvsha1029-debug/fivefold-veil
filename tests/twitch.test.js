import test from 'node:test';
import assert from 'node:assert/strict';
import { TwitchChat } from '../public/twitch.js';

class MockSocket {
  static sockets = [];
  constructor(url) { this.url = url; this.closed = false; MockSocket.sockets.push(this); }
  async receive(value) { await this.onmessage?.({ data: JSON.stringify(value) }); }
  close() { if (this.closed) return; this.closed = true; this.onclose?.(); }
}
const welcome = (id = 'session-one') => ({ metadata: { message_type: 'session_welcome' }, payload: { session: { id, keepalive_timeout_seconds: 30 } } });
const notification = (messageId, broadcaster = '123') => ({ metadata: { message_type: 'notification', message_id: messageId }, payload: { subscription: { type: 'channel.chat.message' }, event: { broadcaster_user_id: broadcaster, chatter_user_id: '456', chatter_user_name: '<Researcher>', message_id: messageId, message: { text: '!test blue circle 2' } } } });

function fixture({ scope = true, client = 'public-client', subscribeOk = true } = {}) {
  MockSocket.sockets = [];
  const requests = [], statuses = [], messages = [];
  const chat = new TwitchChat({
    onStatus: value => statuses.push(value), onMessage: value => messages.push(value), WebSocketImpl: MockSocket,
    fetchImpl: async (url, init) => {
      requests.push({ url, init });
      if (url.includes('/validate')) return { ok: true, json: async () => ({ user_id: '123', login: 'ourchannel', client_id: client, scopes: scope ? ['user:read:chat'] : [] }) };
      return { ok: subscribeOk, status: subscribeOk ? 202 : 403 };
    },
  });
  return { chat, requests, statuses, messages };
}

test('uses broadcaster identity, read-only chat permission, and deduplicates deliveries', async () => {
  const f = fixture();
  try {
    await f.chat.connect('test-token', 'public-client');
    const socket = MockSocket.sockets[0];
    await socket.receive(welcome());
    assert.equal(f.statuses.at(-1).state, 'connected');
    const subscription = JSON.parse(f.requests[1].init.body);
    assert.deepEqual(subscription.condition, { broadcaster_user_id: '123', user_id: '123' });
    assert.equal(subscription.transport.session_id, 'session-one');
    await socket.receive(notification('message-one'));
    await socket.receive(notification('message-one'));
    await socket.receive(notification('message-two', 'another-channel'));
    assert.equal(f.messages.length, 1);
    assert.equal(f.messages[0].name, '<Researcher>');
  } finally { f.chat.disconnect(false); }
});

test('rejects tokens for a different app or missing chat permission', async () => {
  for (const config of [{ scope: false }, { client: 'wrong-client' }]) {
    const f = fixture(config);
    await f.chat.connect('test-token', 'public-client');
    assert.equal(f.statuses.at(-1).state, 'error');
    assert.equal(MockSocket.sockets.length, 0);
    f.chat.disconnect(false);
  }
});

test('reconnect handoff retains the subscription and rejects unexpected hosts', async () => {
  const f = fixture();
  try {
    await f.chat.connect('test-token', 'public-client');
    const first = MockSocket.sockets[0];
    await first.receive(welcome());
    await first.receive({ metadata: { message_type: 'session_reconnect' }, payload: { session: { reconnect_url: 'wss://eventsub.wss.twitch.tv/ws?reconnect=test' } } });
    const replacement = MockSocket.sockets[1];
    await replacement.receive(welcome('session-two'));
    assert.equal(first.closed, true);
    assert.equal(f.requests.filter(r => r.url.includes('/subscriptions')).length, 1);
    await replacement.receive({ metadata: { message_type: 'session_reconnect' }, payload: { session: { reconnect_url: 'wss://unexpected.example/ws' } } });
    assert.equal(f.statuses.at(-1).state, 'error');
    assert.equal(MockSocket.sockets.length, 2);
  } finally { f.chat.disconnect(false); }
});

test('subscription failure and revoked permission close the connection', async () => {
  const f = fixture({ subscribeOk: false });
  await f.chat.connect('test-token', 'public-client');
  await MockSocket.sockets[0].receive(welcome());
  assert.equal(f.statuses.at(-1).state, 'error');
  assert.equal(MockSocket.sockets[0].closed, true);
  f.chat.disconnect(false);
  const g = fixture();
  await g.chat.connect('test-token', 'public-client');
  await MockSocket.sockets[0].receive(welcome());
  await MockSocket.sockets[0].receive({ metadata: { message_type: 'revocation' }, payload: {} });
  assert.equal(g.statuses.at(-1).state, 'error');
  assert.equal(MockSocket.sockets[0].closed, true);
  g.chat.disconnect(false);
});

