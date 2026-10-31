import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomApi, MemoryRoomStore } from '../server/rooms.js';
import { VeilGame } from '../public/engine.js';
import { recordDiscovery } from '../server/witness.js';

async function setup({twitch=false}={}){
  let time=100000,seq=0;const store=new MemoryRoomStore(),api=new RoomApi(store,{now:()=>time,seed:()=> 'witness-case'});
  const call=async(path='',body,token)=>{const r=await api.fetch(new Request('https://veil.test/api/rooms'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify({requestId:'witness-request-'+(++seq),...body}):undefined}));return {status:r.status,...await r.json()};};
  const created=await call('',{minimumTeams:1}),code=created.state.code,base='/'+code,host=created.token;
  const joined=await call(base+'/join',{name:'Researcher',team:'heart'}),guest=joined.token,id=twitch?'T-789':joined.state.me.id;
  const stranger=(await call(base+'/join',{name:'Other',team:'root'})).token;
  const command=text=>call(base+(twitch?'/twitch':'/command'),twitch?{text,userId:'789',name:'Chatter',channel:'host',messageId:'source-message',sentAt:time}:{text},twitch?host:guest);
  await call(base+'/control',{type:'start'},host);
  const seal=async eyeId=>{
    const row=await store.get(code),game=VeilGame.restore(row.data.game),s=game.suggest(eyeId),correct=game.eye(eyeId).options.find(o=>o.rule.id===game.eye(eyeId).rule.id).id;
    assert.ok(s);time+=32000;
    assert.equal((await command(`!test ${eyeId} ${s.color} ${s.shape} ${s.pulses}`)).status,200);time+=2000;
    await command(`!solve ${eyeId} ${correct}`);
    return call(base+'/control',{type:'seal',eyeId},host);
  };
  return {store,call,code,base,host,guest,stranger,id,command,seal,advance:n=>{time+=n;},now:()=>time};
}

test('useful evidence earns once per round; queued text is private until host approval',async()=>{
  const h=await setup(),sealed=await h.seal('heart');assert.equal(sealed.result.kind,'sealed');
  const discovery=sealed.state.witness.discoveries[0];assert.equal(discovery.steps.length,1);assert.ok(discovery.steps[0].eliminated.length);assert.equal(discovery.credits[0].memberId,h.id);
  let mine=(await h.call(h.base,undefined,h.guest)).witness.mine;assert.equal(mine.length,1);assert.equal(mine[0].status,'earned');
  assert.equal((await h.call(h.base+'/witness',{type:'submit',text:'Before enabled'},h.guest)).status,409);
  assert.equal((await h.call(h.base+'/witness',{type:'enable',enabled:true},h.guest)).status,403);
  await h.call(h.base+'/witness',{type:'enable',enabled:true},h.host);
  assert.equal((await h.call(h.base+'/witness',{type:'submit',text:'Unearned'},h.stranger)).status,409);
  const submitted=await h.call(h.base+'/witness',{type:'submit',text:'<img onerror=alert(1)> My discovery'},h.guest);assert.equal(submitted.status,200);
  const publicView=await h.call(h.base);assert.deepEqual(publicView.witness.queue,[]);assert.deepEqual(publicView.witness.mine,[]);assert.equal(publicView.witness.featured,null);assert.ok(!JSON.stringify(publicView).includes('My discovery'));
  const queue=(await h.call(h.base,undefined,h.host)).witness.queue;assert.equal(queue.length,1);
  assert.equal((await h.call(h.base+'/witness',{type:'approve',id:queue[0].id},h.stranger)).status,403);
  const approved=await h.call(h.base+'/witness',{type:'approve',id:queue[0].id},h.host);assert.equal(approved.state.witness.featured.text,submitted.state.witness.mine[0].text);
  assert.equal((await h.call(h.base+'/witness',{type:'submit',text:'Second'},h.guest)).status,409);
  await h.seal('crown');assert.equal((await h.call(h.base,undefined,h.guest)).witness.mine.length,1);
  await h.call(h.base+'/witness',{type:'withdraw'},h.guest);assert.equal((await h.call(h.base)).witness.featured,null);
});

