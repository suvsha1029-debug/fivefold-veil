import { VeilGame, EYES, SIGNALS, signalKey } from './engine.js';
import { channelDescription, TwitchChat, beginTwitchLogin, consumeTwitchLogin, callbackUrl, savedClientId } from './twitch.js';
import { DomainScene } from './domain.js';

let login=null,loginError=null;
try { login=consumeTwitchLogin(); } catch(error) { loginError=error.message; }
const $=id=>document.getElementById(id);
const el=(tag,cls='',text='')=>{const node=document.createElement(tag);node.className=cls;node.textContent=text;return node;};
const scene=new DomainScene();
const SAVE_KEY='fivefold-veil-session-v2',OWNER_KEY='fivefold-veil-controller';
const tabId=[...crypto.getRandomValues(new Uint8Array(8))].map(n=>n.toString(16).padStart(2,'0')).join('');
const newSeed=()=>`veil-${[...crypto.getRandomValues(new Uint8Array(4))].map(n=>n.toString(16).padStart(2,'0')).join('')}`;
const ACTORS={you:'You',mira:'Mira',ash:'Ash',sol:'Sol',nora:'Nora'};
let selectedEye='heart',durationMs=480000,mode='practice',caseSource='practice',savedChannel='',recovered=false;
let connection={state:'disconnected',message:'Local rehearsal · simulated contributors'};
let game,feed=[],theorySignature='',toastTimer,sampleIndex=0,autosaveOkay=true;

function toast(message,error=false){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.toggle('error',error);$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,5500);}
function readDraft(){try{const text=localStorage.getItem(SAVE_KEY);if(!text||text.length>100000)return null;const value=JSON.parse(text);if(!['practice','twitch'].includes(value.source))return null;return value;}catch{return null;}}
function claim(){try{localStorage.setItem(OWNER_KEY,tabId);}catch{autosaveOkay=false;}}
function owns(){try{return localStorage.getItem(OWNER_KEY)===tabId;}catch{return true;}}
function persist(){
  if(!owns())return;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify({source:caseSource,channel:savedChannel,selectedEye,theme:scene.theme,updatedAt:new Date().toISOString(),game:game.serialize()}));$('save-status').textContent='Saved on this device';}
  catch{autosaveOkay=false;$('save-status').textContent='Device save unavailable';}
}

const requestedSeed=new URL(location.href).searchParams.get('case');
const draft=readDraft();
try{
  if(draft&&(!requestedSeed||draft.game.seed===requestedSeed)){
    game=VeilGame.restore(draft.game);durationMs=game.durationMs;caseSource=mode=draft.source;
    savedChannel=typeof draft.channel==='string'?draft.channel.slice(0,40):'';
    selectedEye=EYES.some(e=>e.id===draft.selectedEye)?draft.selectedEye:'heart';
    scene.setTheme(draft.theme);recovered=true;
    $('recovery-banner').hidden=false;$('recovery-banner').textContent=['won','lost'].includes(game.status)?'Recovered your completed encounter. Review the field journal or begin a new case.':game.status==='idle'?'Recovered your case setup. Start when your crew is ready.':mode==='twitch'?'Recovered your encounter, paused. Reconnect the same Twitch channel to continue.':'Recovered your encounter, paused. Review the journal and resume when ready.';
  }else game=new VeilGame({seed:requestedSeed||newSeed(),durationMs});
}catch(error){game=new VeilGame({seed:newSeed(),durationMs});loginError=loginError||'The old case could not be recovered. A fresh encounter is ready.';}

