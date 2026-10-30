import test from 'node:test';
import assert from 'node:assert/strict';
import { VeilGame, EYES, SIGNALS, createPuzzle, parseCommand, signalKey } from '../public/engine.js';

const actor = (id='one') => ({id,name:id,source:'twitch'});
const command = (eye,s) => `!test ${eye} ${s.color} ${s.shape} ${s.pulses}`;
function started(seed='test-veil') { const game=new VeilGame({seed});game.start(0);return game; }
function solveEyes(game) {
  let now=100;
  for(const eye of game.eyes) {
    const who=actor(eye.id);
    assert.equal(game.process(command(eye.id,SIGNALS[0]),who,now).kind,'test');
    now+=2000;
    const answer=eye.options.find(o=>o.rule.id===eye.rule.id).id;
    assert.equal(game.process(`!solve ${eye.id} ${answer}`,who,now).kind,'vote');
    assert.equal(game.lockEye(eye.id,now).kind,'sealed');now+=2000;
  }
  return now;
}

test('200 deterministic constellations have one common signal and every eye is necessary',()=>{
  for(let i=0;i<200;i++) {
    const seed=`constellation-${i}`,eyes=createPuzzle(seed);
    assert.deepEqual(eyes.map(e=>e.rule.id),createPuzzle(seed).map(e=>e.rule.id));
    assert.equal(SIGNALS.filter(s=>eyes.every(e=>e.rule.accepts(s))).length,1,seed);
    for(let omitted=0;omitted<5;omitted++) assert.ok(SIGNALS.filter(s=>eyes.every((e,j)=>j===omitted||e.rule.accepts(s))).length>1,`${seed}: ${omitted}`);
    for(const eye of eyes) { assert.equal(new Set(eye.options.map(o=>o.rule.mask)).size,4);assert.equal(eye.options.filter(o=>o.rule.id===eye.rule.id).length,1); }
  }
});
test('strict commands support explicit eyes, personal focus and final binding',()=>{
  assert.deepEqual(parseCommand(' !TEST   Crown Blue Circle 2 '),{type:'test',eyeId:'crown',signal:{color:'blue',shape:'circle',pulses:2}});
  assert.deepEqual(parseCommand('!solve root d'),{type:'vote',eyeId:'root',optionId:'d'});
  assert.deepEqual(parseCommand('!test red square 3'),{type:'test',eyeId:null,signal:{color:'red',shape:'square',pulses:3}});
  assert.equal(parseCommand('!focus dusk').eyeId,'dusk');assert.equal(parseCommand('!bind amber triangle 1').type,'bindingVote');
  for(const input of ['!solve e','!test moon red circle 2','hello !solve a','!bind blue circle 4','!test blue circle 2 extra',null,'x'.repeat(121)])assert.equal(parseCommand(input),null);
  const game=started();game.process('!focus dawn',actor(),1);
  assert.equal(game.process('!test red square 1',actor(),2).eyeId,'dawn');
});
test('wall clock timeout, pause and resume do not depend on animation frames',()=>{
  const game=started();game.tick(10000);assert.equal(game.remainingMs,470000);game.pause(11000);game.tick(80000);assert.equal(game.remainingMs,469000);
  assert.equal(game.process('!test blue circle 2',actor(),12000).kind,'error');game.resume(100000);game.tick(569000);assert.equal(game.status,'lost');assert.equal(game.remainingMs,0);
});
test('experiments deduplicate per eye, rate limit per contributor, and cap at six',()=>{
  const game=started();assert.equal(game.process(command('crown',SIGNALS[0]),actor(),1).kind,'test');
  assert.match(game.process(command('crown',SIGNALS[1]),actor(),100).message,/two seconds/);
  assert.equal(game.process(command('crown',SIGNALS[1]),actor(),2001).kind,'test');
  assert.match(game.process(command('crown',SIGNALS[2]),actor(),4001).message,/Two experiments/);
  assert.equal(game.process(command('dusk',SIGNALS[0]),actor(),4002).kind,'test');
  assert.match(game.process(command('crown',SIGNALS[0]),actor('other'),5000).message,/already/);
  assert.equal(game.process(command('crown',SIGNALS[2]),actor(),32001).kind,'test');
  for(let i=3;i<6;i++)assert.equal(game.process(command('crown',SIGNALS[i]),actor(`person-${i}`),33000+i).kind,'test');
  assert.match(game.process(command('crown',SIGNALS[6]),actor('last'),34000).message,/six/);assert.equal(game.eye('crown').experiments.length,6);
});
test('votes require evidence at the same eye and later evidence prunes stale votes',()=>{
  const game=started(),eye=game.eye('heart'),wrong=eye.options.find(o=>o.rule.id!==eye.rule.id);
  assert.match(game.process(`!solve heart ${wrong.id}`,actor(),1).message,/Test a signal/);
  const agreeing=SIGNALS.find(s=>wrong.rule.accepts(s)===eye.rule.accepts(s));
  game.process(command('heart',agreeing),actor(),1);
  assert.equal(game.process(`!solve heart ${wrong.id}`,actor(),2001).kind,'vote');
  assert.match(game.process('!solve crown a',actor(),4001).message,/Test a signal/);
  const separating=SIGNALS.find(s=>wrong.rule.accepts(s)!==eye.rule.accepts(s));game.process(command('heart',separating),actor('two'),4001);
  assert.equal(eye.votes.size,0);assert.match(game.process(`!solve heart ${wrong.id}`,actor(),6001).message,/contradicted/);
});
test('one vote per contributor, ties block locks, and wrong locks add a fracture',()=>{
  const game=started(),eye=game.eye('heart'),wrong=eye.options.find(o=>o.rule.id!==eye.rule.id),right=eye.options.find(o=>o.rule.id===eye.rule.id);
  const agreeing=SIGNALS.filter(s=>wrong.rule.accepts(s)===eye.rule.accepts(s));
  game.process(command('heart',agreeing[0]),actor(),1);game.process(command('heart',agreeing[1]),actor('two'),1);
  game.process(`!solve heart ${wrong.id}`,actor(),2001);game.process(`!solve heart ${right.id}`,actor('two'),2001);
  assert.match(game.lockEye('heart',2002).message,/tied/);
  game.process(`!solve heart ${wrong.id}`,actor('two'),4001);assert.equal(eye.votes.size,2);
  assert.equal(game.lockEye('heart',4002).kind,'wrong');assert.equal(game.strikes,1);assert.equal(eye.votes.size,0);assert.ok(eye.wrong.has(wrong.id));
});
test('five seals unlock a distinct binding phase; a single satisfying signal wins',()=>{
  const game=started(),now=solveEyes(game);assert.equal(game.status,'running');assert.equal(game.phase,'binding');
  assert.match(game.process('!bind red circle 1',actor('outsider'),now).message,/Contribute/);
  const solution=SIGNALS.find(s=>game.eyes.every(e=>e.rule.accepts(s)));
  const wrong=SIGNALS.find(s=>signalKey(s)!==signalKey(solution));
  assert.equal(game.process(`!bind ${wrong.color} ${wrong.shape} ${wrong.pulses}`,actor('crown'),now).kind,'bindingVote');
  assert.equal(game.commitBinding(now).kind,'wrongBinding');assert.equal(game.strikes,1);assert.equal(game.status,'running');
  game.process(`!bind ${solution.color} ${solution.shape} ${solution.pulses}`,actor('crown'),now+2000);
  assert.equal(game.commitBinding(now+2001).kind,'bound');assert.equal(game.status,'won');assert.deepEqual(game.finalSignal,solution);assert.ok(game.snapshot().score>1000);
});
test('binding ties require agreement and three rejected bindings end the encounter',()=>{
  const game=started(),now=solveEyes(game),wrong=SIGNALS.filter(s=>!game.eyes.every(e=>e.rule.accepts(s)));
  const bind=(s,a,t)=>game.process(`!bind ${s.color} ${s.shape} ${s.pulses}`,actor(a),t);
  bind(wrong[0],'crown',now);bind(wrong[1],'dusk',now);assert.match(game.commitBinding(now).message,/tied/);
  bind(wrong[0],'dusk',now+2000);assert.equal(game.commitBinding(now+2001).kind,'wrongBinding');
  for(let i=1;i<3;i++){bind(wrong[i],'crown',now+4000*i);game.commitBinding(now+4000*i+1);}
  assert.equal(game.status,'lost');assert.equal(game.strikes,3);
});
test('public suggestions resolve any eye within three additional tests without secret-rule input',()=>{
  for(let seed=0;seed<60;seed++) {
    const game=started(`suggest-${seed}`);let now=1;
    for(const eye of game.eyes){let count=0;while(game.suggest(eye.id)){const signal=game.suggest(eye.id);assert.equal(game.process(command(eye.id,signal),actor(`${eye.id}-${count++}`),now++).kind,'test');assert.ok(count<=3);}assert.equal(game.compatible(eye).length,1);}
  }
});
test('local recovery preserves evidence and votes but resumes a running case paused',()=>{
  const game=started();game.process(command('heart',SIGNALS[0]),actor(),1);const viable=game.compatible(game.eye('heart'))[0].id;game.process(`!solve heart ${viable}`,actor(),2001);
  const saved=game.serialize(3000),restored=VeilGame.restore(JSON.parse(JSON.stringify(saved)));
  assert.equal(restored.status,'paused');assert.equal(restored.remainingMs,477000);assert.equal(restored.eye('heart').experiments.length,1);assert.equal(restored.eye('heart').votes.size,1);assert.equal(restored.participants.size,1);
  assert.ok(!JSON.stringify(restored.snapshot()).includes('"accepts"'));assert.equal(restored.snapshot().eyes[2].discovery,null);
  saved.eyes[2].experiments[0].accepted=!saved.eyes[2].experiments[0].accepted;assert.throws(()=>VeilGame.restore(saved),/observation/);
});
test('finished encounter and final binding survive recovery',()=>{
  const game=started(),now=solveEyes(game),s=SIGNALS.find(s=>game.eyes.every(e=>e.rule.accepts(s)));
  game.process(`!bind ${s.color} ${s.shape} ${s.pulses}`,actor('root'),now);game.commitBinding(now+1);
  const recovered=VeilGame.restore(game.serialize(now+2));assert.equal(recovered.status,'won');assert.deepEqual(recovered.finalSignal,s);assert.equal(recovered.snapshot().sealedCount,EYES.length);
});

