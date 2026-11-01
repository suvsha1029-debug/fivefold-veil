import test from 'node:test';
import assert from 'node:assert/strict';
import { guideRole, guideSteps, guideDialogSteps } from '../public/guide-steps.js';

const state=(overrides={})=>({code:'GUIDE01',isHost:false,me:{id:'viewer'},controlMode:'shared',minimumTeams:2,game:{status:'running',phase:'investigation'},...overrides});
const text=steps=>steps.map(s=>s.text).join(' ');

test('tour routes lobby, streamer, viewer and spectator to appropriate controls',()=>{
  assert.equal(guideRole(null),'lobby');
  assert.equal(guideRole(state({isHost:true,me:null})),'host');
  assert.equal(guideRole(state()),'viewer');
  assert.equal(guideRole(state({me:null})),'spectator');
  assert.equal(guideSteps(null)[0].target,'#create-form');
  assert.deepEqual(guideSteps(state({isHost:true,me:null})).slice(0,3).map(s=>s.target),['#quick-invite','#room-twitch-button','#host-start']);
  const spectator=guideSteps(state({me:null}));
  assert.deepEqual(spectator.map(s=>s.target),['.expedition-brief','.room-journal','.crew-theories','#watch-join']);
  assert.ok(!spectator.some(s=>s.target==='#host-start'||s.target==='#emoji-keyboard'));
});

test('guide explains paused input, host approvals and community confirmation accurately',()=>{
  const paused=guideSteps(state({game:{status:'paused',phase:'investigation'}}));
  assert.match(paused.find(s=>s.id==='compose').text,/disabled while the clock is held/);
  assert.match(paused.find(s=>s.id==='send').text,/does not submit/);
  const hostLed=guideSteps(state({controlMode:'host'}));
  assert.match(hostLed.find(s=>s.id==='send').text,/host approval/);
  assert.match(hostLed.find(s=>s.id==='theories').text,/advises the host/);
  const community=guideSteps(state({controlMode:'community'}));
  assert.match(community.find(s=>s.id==='theories').text,/eligible contributors can confirm/);
  assert.match(community.find(s=>s.id==='theories').text,/tied votes/);
});

test('binding and ended tours avoid investigation-only instructions',()=>{
  const binding={status:'running',phase:'binding'};
  const viewer=guideSteps(state({game:binding,minimumTeams:1}));
  assert.equal(viewer[0].target,'.crew-theories');
  assert.match(viewer[0].text,/1 different team is needed/);
  assert.ok(viewer.some(s=>s.id==='binding-compose'&&s.target==='#emoji-keyboard'));
  assert.ok(!viewer.some(s=>s.id==='send'));
  const director=guideSteps(state({game:binding,isHost:true,me:null,controlMode:'host'}));
  assert.match(director.find(s=>s.id==='binding-compose').text,/Bind selected signal/);
  const ended=guideSteps(state({game:{status:'won',phase:'binding'},isHost:true,me:null}));
  assert.equal(ended[0].target,'#room-outcome');
  assert.ok(ended.some(s=>s.target==='#host-reset'));
  assert.ok(!ended.some(s=>s.target==='#send-signal'));
});

test('tour copy ignores private answer and credential fields and does not mutate room state',()=>{
  const publicRoom=state();
  const withSecrets=structuredClone(publicRoom);
  withSecrets.authoring={correct:'PRIVATE_ANSWER_DO_NOT_DISPLAY'};
  withSecrets.hostToken='PRIVATE_CREDENTIAL_DO_NOT_DISPLAY';
  withSecrets.game.secretRule='PRIVATE_RULE_DO_NOT_DISPLAY';
  const before=structuredClone(withSecrets);
  assert.deepEqual(guideSteps(withSecrets),guideSteps(publicRoom));
  assert.deepEqual(withSecrets,before);
  assert.doesNotMatch(text(guideSteps(withSecrets)),/PRIVATE_/);
  for(const room of [null,state(),state({isHost:true,me:null}),state({me:null})]){
    const steps=guideSteps(room),ids=steps.map(s=>s.id);
    assert.equal(new Set(ids).size,ids.length);
    assert.ok(steps.every(s=>s.title&&s.text&&s.target));
  }
});

test('dialog guides preserve read-only spectator and before-round host boundaries',()=>{
  const spectator=state({me:null,game:{status:'paused',phase:'investigation'}});
  const chamber=guideDialogSteps('chamber-dialog',spectator);
  assert.ok(chamber.some(s=>s.id==='chamber-observe'));
  assert.ok(!chamber.some(s=>s.target==='#chamber-tune'));
  const reader=guideDialogSteps('domain-lounge',spectator).find(s=>s.id==='lounge-participate');
  assert.match(reader.text,/spectators cannot send/);
  const pausedMember=state({game:{status:'paused',phase:'investigation'}});
  assert.match(guideDialogSteps('chamber-dialog',pausedMember).find(s=>s.id==='chamber-tune').text,/while the main clock is held/);
  assert.match(guideDialogSteps('domain-lounge',{...pausedMember,lounge:{enabled:false}}).at(-1).text,/messages cannot be sent/);
  for(const room of [spectator,pausedMember,state({isHost:true,me:null})]) {
    assert.ok(!guideDialogSteps('puzzle-editor',room).some(s=>s.target==='#publish-puzzle'));
  }
  const editing=guideDialogSteps('puzzle-editor',state({isHost:true,me:null,game:{status:'idle',phase:'investigation'}}));
  assert.ok(editing.some(s=>s.target==='#publish-puzzle'));
});

test('Twitch guide separates public ID entry from deliberate authorization',()=>{
  const unauthorized=guideDialogSteps('room-twitch-dialog',state());
  assert.ok(!unauthorized.some(s=>s.target==='#room-client-id'));
  const captain=guideDialogSteps('room-twitch-dialog',state({canRelay:true}));
  const id=captain.find(s=>s.id==='twitch-client'),authorize=captain.find(s=>s.id==='twitch-authorize');
  assert.match(id.text,/Client ID is public/);
  assert.match(id.text,/do not enter a client secret or access token/);
  assert.match(authorize.text,/approve it yourself/);
  assert.notEqual(id.target,authorize.target);
});

test('all dialog guide copy is bounded, stable, private-data independent and read-only',()=>{
  const dialogs=['domain-dialog','chamber-dialog','domain-lounge','room-twitch-dialog','invite-dialog','puzzle-editor','room-guide'];
  const original=state({isHost:true,me:null,game:{status:'idle',phase:'investigation'}});
  const secret=structuredClone(original);secret.authoring={correct:'PRIVATE_ANSWER'};secret.hostToken='PRIVATE_TOKEN';secret.chat=['PRIVATE_MESSAGE'];
  const before=structuredClone(secret);
  for(const dialog of dialogs) {
    const steps=guideDialogSteps(dialog,secret);
    assert.ok(steps.length>=2&&steps.length<=4,dialog);
    assert.equal(new Set(steps.map(s=>s.id)).size,steps.length,dialog);
    assert.deepEqual(steps,guideDialogSteps(dialog,original));
    assert.doesNotMatch(text(steps),/PRIVATE_/);
  }
  assert.deepEqual(secret,before);
  assert.deepEqual(guideDialogSteps('unknown-dialog',secret),[]);
});