const eyeButtons=new Map();
for(const eye of EYES){
  const button=el('button','eye-tab');button.type='button';button.dataset.eye=eye.id;
  button.append(el('span','eye-mark',eye.mark),el('strong','eye-name',eye.name),el('small','eye-progress','0 / 6 tests'));
  button.addEventListener('click',()=>setFocus(eye.id));eyeButtons.set(eye.id,button);$('eye-tabs').append(button);
}
function practiceActor(){const key=$('practice-actor').value;return {id:`practice:${key}`,name:ACTORS[key]||'You',source:'practice',eyeId:selectedEye};}
function builderSignal(){return {color:$('signal-color').value,shape:$('signal-shape').value,pulses:Number($('signal-pulses').value)};}
function previewSignal(signal){$('specimen-shape').className=`specimen-shape ${signal.color} ${signal.shape}`;$('specimen-description').textContent=`${signal.color} · ${signal.shape} · ${signal.pulses} pulse${signal.pulses===1?'':'s'}`.toUpperCase();}
function updateCommand(){const s=builderSignal();$('command-preview').textContent=game.phase==='binding'?`!bind ${s.color} ${s.shape} ${s.pulses}`:`!test ${selectedEye} ${s.color} ${s.shape} ${s.pulses}`;}
function showVictory(){$('machine-stage').dataset.result='pass';$('output-symbol').textContent='✧';$('output-label').textContent='VEIL OPENED';previewSignal(game.finalSignal);}
function builderChanged(){const s=builderSignal();updateCommand();if(game.status==='won'){showVictory();return;}previewSignal(s);$('machine-stage').dataset.result='idle';$('output-symbol').textContent='?';$('output-label').textContent=game.phase==='binding'?'PROPOSE A BINDING':'READY TO TEST';}
function showLatest(){if(game.status==='won'){showVictory();return;}const eye=game.eye(selectedEye),last=eye.experiments.at(-1);if(last)showExperiment(last,false);else builderChanged();}
function setFocus(eyeId){selectedEye=eyeId;render();showLatest();persist();}
function showExperiment(experiment,animate=true){
  previewSignal(experiment);$('machine-stage').dataset.result=experiment.accepted?'pass':'fail';$('output-symbol').textContent=experiment.accepted?'✓':'×';$('output-label').textContent=experiment.accepted?'SIGNAL ACCEPTED':'SIGNAL REJECTED';
  if(animate){scene.pulse(experiment.accepted);$('machine-stage').classList.remove('signal-ping');void $('machine-stage').offsetWidth;$('machine-stage').classList.add('signal-ping');}
}
function resetCase(seed=newSeed()){
  game=new VeilGame({seed,durationMs});selectedEye='heart';feed=[];theorySignature='';recovered=false;
  $('recovery-banner').hidden=true;$('seed-input').value=seed;
  const url=new URL(location.href);url.searchParams.delete('case');history.replaceState(null,'',url.pathname+url.search);
  claim();render();builderChanged();persist();
}
function dispatch(text,actor,local=false){
  const result=game.process(text,actor);
  if(result.kind==='ignored')return result;
  if(result.kind==='error'){if(local)toast(result.message,true);render();persist();return result;}
  if(result.kind==='focus'){if(local){selectedEye=result.eyeId;toast(result.message);}render();persist();return result;}
  feed.unshift({...result,actor,simulated:caseSource==='practice'});feed=feed.slice(0,3);
  if(result.kind==='test'&&result.eyeId===selectedEye)showExperiment(result.experiment);
  if(local&&result.kind==='test')toast(`${game.eye(result.eyeId).name}: signal ${result.experiment.accepted?'accepted':'rejected'}. Evidence recorded.`);
  if(local&&result.kind==='bindingVote')toast('Your binding proposal is in. The host can commit the leading signal.');
  render();persist();return result;
}