test('replays are host-controlled and expire; reset clears awards and histories but preserves opt-in',async()=>{
  const h=await setup(),s=await h.seal('heart'),id=s.state.witness.discoveries[0].id;
  await h.call(h.base+'/witness',{type:'enable',enabled:true},h.host);
  assert.equal((await h.call(h.base+'/witness',{type:'replay',id},h.guest)).status,403);
  await h.call(h.base+'/witness',{type:'replay',id},h.host);assert.equal((await h.call(h.base)).witness.replay.id,id);
  h.advance(21000);assert.equal((await h.call(h.base)).witness.replay,null);
  await h.call(h.base+'/witness',{type:'submit',text:'Expires'},h.guest);h.advance(300001);
  assert.equal((await h.call(h.base,undefined,h.host)).witness.queue.length,0);
  const seat=(await h.call(h.base,undefined,h.guest)).witness.mine[0];assert.equal(seat.status,'expired');
  assert.equal((await h.call(h.base+'/witness',{type:'approve',id:seat.id},h.host)).status,409);
  const reset=await h.call(h.base+'/control',{type:'reset'},h.host);assert.equal(reset.state.witness.enabled,true);assert.deepEqual(reset.state.witness.discoveries,[]);assert.deepEqual((await h.call(h.base,undefined,h.guest)).witness.mine,[]);
});

test('Twitch spotlight deletion is private, removes featured text, and blocks out-of-order deleted submissions',async()=>{
  const h=await setup({twitch:true});await h.seal('heart');await h.call(h.base+'/witness',{type:'enable',enabled:true},h.host);
  await h.command('!spotlight Here is my reasoning');let queue=(await h.call(h.base,undefined,h.host)).witness.queue;assert.equal(queue.length,1);
  await h.call(h.base+'/witness',{type:'approve',id:queue[0].id},h.host);
  assert.equal((await h.call(h.base+'/witness-moderation',{type:'delete',messageId:'source-message'},h.guest)).status,403);
  await h.call(h.base+'/witness-moderation',{type:'delete',messageId:'source-message'},h.host);assert.equal((await h.call(h.base)).witness.featured,null);assert.equal((await h.call(h.base,undefined,h.host)).witness.queue.length,0);
  const other=await setup({twitch:true});await other.seal('heart');await other.call(other.base+'/witness',{type:'enable',enabled:true},other.host);
  await other.call(other.base+'/witness-moderation',{type:'delete',messageId:'source-message'},other.host);assert.equal((await other.command('!spotlight Already deleted')).status,409);
});

test('turning off cancels pending and featured messages; duplicate requests cannot award twice',async()=>{
  const h=await setup();await h.seal('heart');await h.call(h.base+'/witness',{type:'enable',enabled:true},h.host);
  const body={type:'submit',text:'Once only',requestId:'same-witness-request'};
  await Promise.all([h.call(h.base+'/witness',body,h.guest),h.call(h.base+'/witness',body,h.guest)]);
  assert.equal((await h.call(h.base,undefined,h.host)).witness.queue.length,1);
  await h.call(h.base+'/witness',{type:'enable',enabled:false},h.host);
  assert.equal((await h.call(h.base,undefined,h.host)).witness.queue.length,0);assert.equal((await h.call(h.base,undefined,h.guest)).witness.mine[0].text,'');
});

test('credit freezes at sealing: repeated non-discriminating tests and votes do not earn a seat; citations do',()=>{
  const game=new VeilGame({seed:'credit-proof'}),eye=game.eye('heart');
  const signal={color:'red',shape:'circle',pulses:1},accepted=eye.rule.accepts(signal);
  const removed=eye.options.filter(o=>o.rule.accepts(signal)!==accepted);
  const useful=removed.length?signal:game.suggest('heart'),pass=eye.rule.accepts(useful),contradicted=eye.options.find(o=>o.rule.accepts(useful)!==pass);
  eye.experiments=[{...useful,sequence:1,name:'First',by:'one',accepted:pass},{...useful,sequence:2,name:'Repeated',by:'two',accepted:pass}];
  eye.citations.set('three',{sequence:1,optionId:contradicted.id});eye.votes.set('four',{optionId:eye.options.find(o=>o.rule.id===eye.rule.id).id});eye.sealed=true;
  const room={round:1,members:['one','two','three','four'].map(id=>({id,name:id,team:'heart',source:'browser'}))};
  recordDiscovery(room,game,'heart',1000);assert.deepEqual(room.witness.seats.map(s=>s.memberId),['one','three']);
  eye.citations.set('two',{sequence:1,optionId:contradicted.id});recordDiscovery(room,game,'heart',2000);assert.equal(room.witness.discoveries.length,1);assert.equal(room.witness.seats.length,2);
});

test('Twitch user and channel clears suppress earlier pending submissions',async()=>{
  for(const type of ['user','clear']){
    const h=await setup({twitch:true});await h.seal('heart');await h.call(h.base+'/witness',{type:'enable',enabled:true},h.host);
    await h.call(h.base+'/witness-moderation',{type,userId:'789',at:h.now()},h.host);assert.equal((await h.command('!spotlight Removed')).status,409);
    h.advance(1000);assert.equal((await h.command('!spotlight New message')).status,200);
    await h.call(h.base+'/witness-moderation',{type,userId:'789',at:h.now()},h.host);assert.equal((await h.call(h.base,undefined,h.host)).witness.queue.length,0);
  }
});
