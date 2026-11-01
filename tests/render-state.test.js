import test from 'node:test';
import assert from 'node:assert/strict';
import { VeilGame } from '../public/engine.js';
import { roomContentKey } from '../public/room-render-state.js';

test('polling time advances without invalidating the interactive view', () => {
  const game=new VeilGame();game.start(1000);
  const before={code:'RENDER1',round:1,serverNow:1000,game:game.snapshot()};
  const after=structuredClone(before);after.serverNow+=3000;after.game.remainingMs-=3000;
  assert.equal(roomContentKey(after),roomContentKey(before));
  after.game.status='lost';after.game.endReason='Time ran out.';
  assert.notEqual(roomContentKey(after),roomContentKey(before));
});

test('evidence and vote changes always refresh the view', () => {
  const game=new VeilGame();game.start(1000);
  const before={code:'RENDER1',round:1,serverNow:1000,game:game.snapshot()};
  const signal=game.suggest('heart');game.process(`!test heart ${signal.color} ${signal.shape} ${signal.pulses}`,{id:'viewer',name:'Viewer'},1001);
  const tested={...before,game:game.snapshot()};
  assert.notEqual(roomContentKey(tested),roomContentKey(before));
  const voted=structuredClone(tested);voted.game.eyes[2].options[0].votes=1;
  assert.notEqual(roomContentKey(voted),roomContentKey(tested));
});

test('room membership, private permissions and optional live content invalidate cached UI', () => {
  const before={code:'RENDER1',round:1,serverNow:1000,game:new VeilGame().snapshot(),members:[],isHost:false,lounge:{messages:[]},witness:{enabled:false}};
  for(const change of [
    {code:'RENDER2'}, {round:2}, {isHost:true},
    {members:[{id:'viewer',name:'Viewer'}]},
    {lounge:{messages:[{text:'A new clue'}]}},
    {witness:{enabled:true}},
  ]) assert.notEqual(roomContentKey({...before,...change}),roomContentKey(before));
});
