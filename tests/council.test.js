import test from 'node:test';
import assert from 'node:assert/strict';
import {RoomApi,MemoryRoomStore} from '../server/rooms.js';
import {VeilGame} from '../public/engine.js';

async function setup(kind='meme'){
  let now=1000,n=0;const store=new MemoryRoomStore(),api=new RoomApi(store,{now:()=>now,seed:()=> 'council-test'});
  const call=async(path,body,token)=>{const r=await api.fetch(new Request('https://test.local/api/rooms'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify({requestId:`council-${++n}`,...body}):undefined}));return {status:r.status,...await r.json()};};
  const host=await call('',{title:'Council',controlMode:'host'}),base='/'+host.state.code;
  const join=async(team,name)=>call(base+'/join',{team,name});
  const a=await join('crown','Captain A'),b=await join('dusk','Captain B'),v=await join('crown','Viewer');
  const act=(body,who=host)=>call(base+'/council',body,who.token);
  await act({type:'captain',team:'crown',memberId:a.state.me.id});await act({type:'captain',team:'dusk',memberId:b.state.me.id});
  await act({type:'open',kind,eyeId:'heart',title:'Meme night'});
  return {store,host,a,b,v,base,call,join,act,advance:ms=>now+=ms,state:who=>call(base,undefined,who?.token)};
}
async function approved(h){
  const x=await h.act({type:'submit',caption:'A private meme'},h.a),y=await h.act({type:'submit',caption:'B private meme'},h.b);
  const a=x.state.council.event.myMeme,b=y.state.council.event.myMeme;
  await h.act({type:'approve',memeId:a});await h.act({type:'approve',memeId:b});return {a,b};
}

test('captains have bounded authority; private memes and predictions stay private until reveal',async()=>{
  const h=await setup();assert.equal((await h.act({type:'captain',team:'root',memberId:h.v.state.me.id},h.v)).status,403);
  assert.equal((await h.act({type:'open',kind:'meme'},h.a)).status,403);
  assert.equal((await h.state(h.a)).canRelay,true);assert.equal((await h.state(h.v)).canRelay,false);
  assert.equal((await h.call(h.base+'/control',{type:'start'},h.a.token)).status,403);
  const {a}=await approved(h);const publicState=await h.state();assert.equal(publicState.council.event.memes.length,0);assert.ok(!JSON.stringify(publicState).includes('A private meme'));
  assert.equal((await h.act({type:'feature',memeId:a})).status,409);
  await h.act({type:'back',team:'dusk',stake:3},h.v);
  assert.equal((await h.state(h.v)).council.myBalance,7);assert.equal((await h.state()).council.event.myBack,null);
  assert.equal((await h.call(h.base+'/team',{team:'dusk'},h.v.token)).status,409);
  await h.act({type:'lock'});assert.equal((await h.state()).council.event.memes.length,2);
  assert.equal((await h.act({type:'back',team:'crown',stake:1},h.b)).status,409);
});

test('live meme round requires showcasing, expires voting, weights communities equally and settles once',async()=>{
  const h=await setup(),{a,b}=await approved(h),v2=await h.join('crown','Another viewer');
  await h.act({type:'back',team:'dusk',stake:3},h.v);await h.act({type:'lock'});
  assert.equal((await h.act({type:'startVote'})).status,409);
  assert.equal((await h.act({type:'feature',memeId:a},h.a)).status,403);
  await h.act({type:'feature',memeId:a});await h.act({type:'feature',memeId:b});h.advance(61000);assert.equal((await h.state()).council.event.featured,null);
  await h.act({type:'startVote'});
  for(const m of [h.a,h.v,v2])await h.act({type:'vote',memeId:a},m);
  await h.act({type:'vote',memeId:b},h.b);
  assert.deepEqual((await h.state()).council.event.scores,{});
  assert.equal((await h.act({type:'finish'})).status,409);h.advance(60000);
  assert.equal((await h.act({type:'vote',memeId:b},h.v)).status,409);
  const finish=await h.act({type:'finish',requestId:'same-finish-123'});assert.equal(finish.status,200);
  assert.deepEqual(finish.state.council.event.winners,['crown','dusk']);assert.ok(Math.abs(finish.state.council.event.scores.crown-50)<1e-8);
  assert.equal((await h.state(h.v)).council.myBalance,13);
  await h.act({type:'finish',requestId:'same-finish-123'});assert.equal((await h.state(h.v)).council.myBalance,13);
  assert.equal((await h.act({type:'finish'})).status,409);
});