function renderEyeTabs(snapshot){for(const eye of snapshot.eyes){const button=eyeButtons.get(eye.id);button.classList.toggle('active',selectedEye===eye.id);button.classList.toggle('sealed',eye.sealed);button.setAttribute('aria-pressed',String(selectedEye===eye.id));button.setAttribute('aria-label',`Inspect ${eye.name} eye${eye.sealed?', sealed':''}`);button.querySelector('.eye-mark').textContent=eye.sealed?'✓':eye.mark;button.querySelector('.eye-progress').textContent=eye.sealed?'SEALED':`${eye.experiments.length} / 6 tests`;}}
function renderTheories(s){
  const eye=s.eyes.find(e=>e.id===selectedEye),running=s.status==='running',binding=s.phase==='binding',ended=['won','lost'].includes(s.status);
  $('theory-eye').textContent=binding?'Bind the five discoveries':`${eye.name}’s hidden rule`;
  $('theory-help').textContent=binding?'Contributors propose one signal that satisfies all five revealed rules.':eye.sealed?'This eye’s rule is known. Investigate another eye to complete the constellation.':mode==='practice'?'Contribute a test at this eye, then select a theory to vote.':'Test this eye before voting. Select a theory to copy its Twitch command.';
  if(ended)$('theory-help').textContent=s.status==='won'?'The community united all five discoveries. This is the completed constellation.':'The encounter has ended. Review the revealed rules against your evidence.';
  $('theory-count').textContent=binding?'FINAL RITUAL':eye.sealed?'SEALED':`${eye.options.filter(o=>!o.eliminated).length} POSSIBLE`;
  $('theory-list').hidden=binding||eye.sealed||ended;$('binding-panel').hidden=!binding;$('sealed-discovery').hidden=binding||(!eye.sealed&&!ended);
  const signature=`${s.seed}:${selectedEye}:${s.phase}`;
  if(signature!==theorySignature){
    theorySignature=signature;$('theory-list').replaceChildren();
    for(const option of eye.options){const button=el('button','theory-card');button.type='button';button.dataset.option=option.id;
      const copy=el('span','theory-copy');copy.append(el('strong','',`Theory ${option.id.toUpperCase()}`),el('small','',option.description));
      const votes=el('span','theory-votes');votes.append(el('span','count','0'),el('small','','VOTES'));
      button.append(el('span','theory-letter',option.id.toUpperCase()),copy,votes);
      button.addEventListener('click',async()=>{if(mode==='twitch')await copyText(`!solve ${selectedEye} ${option.id}`,'Theory command copied. Send it in Twitch chat.');else dispatch(`!solve ${selectedEye} ${option.id}`,practiceActor(),true);});$('theory-list').append(button);
    }
  }
  const selectedVote=mode==='practice'?game.eye(selectedEye).votes.get(practiceActor().id)?.optionId:null;
  for(const option of eye.options){const button=$('theory-list').querySelector(`[data-option="${option.id}"]`);if(!button)continue;button.classList.toggle('eliminated',option.eliminated);button.classList.toggle('selected',selectedVote===option.id);button.disabled=!running||option.eliminated||eye.sealed;button.setAttribute('aria-pressed',String(selectedVote===option.id));button.setAttribute('aria-label',`Theory ${option.id.toUpperCase()}: ${option.description}${option.eliminated?' Eliminated.':''}`);button.querySelector('.count').textContent=option.eliminated?'×':option.votes;button.querySelector('.theory-votes small').textContent=option.eliminated?'OUT':'VOTES';}
  if((eye.sealed||ended)&&!binding){$('sealed-discovery').replaceChildren(el('span','seal-symbol','✧'),el('h3','',eye.sealed?`${eye.name} is sealed`:`${eye.name}’s revealed rule`),el('p','',eye.discovery),el('small','',eye.sealed?'Your community secured one piece of the final signal.':'Encounter closed. This was the rule behind the observations.'));}
  if(binding){
    $('discoveries-list').replaceChildren(...s.eyes.map(e=>{const item=el('li');item.append(el('strong','',`${e.mark} ${e.name}`),el('span','',e.discovery));return item;}));
    $('binding-candidates').replaceChildren(...(s.binding.length?s.binding.slice(0,3).map(proposal=>{const row=el('div','binding-proposal');row.append(el('code','',`${proposal.signal.color} ${proposal.signal.shape} ${proposal.signal.pulses}`),el('span','',`${proposal.votes} vote${proposal.votes===1?'':'s'}`));return row;}):[el('p','binding-empty','No proposals yet. Build the shared signal on the left, or send !bind in chat.')]));
  }
  const votes=binding?s.bindingVoteTotal:eye.voteTotal;$('vote-summary').textContent=votes?`${votes} CONTRIBUTOR${votes===1?'':'S'} VOTED`:'NO CONTRIBUTOR VOTES';
  const next=eye.sealed&&!binding;
  $('lock-button').replaceChildren(document.createTextNode(next?'Investigate another eye':binding?'Bind the domain':`Seal ${eye.name}’s leading theory`),el('span','','↗'));
  $('lock-button').disabled=next?false:!running||!votes;
}
function renderEvidence(s){
  const filter=$('journal-filter').value,experiments=s.experiments.filter(e=>filter==='all'||e.eyeId===filter);
  $('evidence-empty').hidden=experiments.length>0;$('evidence-table-wrap').hidden=!experiments.length;
  $('evidence-summary').textContent=`${experiments.length} OBSERVATION${experiments.length===1?'':'S'}`;
  $('evidence-body').replaceChildren(...experiments.toReversed().map(e=>{const row=el('tr'),signal=el('td'),description=el('span','signal-cell');description.append(el('span',`shape-dot ${e.color} ${e.shape}`),document.createTextNode(`${e.color} ${e.shape} · ${e.pulses}`));signal.append(description);const result=el('td');result.append(el('span',`result-tag${e.accepted?'':' fail'}`,e.accepted?'✓ PASS':'× FAIL'));row.append(el('td','',String(e.sequence).padStart(2,'0')),el('td','',game.eye(e.eyeId).name),signal,el('td','',e.name),result);return row;}));
}
function renderFeed(){
  $('feed-empty').hidden=feed.length>0;
  $('feed-list').replaceChildren(...feed.map(item=>{const row=el('li','feed-item'),author=el('div','feed-author');author.append(el('span','feed-avatar',item.actor.name.slice(0,1).toUpperCase()),document.createTextNode(item.actor.name),el('small','',item.simulated?'SAMPLE':'TWITCH'));row.append(author,el('code','',item.command||item.kind),el('div','feed-outcome',item.kind==='test'?`${game.eye(item.eyeId).name} · ${item.experiment.accepted?'accepted':'rejected'}`:item.kind==='vote'?`Voted at ${game.eye(item.eyeId).name}`:'Proposed a shared binding signal'));return row;}));
}
function renderClock(){const seconds=Math.ceil(game.remainingMs/1000);const text=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;$('timer').textContent=text;$('timer').classList.toggle('timer-urgent',seconds<=30&&game.status!=='idle');scene.updateClock(game.remainingMs,game.durationMs,text);}
function render(){
  const s=game.snapshot(),connected=mode==='twitch'&&connection.state==='connected',running=s.status==='running',ended=['won','lost'].includes(s.status),eye=s.eyes.find(e=>e.id===selectedEye);
  scene.setProgress(s.eyes,selectedEye,s.phase);scene.setState(s.status);renderClock();
  $('seal-count').textContent=s.sealedCount;$('researcher-count').textContent=String(s.participants).padStart(2,'0');$('strike-count').textContent=Array.from({length:3},(_,i)=>i<s.strikes?'●':'○').join(' ');$('strike-count').setAttribute('aria-label',`${s.strikes} of 3 fractures`);
  $('case-label').textContent=`CASE / ${s.seed.toUpperCase()}`;$('seed-input').value=s.seed;$('seed-input').disabled=running||s.status==='paused';$('load-case-button').disabled=running||s.status==='paused';$('case-duration').value=String(durationMs);$('case-duration').disabled=running||s.status==='paused';$('reset-case-button').disabled=s.status==='idle';
  $('start-button').replaceChildren(document.createTextNode(ended?'New encounter':running?'Pause encounter':s.status==='paused'?'Resume encounter':connected?'Start live encounter':'Start practice'),el('span','',running?'Ⅱ':'↗'));
  $('start-button').disabled=mode==='twitch'&&!connected;
  $('machine-status').textContent=ended?'ENCOUNTER CLOSED':s.status==='paused'?'TIME SUSPENDED':s.phase==='binding'?'BINDING PHASE':running?'INVESTIGATION ACTIVE':'AWAITING YOUR CREW';
  $('phase-instruction').textContent=s.status==='won'?'The veil is open. Five necessary discoveries became one shared signal.':s.phase==='binding'?'Five eyes are sealed. Find one signal that satisfies every discovered rule.':`${s.sealedCount} of 5 eyes sealed. Each eye is necessary; share tests across the constellation.`;
  $('prep-context').textContent=s.phase==='binding'?'Combine all five discoveries into one shared signal.':`Investigating ${eye.name}. Contribute an experiment here to earn a vote.`;
  $('builder-title').textContent=s.phase==='binding'?'FINAL BINDING SIGNAL':`${eye.name.toUpperCase()} / SIGNAL PARAMETERS`;
  $('builder-mode').textContent=mode==='practice'?'REHEARSAL · SIMULATED':'COPY INTO TWITCH CHAT';$('practice-box').hidden=mode!=='practice';
  $('test-button').replaceChildren(document.createTextNode(mode==='twitch'?'Copy chat command':s.phase==='binding'?'Propose binding':`Test ${eye.name}`),el('span','','→'));
  $('test-button').disabled=mode==='practice'&&(!running||(eye.sealed&&s.phase!=='binding'));$('suggest-button').hidden=s.phase==='binding';$('suggest-button').disabled=eye.sealed||!running;
  $('sample-button').hidden=mode!=='practice';$('sample-button').disabled=!running||eye.sealed||s.phase==='binding';
  $('mode-pill').classList.toggle('live',connected);$('mode-pill').replaceChildren(el('span','status-dot'),document.createTextNode(mode==='practice'?' REHEARSAL':connected?' TWITCH CHAT':' TWITCH OFFLINE'));
  $('mode-description').textContent=mode==='practice'?'Local practice · simulated contributors':connected?`@${connection.channel} · ${channelDescription(connection.info)}`:connection.message;
  $('feed-source').textContent=caseSource==='practice'?'REHEARSAL · SIMULATED CHAT':`TWITCH · @${savedChannel||'reconnect'}`;
  $('connect-label').textContent=connected?`@${connection.channel}`:connection.state==='connecting'?'Connecting…':'Connect Twitch';document.querySelector('.connection-dot').classList.toggle('live',connected);
  $('connected-details').hidden=mode==='practice';$('connected-channel').textContent=connected?`Reading commands from @${connection.channel}. Keep this window open for the stream.`:connection.message;$('connect-form').hidden=connected;
  renderEyeTabs(s);renderTheories(s);renderEvidence(s);renderFeed();updateCommand();
  $('result-panel').hidden=!ended;
  if(ended){$('result-panel').classList.toggle('lost',s.status==='lost');$('result-eyebrow').textContent=s.status==='won'?'FIVE DISCOVERIES / ONE SHARED SIGNAL':'ENCOUNTER CLOSED';$('result-title').textContent=s.status==='won'?'Your community opened the veil.':s.remainingMs===0?'The veil has closed.':'The veil has fractured.';$('result-description').textContent=`${s.endReason} ${s.experiments.length} experiments · ${s.participants} contributors · ${s.sealedCount}/5 eyes.`;$('revealed-rule').textContent=s.finalSignal?`Binding: ${s.finalSignal.color} ${s.finalSignal.shape} ${s.finalSignal.pulses}. ${caseSource==='practice'?'Rehearsal':'Local encounter'} score: ${s.score}.`:'Inspect the eyes to review the revealed rules, or start a new encounter.';}
  if(s.status==='won')showVictory();
  if(!autosaveOkay)$('save-status').textContent='Device save unavailable';
}

