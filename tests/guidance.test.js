import test from 'node:test';
import assert from 'node:assert/strict';
import { VeilGame } from '../public/engine.js';
import { roomGuidance } from '../public/room-guidance.js';

test('late arrival guidance chooses evidence citation instead of another experiment',()=>{
  const game=new VeilGame();game.start(1000);
  const s=game.suggest('heart');game.process(`!test heart ${s.color} ${s.shape} ${s.pulses}`,{id:'one',name:'One'},1000);
  const state={game:game.snapshot(),minimumTeams:2,activeTeams:1,me:{eligible:[]}};
  const guide=roomGuidance(state,'heart');assert.equal(guide.target,'proof-panel');assert.match(guide.detail,/without spending/);
  assert.match(guide.last,/PASS|FAIL/);assert.match(guide.recap,/1\/2/);
  state.me.eligible=['heart'];assert.equal(roomGuidance(state,'heart').target,'room-theories');
  state.me=null;assert.equal(roomGuidance(state,'heart').target,'watch-join');
});

test('binding and pause guidance respects group size and host role',()=>{
  const game=new VeilGame().snapshot();game.status='running';game.phase='binding';
  const state={game,minimumTeams:1,activeTeams:1,isHost:true};
  assert.equal(roomGuidance(state,'heart').target,'host-seal');
  state.minimumTeams=2;assert.equal(roomGuidance(state,'heart').target,'proof-panel');
  game.status='paused';assert.equal(roomGuidance(state,'heart').target,'host-start');
  game.status='won';assert.equal(roomGuidance(state,'heart').target,'room-outcome');
});
