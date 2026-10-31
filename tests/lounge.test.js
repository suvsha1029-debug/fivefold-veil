import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomApi, MemoryRoomStore } from '../server/rooms.js';
import { DOMAINS } from '../public/domains.js';

async function fixture() {
  let now = 1000;
  let sequence = 0;
  const store = new MemoryRoomStore();
  const api = new RoomApi(store, {now: () => now, seed: () => 'lounge-test'});
  const call = async (path, body, token) => {
    const response = await api.fetch(new Request('https://test.local/api/rooms'+path, {
      method: body ? 'POST' : 'GET',
      headers: {
        ...(body ? {'Content-Type':'application/json'} : {}),
        ...(token ? {Authorization:'Bearer '+token} : {}),
      },
      body: body ? JSON.stringify({requestId:'lounge-request-'+(++sequence), ...body}) : undefined,
    }));
    return {status:response.status, ...await response.json()};
  };
  const host = await call('', {title:'Lounge test'});
  const base = '/'+host.state.code;
  const a = await call(base+'/join', {name:'North', team:'heart'});
  const b = await call(base+'/join', {name:'South', team:'crown'});
  return {
    store, host, a, b, base, call,
    advance: (ms = 1500) => now += ms,
    act: (body, who = a) => call(base+'/lounge', body, who?.token),
    state: () => call(base),
  };
}

test('existing rooms expose six empty public lounges without changing the puzzle or exposing credentials', async () => {
  const h = await fixture();
  const original = await h.state();
  assert.equal(original.lounge.enabled, true);
  assert.deepEqual(Object.keys(original.lounge.channels), DOMAINS.map(domain => domain.id));
  assert.ok(Object.values(original.lounge.channels).every(messages => messages.length === 0));

  const sent = await h.act({type:'send', domain:'lunar', text:'A lunar idea'});
  assert.equal(sent.status, 200);
  assert.deepEqual(sent.state.game, original.game);
  assert.equal(sent.state.me.locked, false);
  assert.equal(sent.state.activity.length, original.activity.length);
  const state = await h.state();
  const [message] = state.lounge.channels.lunar;
  assert.equal(message.memberId, h.a.state.me.id);
  assert.equal(message.name, 'North');
  assert.equal(message.team, 'heart');
  assert.equal(message.text, 'A lunar idea');
  assert.equal(state.lounge.channels.taiga.length, 0);
  const json = JSON.stringify(state.lounge);
  assert.ok(!json.includes(h.a.token));
  assert.ok(!json.includes('lastSent'));
});

test('lounge validation keeps messages plain text and bounds every domain and sender', async () => {
  const h = await fixture();
  for (const text of ['', '  ', 'x'.repeat(241), null, {}]) {
    assert.equal((await h.act({type:'send', domain:'taiga', text})).status, 400);
  }
  assert.equal((await h.act({type:'send', domain:'__proto__', text:'Invalid'})).status, 400);
  const literal = '<img src=x onerror=alert(1)>';
  const sent = await h.act({type:'send', domain:'taiga', text:' \u0000\u200b'+literal+' '});
  assert.equal(sent.status, 200);
  assert.equal(sent.state.lounge.channels.taiga[0].text, literal);
  assert.equal((await h.act({type:'send', domain:'fire', text:'Second domain'})).status, 429);
  h.advance(1499);
  assert.equal((await h.act({type:'send', domain:'fire', text:'Too soon'})).status, 429);
  h.advance(1);
  assert.equal((await h.act({type:'send', domain:'fire', text:'Ready'})).status, 200);
  for (let i = 0; i < 30; i++) {
    h.advance();
    assert.equal((await h.act({type:'send', domain:'taiga', text:'Message '+i})).status, 200);
  }
  const state = await h.state();
  assert.equal(state.lounge.channels.taiga.length, 24);
  assert.equal(state.lounge.channels.taiga[0].text, 'Message 6');
  assert.equal(state.lounge.channels.fire[0].text, 'Ready');
});

test('only message authors and the host can moderate, and spectators cannot write', async () => {
  const h = await fixture();
  assert.equal((await h.act({type:'send', domain:'lunar', text:'Anonymous'}, null)).status, 401);
  const own = await h.act({type:'send', domain:'lunar', text:'My message'});
  const id = own.result.id;
  assert.equal((await h.act({type:'remove', domain:'lunar', id}, h.b)).status, 403);
  assert.equal((await h.act({type:'clear', domain:'lunar'}, h.b)).status, 403);
  assert.equal((await h.act({type:'enable', enabled:false}, h.a)).status, 403);
  assert.equal((await h.act({type:'remove', domain:'lunar', id}, h.a)).status, 200);
  assert.equal((await h.act({type:'remove', domain:'lunar', id}, h.host)).status, 404);

  const hostMessage = await h.act({type:'send', domain:'taiga', text:'Welcome everyone'}, h.host);
  assert.deepEqual(hostMessage.state.lounge.channels.taiga[0], {
    id:hostMessage.result.id, memberId:'host', name:'Host', avatar:'✧', team:null,
    text:'Welcome everyone', at:1000,
  });
  assert.equal((await h.act({type:'send', domain:'taiga', text:'Too fast'}, h.host)).status, 429);
  assert.equal((await h.act({type:'enable', enabled:'false'}, h.host)).status, 400);
  assert.equal((await h.act({type:'enable', enabled:false}, h.host)).status, 200);
  h.advance();
  assert.equal((await h.act({type:'send', domain:'taiga', text:'Still paused'}, h.host)).status, 409);
  assert.equal((await h.act({type:'send', domain:'taiga', text:'Still paused'}, h.b)).status, 409);
  assert.equal((await h.state()).lounge.channels.taiga.length, 1);
  assert.equal((await h.act({type:'clear', domain:'taiga'}, h.host)).status, 200);
  assert.equal((await h.act({type:'enable', enabled:true}, h.host)).status, 200);
  const after = await h.act({type:'send', domain:'taiga', text:'Open again'}, h.b);
  assert.equal(after.status, 200);
  assert.equal((await h.act({type:'remove', domain:'taiga', id:after.result.id}, h.host)).status, 200);
});

test('concurrent delivery retries preserve one message and new rounds preserve lounge conversations', async () => {
  const h = await fixture();
  const body = {type:'send', domain:'star-sea', text:'One shared message', requestId:'same-lounge-request'};
  const results = await Promise.all([h.act(body), h.act(body)]);
  assert.ok(results.every(response => response.status === 200));
  assert.equal(results[0].result.id, results[1].result.id);
  assert.equal((await h.state()).lounge.channels['star-sea'].length, 1);
  await h.call(h.base+'/control', {type:'reset'}, h.host.token);
  assert.equal((await h.state()).lounge.channels['star-sea'].length, 1);
  h.advance(24*60*60*1000+1);
  assert.equal((await h.state()).status, 404);
  assert.equal((await h.act({type:'send', domain:'star-sea', text:'Expired'})).status, 404);
});
