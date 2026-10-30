import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomApi, MemoryRoomStore } from '../server/rooms.js';
import { VeilGame, SIGNALS, authoredPuzzle } from '../public/engine.js';

function harness(){
  let now=1000,seq=0;const store=new MemoryRoomStore(),api=new RoomApi(store,{now:()=>now,seed:()=> 'host-design'});
  return {store,advance(ms=2000){now+=ms;},async call(path='',body,token){
    const r=await api.fetch(new Request('https://veil.test/api/rooms'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify({requestId:'host-request-'+(++seq),...body}):undefined}));
    return {status:r.status,...await r.json()};
  }};
}
async function setup(mode='shared'){
  const h=harness(),created=await h.call('',{controlMode:mode,minimumTeams:1});assert.equal(created.status,201);
  const base='/'+created.state.code,host=created.token;
  const joined=await h.call(base+'/join',{name:'Viewer',team:'heart'});assert.equal(joined.status,201);
  return {h,base,host,guest:joined.token,id:joined.state.me.id,definition:created.state.authoring};
}
const testCommand=(eye,s)=>`!test ${eye} ${s.color} ${s.shape} ${s.pulses}`;

test('host-led requests spend nothing until approval; permissions, withdrawal and duplicate approvals are enforced',async()=>{
  const {h,base,host,guest,id}=await setup('host');
  await h.call(base+'/control',{type:'start'},host);
  const proposed=await h.call(base+'/command',{text:'!test heart red circle 1'},guest);
  assert.equal(proposed.result.kind,'testRequested');assert.equal(proposed.state.game.experiments.length,0);assert.equal(proposed.state.me.eligible.length,0);
  const pending=proposed.state.pendingTests[0];
  assert.equal((await h.call(base)).pendingTests.length,0);
  assert.equal((await h.call(base+'/command',{text:'!test heart blue circle 2'},guest)).status,409);
  assert.equal((await h.call(base+'/control',{type:'approveTest',pendingId:pending.id},guest)).status,403);
  const payload={type:'approveTest',pendingId:pending.id,requestId:'approve-identical-123'};
  const approved=await h.call(base+'/control',payload,host);
  assert.equal(approved.result.kind,'test');assert.equal(approved.result.experiment.by,id);
  assert.equal(approved.state.pendingTests.length,0);assert.equal(approved.state.game.experiments.length,1);
  assert.equal((await h.call(base+'/control',payload,host)).state.game.experiments.length,1);
  h.advance();const next=await h.call(base+'/command',{text:'!test crown blue square 2'},guest);
  assert.equal(next.result.kind,'testRequested');
  await h.call(base+'/withdraw-test',{},guest);
  assert.equal((await h.call(base+'/control',{type:'approveTest',pendingId:next.state.pendingTests[0].id},host)).status,409);
});

test('Twitch tests use the same approval queue and modes change only while held',async()=>{
  const {h,base,host,guest}=await setup('host');await h.call(base+'/control',{type:'start'},host);
  const req=await h.call(base+'/twitch',{text:'!test crown blue circle 2',userId:'789',name:'Chatter',channel:'host'},host);
  assert.equal(req.result.kind,'testRequested');assert.equal(req.state.pendingTests[0].memberId,'T-789');
  assert.equal((await h.call(base+'/control',{type:'mode',mode:'community'},host)).status,409);
  await h.call(base+'/control',{type:'pause'},host);
  assert.equal((await h.call(base+'/control',{type:'mode',mode:'community'},guest)).status,403);
  const change=await h.call(base+'/control',{type:'mode',mode:'community'},host);
  assert.equal(change.state.controlMode,'community');assert.equal(change.state.pendingTests.length,0);assert.equal(change.state.game.experiments.length,0);
  const reset=await h.call(base+'/control',{type:'reset'},host);assert.equal(reset.state.controlMode,'community');
});

test('community contributors confirm the leading vote; shared mode rejects it',async()=>{
  for(const mode of ['community','shared']){
    const {h,base,host,guest,definition}=await setup(mode);await h.call(base+'/control',{type:'start'},host);
    assert.equal((await h.call(base+'/decide',{type:'seal',eyeId:'heart'},guest)).status,403);
    await h.call(base+'/command',{text:'!test heart red circle 1'},guest);h.advance();
    const correct=definition.find(e=>e.id==='heart').correct;
    await h.call(base+'/command',{text:`!solve heart ${correct}`},guest);h.advance();
    const decided=await h.call(base+'/decide',{type:'seal',eyeId:'heart',optionId:'invalid'},guest);
    assert.equal(decided.status,mode==='community'?200:403);
    if(mode==='community')assert.equal(decided.result.kind,'sealed');
  }
});

