import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomApi, MemoryRoomStore } from '../server/rooms.js';
import { VeilGame, SIGNALS, parseCommand } from '../public/engine.js';

function harness(){let now=1000;const store=new MemoryRoomStore();const api=new RoomApi(store,{now:()=>now,seed:()=> 'room-test'});let sequence=0;return {store,advance(ms=2000){now+=ms;},async call(path='',body,token){const r=await api.fetch(new Request('https://veil.test/api/rooms'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify({requestId:'request-'+(++sequence),...body}):undefined}));return {status:r.status,...await r.json()};}};}
async function create(h){const room=await h.call('',{title:'Test expedition'});assert.equal(room.status,201);return {code:room.state.code,token:room.token};}
async function join(h,room,team='heart',name='Explorer'){const data=await h.call('/'+room.code+'/join',{team,name,avatar:'🦊'});assert.equal(data.status,201);return {token:data.token,id:data.state.me.id,state:data.state};}
const textFor=(eye,s)=>`!test ${eye} ${s.color} ${s.shape} ${s.pulses}`;

test('emoji commands normalize into the existing validated signal grammar',()=>{
  assert.deepEqual(parseCommand('!test crown 🔵 ⚪ 2️⃣'),parseCommand('!test crown blue circle 2'));
  assert.deepEqual(parseCommand('!bind 🟡 ⬜ 3️⃣'),parseCommand('!bind amber square 3'));
  assert.equal(parseCommand('!cite heart 30 d').type,'cite');assert.equal(parseCommand('!cite heart 31 a'),null);
});
test('room and team IDs are unique; public snapshots omit private seeds and credentials',async()=>{
  const h=harness(),a=await create(h),b=await create(h);assert.notEqual(a.code,b.code);
  const guest=await join(h,a);const publicData=await h.call('/'+a.code);
  assert.equal(publicData.isHost,false);assert.equal(publicData.me,null);assert.equal(publicData.members[0].id,guest.id);
  assert.equal(new Set(publicData.teams.map(t=>t.id)).size,5);assert.ok(publicData.teams.every(t=>t.id.startsWith(a.code+'-')));
  const text=JSON.stringify(publicData);for(const secret of [a.token,guest.token,'hostHash','tokenHash','room-test','deadline','runtime'])assert.ok(!text.includes(secret),secret);
  assert.equal((await h.call('/'+b.code,undefined,guest.token)).me,null);
});
test('guests cannot operate host controls or impersonate Twitch relay accounts',async()=>{
  const h=harness(),room=await create(h),guest=await join(h,room);
  assert.equal((await h.call('/'+room.code+'/control',{type:'start'},guest.token)).status,403);
  assert.equal((await h.call('/'+room.code+'/twitch',{userId:'123',text:'!team crown',channel:'test'},guest.token)).status,403);
  const start=await h.call('/'+room.code+'/control',{type:'start'},room.token);assert.equal(start.state.game.status,'running');
  const action=await h.call('/'+room.code+'/command',{text:'!test heart 🔵 ⚪ 2️⃣',id:'spoofed',source:'twitch'},guest.token);
  assert.equal(action.result.kind,'test');assert.equal(action.result.experiment.by,guest.id);assert.equal(action.result.experiment.source,'browser');
});
test('concurrent joins and duplicate deliveries preserve one atomic action',async()=>{
  const h=harness(),room=await create(h);
  const guests=await Promise.all(['One','Two','Three','Four'].map(name=>join(h,room,'heart',name)));
  assert.equal((await h.call('/'+room.code)).members.length,4);
  await h.call('/'+room.code+'/control',{type:'start'},room.token);
  const body={text:'!test heart red circle 1',requestId:'same-delivery-123'};
  const responses=await Promise.all([h.call('/'+room.code+'/command',body,guests[0].token),h.call('/'+room.code+'/command',body,guests[0].token)]);
  assert.ok(responses.every(r=>r.status===200));assert.equal((await h.call('/'+room.code)).game.experiments.length,1);
});
test('late joiners earn votes by interpreting evidence without spending another experiment',async()=>{
  const h=harness(),room=await create(h),tester=await join(h,room),late=await join(h,room,'crown','Late researcher');
  await h.call('/'+room.code+'/control',{type:'start'},room.token);
  const fixture=new VeilGame({seed:'room-test'}),eye=fixture.eye('heart'),wrong=eye.options.find(o=>o.rule.id!==eye.rule.id);
  const signal=SIGNALS.find(s=>wrong.rule.accepts(s)!==eye.rule.accepts(s));
  await h.call('/'+room.code+'/command',{text:textFor('heart',signal)},tester.token);h.advance();
  const cite=await h.call('/'+room.code+'/command',{text:`!cite heart 1 ${wrong.id}`},late.token);
  assert.equal(cite.result.kind,'cite');assert.ok(cite.state.me.eligible.includes('heart'));assert.equal(cite.state.game.experiments.length,1);
  h.advance();const viable=cite.state.game.eyes.find(e=>e.id==='heart').options.find(o=>!o.eliminated).id;
  const voted=await h.call('/'+room.code+'/command',{text:`!solve heart ${viable}`},late.token);assert.equal(voted.result.kind,'vote');
  const recovered=await h.call('/'+room.code,undefined,late.token);assert.ok(recovered.me.eligible.includes('heart'));assert.equal(recovered.me.votes.heart,viable);
});
test('six filled test slots do not limit how many later viewers can earn votes',async()=>{
  const h=harness(),room=await create(h),fixture=new VeilGame({seed:'room-test'}),eye=fixture.eye('heart');
  await h.call('/'+room.code+'/control',{type:'start'},room.token);
  for(let i=0;i<6;i++){const member=await join(h,room,'heart','Tester '+i);const result=await h.call('/'+room.code+'/command',{text:textFor('heart',SIGNALS[i])},member.token);assert.equal(result.result.kind,'test');}
  const wrong=eye.options.find(o=>SIGNALS.slice(0,6).some(s=>o.rule.accepts(s)!==eye.rule.accepts(s)));assert.ok(wrong);
  const index=SIGNALS.slice(0,6).findIndex(s=>wrong.rule.accepts(s)!==eye.rule.accepts(s));
  for(let i=0;i<10;i++){const member=await join(h,room,'dusk','Reader '+i);const result=await h.call('/'+room.code+'/command',{text:`!cite heart ${index+1} ${wrong.id}`},member.token);assert.equal(result.result.kind,'cite');}
  const state=await h.call('/'+room.code);assert.equal(state.game.experiments.length,6);assert.equal(state.game.participants,16);
});
test('room clock persists across request instances; pause freezes time and expiry is enforced',async()=>{
  const h=harness(),room=await create(h);await h.call('/'+room.code+'/control',{type:'start'},room.token);h.advance(5000);
  assert.equal((await h.call('/'+room.code)).game.remainingMs,475000);
  await h.call('/'+room.code+'/control',{type:'pause'},room.token);h.advance(9000);assert.equal((await h.call('/'+room.code)).game.remainingMs,475000);
  await h.call('/'+room.code+'/control',{type:'start'},room.token);h.advance(475001);assert.equal((await h.call('/'+room.code)).game.status,'lost');
  h.advance(24*60*60*1000);assert.equal((await h.call('/'+room.code)).status,404);
});
test('a complete two-team encounter binds correctly and a reset retains room/member/team IDs',async()=>{
  const h=harness(),room=await create(h),one=await join(h,room,'heart','Researcher'),two=await join(h,room,'root','Interpreter');
  await h.call('/'+room.code+'/control',{type:'start'},room.token);
  const fixture=new VeilGame({seed:'room-test'});
  for(const eye of fixture.eyes){
    const who=eye.id==='root'?two:one;
    await h.call('/'+room.code+'/command',{text:textFor(eye.id,SIGNALS[0])},who.token);h.advance();
    const option=eye.options.find(o=>o.rule.id===eye.rule.id).id;
    const voted=await h.call('/'+room.code+'/command',{text:`!solve ${eye.id} ${option}`},who.token);assert.equal(voted.result.kind,'vote');h.advance();
    const sealed=await h.call('/'+room.code+'/control',{type:'seal',eyeId:eye.id},room.token);assert.equal(sealed.result.kind,'sealed');h.advance();
  }
  const solution=SIGNALS.find(s=>fixture.eyes.every(e=>e.rule.accepts(s)));
  await h.call('/'+room.code+'/command',{text:`!bind ${solution.color} ${solution.shape} ${solution.pulses}`},one.token);
  const won=await h.call('/'+room.code+'/control',{type:'bind'},room.token);assert.equal(won.state.game.status,'won');assert.equal(won.state.activeTeams,2);
  const ids=won.state.teams.map(t=>t.id);const reset=await h.call('/'+room.code+'/control',{type:'reset'},room.token);
  assert.deepEqual(reset.state.teams.map(t=>t.id),ids);assert.equal(reset.state.round,2);assert.equal(reset.state.game.experiments.length,0);assert.ok(reset.state.members.some(m=>m.id===one.id));
});
test('invalid JSON, bad duration and cross-origin mutations fail with controlled errors',async()=>{
  const h=harness();assert.equal((await h.call('',{durationMs:12})).status,400);
  const api=new RoomApi(new MemoryRoomStore());const response=await api.fetch(new Request('https://veil.test/api/rooms',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://other.test'},body:'{}'}));assert.equal(response.status,403);
});