test('removing a live meme cancels the contest, refunds predictions and removes displayed content',async()=>{
  const h=await setup(),{a}=await approved(h);await h.act({type:'back',team:'crown',stake:2},h.v);await h.act({type:'lock'});await h.act({type:'feature',memeId:a});
  const removed=await h.act({type:'reject',memeId:a});assert.equal(removed.state.council.event.phase,'cancelled');assert.equal(removed.state.council.event.featured,null);assert.ok(!JSON.stringify(removed.state.council).includes('A private meme'));assert.equal((await h.state(h.v)).council.myBalance,10);
  assert.equal((await h.act({type:'cancel'})).status,409);assert.equal((await h.state(h.v)).council.myBalance,10);
});

test('captain commitments and team opinions are private; real evidence resolves theory council',async()=>{
  const h=await setup('theory'),game=new VeilGame({seed:'council-test'}),eye=game.eye('heart');
  const correct=eye.options.find(o=>o.rule.id===eye.rule.id).id,wrong=eye.options.find(o=>o.id!==correct).id;
  await h.act({type:'opinion',option:correct,reason:'private crown reasoning'},h.v);
  assert.equal((await h.state(h.b)).council.event.opinions.length,0);
  assert.equal((await h.act({type:'commit',option:correct,reason:'not captain'},h.v)).status,403);
  await h.act({type:'commit',option:correct,reason:'my sealed reasoning'},h.a);await h.act({type:'commit',option:wrong,reason:'a competing theory'},h.b);
  assert.deepEqual((await h.state(h.b)).council.event.commitments.crown,{locked:true});assert.ok(!JSON.stringify(await h.state()).includes('my sealed reasoning'));
  assert.equal((await h.act({type:'commit',option:wrong,reason:'changed'},h.a)).status,409);
  await h.act({type:'back',team:'crown',stake:2},h.v);
  await h.call(h.base+'/control',{type:'start'},h.host.token);
  assert.equal((await h.call(h.base+'/control',{type:'seal',eyeId:'heart',optionId:correct},h.host.token)).status,409);
  await h.act({type:'lock'});assert.equal((await h.state()).council.event.commitments.crown.option,correct);
  const signal=game.suggest('heart');await h.call(h.base+'/command',{text:`!test heart ${signal.color} ${signal.shape} ${signal.pulses}`},h.v.token);
  const pending=(await h.state(h.host)).pendingTests[0];await h.call(h.base+'/control',{type:'approveTest',pendingId:pending.id},h.host.token);
  const seal=await h.call(h.base+'/control',{type:'seal',eyeId:'heart',optionId:correct},h.host.token);
  assert.equal(seal.result.kind,'sealed');assert.equal(seal.state.council.event.phase,'results');assert.deepEqual(seal.state.council.event.winners,['crown']);assert.equal((await h.state(h.v)).council.myBalance,12);
});