const twitch=new TwitchChat({onMessage:message=>dispatch(message.text,{id:`twitch:${message.id}`,name:message.name,source:'twitch'}),onStatus:status=>{
  connection=status;
  if(status.state==='connected'){
    if(caseSource!=='twitch'||(savedChannel&&savedChannel!==status.channel)){caseSource='twitch';mode='twitch';savedChannel=status.channel;resetCase();}
    mode=caseSource='twitch';savedChannel=status.channel;claim();persist();$('recovery-banner').hidden=true;
    toast(`Connected to @${status.channel}. Start or resume, then ask chat to investigate an eye.`);if($('connect-dialog').open)$('connect-dialog').close();
  }else if(['connecting','reconnecting','error'].includes(status.state)){mode='twitch';game.pause();if(status.state==='error'){toast(status.message,true);$('connect-error').textContent=status.message;$('connect-error').hidden=false;}}
  render();persist();
}});

function startOrPause(){if(mode==='twitch'&&connection.state!=='connected'){toast('Reconnect your Twitch channel before continuing.',true);return;}claim();if(game.status==='idle')game.start();else if(game.status==='running')game.pause();else if(game.status==='paused')game.resume();else{resetCase();game.start();}$('recovery-banner').hidden=true;render();persist();}
$('start-button').addEventListener('click',startOrPause);
$('new-case-button').addEventListener('click',()=>{resetCase();startOrPause();$('workbench').scrollIntoView({block:'start',behavior:'smooth'});});
$('reset-case-button').addEventListener('click',()=>{resetCase();toast('A new constellation is ready. Choose a timer, then begin.');});
$('load-case-button').addEventListener('click',()=>{try{resetCase($('seed-input').value.trim());toast('Case loaded. The same code always creates the same constellation.');}catch(error){toast(error.message,true);}});
$('case-duration').addEventListener('change',()=>{if(!['idle','won','lost'].includes(game.status))return;const value=Number($('case-duration').value);if(![180000,300000,480000,720000].includes(value))return;durationMs=value;resetCase(game.seed);});
for(const id of ['signal-color','signal-shape','signal-pulses'])$(id).addEventListener('change',builderChanged);
$('practice-actor').addEventListener('change',render);
$('journal-filter').addEventListener('change',()=>renderEvidence(game.snapshot()));
$('suggest-button').addEventListener('click',()=>{const signal=game.suggest(selectedEye);if(!signal){toast('The remaining theories no longer need separating. Compare the journal and vote.');return;}for(const [key,value]of Object.entries(signal))$(`signal-${key}`).value=String(value);builderChanged();toast('This test separates remaining theories using public evidence. It has not been sent.');});
$('test-button').addEventListener('click',async()=>{const command=$('command-preview').textContent;if(mode==='twitch'){await copyText(command,'Command copied. Send it in Twitch chat.');return;}dispatch(command,practiceActor(),true);});
$('sample-button').addEventListener('click',()=>{const eye=game.eye(selectedEye);const signal=game.suggest(selectedEye)||SIGNALS.find(s=>!eye.experiments.some(e=>e.key===signalKey(s)));if(!signal)return;const keys=['mira','ash','sol','nora'];const key=keys[sampleIndex++%keys.length];dispatch(`!test ${selectedEye} ${signal.color} ${signal.shape} ${signal.pulses}`,{id:`practice:${key}`,name:ACTORS[key],source:'practice'},true);});
$('lock-button').addEventListener('click',()=>{
  if(game.phase!=='binding'&&game.eye(selectedEye).sealed){const next=game.eyes.filter(e=>!e.sealed).sort((a,b)=>a.experiments.length-b.experiments.length)[0];if(next)setFocus(next.id);return;}
  const result=game.phase==='binding'?game.commitBinding():game.lockEye(selectedEye);
  if(['error','wrong','wrongBinding'].includes(result.kind))toast(result.message,true);
  else if(result.kind==='sealed')toast(`${result.name} sealed. ${result.phase==='binding'?'All five discoveries are ready. Build the final binding signal.':'Another piece of the shared signal is known.'}`);
  else if(result.kind==='bound')toast('The veil is open. Your community found the one shared signal.');
  render();persist();if(['won','lost'].includes(game.status))$('result-panel').scrollIntoView({block:'nearest',behavior:'smooth'});
});