test('Twitch community decisions check contributor eligibility and do not grant host powers',async()=>{
  const {h,base,host,definition}=await setup('community');await h.call(base+'/control',{type:'start'},host);
  const relay=text=>h.call(base+'/twitch',{text,userId:'1234',name:'Chatter',channel:'host'},host);
  assert.equal((await relay('!seal crown')).status,403);
  await relay('!test crown red circle 1');h.advance();
  await relay(`!solve crown ${definition.find(e=>e.id==='crown').correct}`);h.advance();
  assert.equal((await relay('!seal crown')).result.kind,'sealed');
  assert.equal((await relay('!confirmbind')).status,409);
});

test('authored options validate, persist, remain private and cannot change after start',async()=>{
  const {h,base,host,guest,definition}=await setup();
  definition[0].options[0].label='The ember responds';
  const invalid=structuredClone(definition);invalid[0].options[1].ruleId=invalid[0].options[0].ruleId;
  assert.equal((await h.call(base+'/control',{type:'publishPuzzle',definition:invalid},host)).status,400);
  assert.equal((await h.call(base+'/control',{type:'publishPuzzle',definition},guest)).status,403);
  const published=await h.call(base+'/control',{type:'publishPuzzle',definition},host);
  assert.equal(published.status,200);assert.equal(published.state.puzzleType,'authored');assert.equal(published.state.puzzleRevision,1);
  const visible=await h.call(base,undefined,guest);
  assert.equal(visible.authoring,null);assert.equal(visible.game.eyes[0].options[0].label,'The ember responds');
  assert.ok(!JSON.stringify(visible).includes('"correct"'));assert.ok(!JSON.stringify(visible).includes('"ruleId"'));
  await h.call(base+'/control',{type:'start'},host);
  assert.equal((await h.call(base,undefined,host)).authoring,null);
  assert.equal((await h.call(base+'/control',{type:'publishPuzzle',definition},host)).status,409);
  await h.call(base+'/control',{type:'pause'},host);
  assert.equal((await h.call(base+'/control',{type:'generatePuzzle'},host)).status,409);
  const reset=await h.call(base+'/control',{type:'reset'},host);
  assert.deepEqual(reset.state.authoring,definition);
  const generated=await h.call(base+'/control',{type:'generatePuzzle'},host);assert.equal(generated.state.puzzleType,'generated');
});

test('authored puzzle validation rejects impossible, ambiguous and redundant correct rules',()=>{
  const game=new VeilGame({seed:'host-design'});
  const spec=game.eyes.map(e=>({id:e.id,correct:e.options.find(o=>o.rule.id===e.rule.id).id,options:e.options.map(o=>({ruleId:o.rule.id,label:''}))}));
  assert.equal(authoredPuzzle(spec).length,5);
  const withCorrect=(definitions,rules)=>definitions.map((e,i)=>({...e,correct:'a',options:[{ruleId:rules[i],label:''},{ruleId:'not-shape-circle',label:''},{ruleId:'not-shape-triangle',label:''},{ruleId:'not-pulses-3',label:''}]}));
  assert.throws(()=>authoredPuzzle(withCorrect(spec,['is-color-red','is-color-blue','is-color-red','is-color-red','is-color-red'])),/0 final signals/);
  assert.throws(()=>authoredPuzzle(withCorrect(spec,Array(5).fill('is-color-red'))),/9 final signals/);
  assert.throws(()=>authoredPuzzle(withCorrect(spec,['is-color-red','is-shape-square','is-pulses-1','is-color-red','is-color-red'])),/redundant/);
});

test('a host-authored, host-led encounter completes with approved evidence and host choices, without viewer votes',async()=>{
  const {h,base,host,guest,definition}=await setup('host');
  await h.call(base+'/control',{type:'publishPuzzle',definition},host);await h.call(base+'/control',{type:'start'},host);
  for(const eye of definition){
    assert.equal((await h.call(base+'/control',{type:'seal',eyeId:eye.id,optionId:eye.correct},host)).status,409);
    const proposed=await h.call(base+'/command',{text:testCommand(eye.id,SIGNALS[0])},guest);
    assert.equal(proposed.result.kind,'testRequested');
    assert.equal((await h.call(base+'/control',{type:'approveTest',pendingId:proposed.state.pendingTests[0].id},host)).result.kind,'test');h.advance();
    const sealed=await h.call(base+'/control',{type:'seal',eyeId:eye.id,optionId:eye.correct},host);
    assert.equal(sealed.result.kind,'sealed');assert.equal(sealed.state.game.eyes.find(e=>e.id===eye.id).voteTotal,0);
  }
  const eyes=authoredPuzzle(definition),signal=SIGNALS.find(s=>eyes.every(e=>e.rule.accepts(s)));
  const won=await h.call(base+'/control',{type:'bind',signal},host);
  assert.equal(won.state.game.status,'won');assert.equal(won.state.game.bindingVoteTotal,0);
  assert.equal((await h.call(base)).game.status,'won');
});