test('invalid images, stakes, stale approval IDs and concurrent duplicate predictions are rejected safely',async()=>{
  const h=await setup();for(const image of ['https://elsewhere.test/image.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/jpeg;base64,'+'A'.repeat(65000)])assert.equal((await h.act({type:'submit',caption:'x',image},h.v)).status,400);
  for(const stake of [0,-2,4,1.5,'2'])assert.equal((await h.act({type:'back',team:'crown',stake},h.v)).status,400);
  const r=await h.act({type:'submit',caption:'first'},h.v),id=r.state.council.event.myMeme;await h.act({type:'withdraw'},h.v);
  const second=await h.act({type:'submit',caption:'replacement'},h.v);assert.notEqual(second.state.council.event.myMeme,id);assert.equal((await h.act({type:'approve',memeId:id})).status,409);
  const body={type:'back',team:'crown',stake:3,requestId:'duplicate-backing'};const both=await Promise.all([h.act(body,h.v),h.act(body,h.v)]);assert.ok(both.every(x=>x.status===200));assert.equal((await h.state(h.v)).council.myBalance,7);
  await h.call(h.base+'/control',{type:'reset'},h.host.token);assert.equal((await h.state(h.v)).council.myBalance,10);
});

test('captains relay their own audiences into their teams without getting host powers',async()=>{
  const h=await setup();const relay=(who,userId,text)=>h.call(h.base+'/twitch',{channel:'captain_channel',userId,text,name:'Viewer'},who.token);
  assert.equal((await relay(h.v,'100','!back crown 2')).status,403);
  const a=await relay(h.a,'100','!back crown 2'),b=await relay(h.b,'101','!back dusk 1');assert.equal(a.status,200);assert.equal(b.status,200);
  const state=await h.state();assert.equal(state.members.find(m=>m.id==='T-100').team,'crown');assert.equal(state.members.find(m=>m.id==='T-101').team,'dusk');
  assert.equal((await relay(h.b,'100','!back dusk 2')).status,409);
  assert.equal((await relay(h.b,'100','!team dusk')).status,409);
  assert.equal((await relay(h.a,'100','!spotlight text')).status,403);
});

test('captain moderation removes only its channel opinions, including out-of-order deleted messages',async()=>{
  const h=await setup('theory');
  await h.act({type:'connect',channel:'alpha',info:{category:'Chess',title:'North final'}},h.a);
  assert.deepEqual((await h.state()).council.captains.find(cap=>cap.team==='crown').info,{category:'Chess',title:'North final'});
  await h.act({type:'connect',channel:'hostdesk',info:{category:'Puzzle',title:'Expedition'}});
  assert.deepEqual((await h.state()).channelInfo,{category:'Puzzle',title:'Expedition'});
  await h.act({type:'connect',channel:'beta'},h.b);
  const relay=(who,channel,userId,messageId)=>h.call(h.base+'/twitch',{channel,userId,messageId,sentAt:1000,text:'!opinion a secret reason',name:'Chatter'},who.token);
  await relay(h.a,'alpha','100','one');await relay(h.b,'beta','101','two');
  const mod=(who,channel,body)=>h.call(h.base+'/council-moderation',{channel,...body},who.token);
  assert.equal((await mod(h.a,'beta',{type:'clear',at:1000})).status,403);
  assert.equal((await mod(h.v,'alpha',{type:'clear',at:1000})).status,403);
  await mod(h.a,'alpha',{type:'delete',messageId:'one'});assert.equal((await h.state(h.host)).council.event.opinions.length,1);
  await mod(h.a,'alpha',{type:'delete',messageId:'late'});assert.equal((await relay(h.a,'alpha','102','late')).status,409);
  await mod(h.b,'beta',{type:'user',userId:'101',at:1000});assert.equal((await h.state(h.host)).council.event.opinions.length,0);
});

test('an expired encounter refunds an unresolved theory council on refresh exactly once',async()=>{
  const h=await setup('theory');await h.act({type:'back',team:'crown',stake:3},h.v);await h.call(h.base+'/control',{type:'start'},h.host.token);h.advance(480001);
  const states=await Promise.all([h.state(h.v),h.state(h.v)]);for(const s of states){assert.equal(s.council.event.phase,'cancelled');assert.equal(s.council.myBalance,10);}
  assert.equal((await h.state(h.v)).council.myBalance,10);
});