async function copyText(text,message){try{await navigator.clipboard.writeText(text);toast(message);}catch{toast('Clipboard unavailable. Select and copy the visible command or case code.',true);}}
$('share-case-button').addEventListener('click',()=>{const url=new URL(location.origin+location.pathname);url.searchParams.set('case',game.seed);copyText(url.href,'Replay link copied. It shares the puzzle, not your progress or Twitch sign-in.');});
$('export-button').addEventListener('click',()=>{const report={title:'Fivefold Veil',source:caseSource,channel:caseSource==='twitch'?savedChannel:null,exportedAt:new Date().toISOString(),...game.snapshot(),note:'This is a local encounter journal. Practice contributors are simulations; scores are not server-verified.'};const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const link=el('a');link.href=url;link.download=`fivefold-${game.seed}-journal.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Field journal exported. It contains no Twitch tokens.');});

for(const id of ['help-button','footer-help-button'])$(id).addEventListener('click',()=>$('help-dialog').showModal());
for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=>$(button.dataset.close).close());
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();});
$('connect-button').addEventListener('click',()=>$('connect-dialog').showModal());$('callback-url').textContent=callbackUrl();$('client-id').value=savedClientId();
$('copy-callback').addEventListener('click',()=>copyText(callbackUrl(),'Redirect URL copied. Add it to your Twitch application.'));
$('connect-form').addEventListener('submit',event=>{event.preventDefault();try{claim();persist();beginTwitchLogin($('client-id').value);}catch(error){$('connect-error').textContent=error.message;$('connect-error').hidden=false;}});
$('disconnect-button').addEventListener('click',()=>{twitch.disconnect(false);mode=caseSource='practice';savedChannel='';connection={state:'disconnected',message:'Local rehearsal · simulated contributors'};$('connect-error').hidden=true;resetCase();$('connect-dialog').close();toast('A fresh rehearsal is ready. All local contributors are simulated.');});
$('effects-button').addEventListener('click',()=>scene.setEnabled(!scene.enabled));
for(const button of document.querySelectorAll('.domain-tab[data-domain]'))button.addEventListener('click',()=>{scene.setTheme(button.dataset.domain);persist();});
function toggleStream(force){const active=typeof force==='boolean'?force:!document.body.classList.contains('stream-view');document.body.classList.toggle('stream-view',active);$('stream-button').setAttribute('aria-pressed',String(active));$('exit-stream-button').hidden=!active;if(active)toast('Capture this same browser window in OBS. Escape returns to host controls.');}
$('stream-button').addEventListener('click',()=>toggleStream());$('exit-stream-button').addEventListener('click',()=>toggleStream(false));
document.addEventListener('keydown',event=>{if(document.querySelector('dialog[open]'))return;if(event.key==='Escape')toggleStream(false);if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;if(event.key==='?')$('help-dialog').showModal();if(/^[1-5]$/.test(event.key))setFocus(EYES[Number(event.key)-1].id);});
window.addEventListener('storage',event=>{if(event.key===OWNER_KEY&&event.newValue!==tabId&&game.status==='running'){game.pause();$('recovery-banner').hidden=false;$('recovery-banner').textContent='Another window took host control. This encounter is paused; continue in one host window.';render();}});
window.addEventListener('beforeunload',()=>{persist();twitch.disconnect(false);scene.destroy();});

$('seed-input').value=game.seed;$('case-duration').value=String(durationMs);render();showLatest();
setInterval(()=>{const previous=game.status;game.tick();renderClock();if(previous!==game.status){render();persist();if(game.status==='lost')toast('The veil closed. Review the discoveries or begin another encounter.');}},250);
setInterval(()=>{if(['running','paused'].includes(game.status))persist();},5000);
if(loginError)toast(loginError,true);
if(login){twitch.connect(login.token,login.clientId);login=null;}
