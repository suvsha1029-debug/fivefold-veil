import { EmojiKeyboard, signalEmoji } from './emoji-keyboard.js';
import { DomainScene } from './domain.js';
import { TeamWorlds } from './team-worlds.js';
import { DomainChambers } from './chambers.js';
import { getDomain, validDomain } from './domains.js';
import { roomGuidance } from './room-guidance.js';
import { roomContentKey } from './room-render-state.js';
import { GuidedHelp } from './guided-help.js';
import { HostDesk } from './host-desk.js';
import { WitnessSeat } from './witness-seat.js';
import { Council } from './council.js';
import { DomainLounge } from './domain-lounge.js';
import { channelDescription, TwitchChat } from './twitch.js';
import { TwitchSessionClient, consumeTwitchCode } from './twitch-session-client.js';

const $=id=>document.getElementById(id);
const node=(tag,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
const ids=['crown','dusk','heart','dawn','root'];
const avatars=['🦊','🦉','🐸','🐙','🦋','🐼','🐺','🐱'];
const HOST_KEY='fivefold-host-rooms-v1',GUEST_KEY='fivefold-viewer-seats-v1';
let session=null,state=null,selectedEye='heart',avatar='🦊',busy=false,polling=false,receivedAt=0,toastTimer,proofSignature='',theorySignature='',activitySignature='',connection={state:'disconnected'};
let pendingChamber=null;
let audienceView=false;
let hostChoices={};
let contentKey='';
const twitchSession=new TwitchSessionClient();
let restoreSerial=0,twitchConfigured=null,twitchAuthBusy=false;
let oauth=null,oauthReturned=false;try{oauth=consumeTwitchCode();oauthReturned=!!oauth;}catch(error){oauthReturned=true;setTimeout(()=>toast(error.message,true),0);}
const scene=new DomainScene();
const keyboard=new EmojiKeyboard($('emoji-keyboard'),{onChange:renderKeyboard,onSubmit:()=>sendSignal()});
const worlds=new TeamWorlds({scene,getState:()=>state,getEye:()=>selectedEye,isBusy:()=>busy,vote:domain=>action('domain',{domain}),toast});
const chambers=new DomainChambers({worlds,scene,getState:()=>state,isBusy:()=>busy,tune:(domain,node)=>action('chamber',{domain,node}),toast});
const hostDesk=new HostDesk({getState:()=>state,isBusy:()=>busy,action,toast});
const witness=new WitnessSeat({getState:()=>state,isBusy:()=>busy,action,toast});
const council=new Council({getState:()=>state,isBusy:()=>busy,action,toast});
const lounge=new DomainLounge({getState:()=>state,isBusy:()=>busy,action,toast,scene,worlds});
document.querySelector('.crew-activity').after($('realm-strip'));
const guidedHelp=new GuidedHelp({getState:()=>state,scene});
const requestId=()=>crypto.randomUUID();
function toast(message,error=false){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.toggle('error',error);$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,6000);}
function readStore(storage,key){try{return JSON.parse(storage.getItem(key)||'{}');}catch{return {};}}
function remember(value){try{const storage=value.role==='host'?localStorage:sessionStorage,key=value.role==='host'?HOST_KEY:GUEST_KEY;const data=readStore(storage,key);data[value.code]={token:value.token,role:value.role};data.last=value.code;storage.setItem(key,JSON.stringify(data));}catch{toast('This browser cannot save your seat. Keep this tab open.',true);}}
function lookup(code,role){const storage=role==='host'?localStorage:sessionStorage,key=role==='host'?HOST_KEY:GUEST_KEY;const found=readStore(storage,key)[code];return found?{code,role,token:found.token}:null;}
function joinUrl(code){const url=new URL(location.pathname,location.origin);url.searchParams.set('room',code);return url.href;}
async function api(path,{method='GET',body,token=session?.token}={}){
  let response;
  try { response=await fetch(`/api/rooms${path}`,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(12000)}); }
  catch(error){throw new Error(error.name==='TimeoutError'?'The room service took too long to respond.':'Could not connect to the room service.');}
  let data;try{data=await response.json();}catch{throw new Error('The room service could not be reached. Please retry.');}
  if(!response.ok)throw Object.assign(new Error(data.error||'That action could not be completed.'),{status:response.status});return data;
}
function showRoomLoadError(error){
  const hint=error.status===404?'Check the room code or ask the host for a new invite.':'Check your connection, then try joining or watching again.';
  const message=$('room-load-error');
  message.textContent=error.message+' '+hint;
  message.hidden=false;
  message.scrollIntoView({block:'nearest'});
}
function applyState(next){
  if(state&&state.code===next.code&&next.serverNow<state.serverNow)return;
  const changed=state?.code!==next.code||state?.round!==next.round||state?.puzzleRevision!==next.puzzleRevision;
  const nextKey=roomContentKey(next),needsRender=changed||contentKey!==nextKey||!$('room-banner').hidden;
  contentKey=nextKey;
  state=next;receivedAt=Date.now();
  if(changed){selectedEye=state.me?.team||'heart';theorySignature=proofSignature=activitySignature='';hostChoices={};}
  $('room-sync').replaceChildren(node('span','sync-dot'),document.createTextNode('Synced · updates every 3s'));
  $('room-banner').hidden=true;if(needsRender)render();else renderClock();
}
function enter(value,next){
  $('room-load-error').hidden=true;
  session=value;
  state=null;busy=false;contentKey='';
  if(value.role!=='spectator')remember(value);
  audienceView=value.role==='spectator';
  const url=new URL(location.pathname,location.origin);
  url.searchParams.set('room',value.code);
  if(value.role==='host')url.searchParams.set('view','host');
  if(value.role==='spectator')url.searchParams.set('view','watch');
  const invitedLounge=new URL(location.href).searchParams.get('lounge');
  if(validDomain(invitedLounge))url.searchParams.set('lounge',invitedLounge);
  history.replaceState(null,'',url.pathname+url.search);
  $('lobby').hidden=true;
  $('room-view').hidden=false;
  $('lobby-button').hidden=false;
  applyState(next);
  if(next.canRelay&&!oauth)restoreTwitch();
  if(pendingChamber&&value.role!=='spectator'){
    chambers.open(pendingChamber);
    pendingChamber=null;
  }else if(validDomain(invitedLounge)){
    lounge.open(invitedLounge);
  }
}
async function action(path,body){
  if(!session||busy)return null;const seat=session;busy=true;render();
  try{const response=await api(`/${seat.code}/${path}`,{method:'POST',token:seat.token,body:{...body,requestId:requestId()}});if(session!==seat)return null;applyState(response.state);return response.result;}
  catch(error){if(session!==seat)return null;toast(error.message,true);chambers.reportError(error.message);lounge.reportError(error.message);return null;}
  finally{if(session===seat){busy=false;if(state)render();}}
}
async function refresh(){
  if(!session||polling||busy)return;
  const seat=session;
  polling=true;
  try{
    const next=await api(`/${seat.code}`,{token:seat.token});
    if(session===seat)applyState(next);
  }catch(error){
    if(session!==seat)return;
    if(error.status===404){$('lobby-button').click();$('join-code').value=seat.code;showRoomLoadError(error);return;}
    $('room-sync').textContent='Connection interrupted';
    $('room-banner').textContent=error.message+' Your seat is kept. Reconnecting…';
    $('room-banner').hidden=false;
  }finally{polling=false;}
}


for(const emoji of avatars){const button=node('button','avatar-key',emoji);button.type='button';button.setAttribute('aria-label',`Avatar ${emoji}`);button.setAttribute('aria-pressed',String(emoji===avatar));button.addEventListener('click',()=>{avatar=emoji;for(const b of $('avatar-picker').children)b.setAttribute('aria-pressed',String(b===button));});$('avatar-picker').append(button);}
$('create-form').addEventListener('submit',async event=>{event.preventDefault();const submit=event.submitter;submit.disabled=true;try{const result=await api('',{method:'POST',token:null,body:{title:$('room-title').value,durationMs:Number($('room-duration').value),minimumTeams:Number($('room-minimum-teams').value),controlMode:$('create-control-mode').value}});enter({code:result.state.code,token:result.token,role:'host'},result.state);toast('Room created. Invite your teams; your host key stays in this browser.');}catch(error){toast(error.message,true);}finally{submit.disabled=false;}});
$('join-form').addEventListener('submit',async event=>{event.preventDefault();const submit=event.submitter;submit.disabled=true;const code=$('join-code').value.trim().toUpperCase();try{const remembered=lookup(code,'member');if(remembered){const next=await api(`/${code}`,{token:remembered.token});if(next.me){enter(remembered,next);toast('Your browser seat has rejoined.');return;}}const result=await api(`/${code}/join`,{method:'POST',token:null,body:{name:$('join-name').value,avatar,team:$('join-team').value}});enter({code,token:result.token,role:'member'},result.state);toast('Welcome to the expedition. Your team ID is on your identity card.');}catch(error){showRoomLoadError(error);}finally{submit.disabled=false;}});
$('lobby-button').addEventListener('click',()=>{restoreSerial++;twitch.disconnect(false);connection={state:'disconnected'};session=null;state=null;lounge.render();audienceView=false;document.body.classList.remove('audience-mode');worlds.teamId=null;worlds.preview=null;worlds.render();scene.setState('paused');$('lobby').hidden=false;$('room-view').hidden=true;$('lobby-button').hidden=true;history.replaceState(null,'',location.pathname);guidedHelp.update();});

function renderTeams(){
  const signature=state.teams.map(t=>`${t.eyeId}:${t.members}:${t.contributors}:${t.sealed}:${t.domain}`).join('|')+selectedEye;
  if($('team-list').dataset.signature===signature)return;$('team-list').dataset.signature=signature;
  $('team-list').replaceChildren(...state.teams.map(team=>{const button=node('button',`team-row${team.sealed?' sealed':''}`);button.type='button';button.setAttribute('aria-pressed',String(team.eyeId===selectedEye));button.setAttribute('aria-label',`Inspect ${team.name} team, ${team.members} members${team.sealed?', sealed':''}`);const copy=node('span','team-text');copy.append(node('strong','',team.name),node('small','',team.id),node('small','world-team-label',getDomain(team.domain).name));button.append(node('span','',team.sealed?'✓':team.emoji),copy,node('span','team-size',`${team.members} member${team.members===1?'':'s'}`));button.addEventListener('click',()=>{selectedEye=team.eyeId;render();});return button;}));
}
function renderKeyboard(){
  const signal=keyboard.value,binding=state?.game.phase==='binding',me=state?.me,running=state?.game.status==='running',eye=state?.game.eyes.find(e=>e.id===selectedEye);
  $('emoji-preview').textContent=signalEmoji(signal);$('emoji-command').textContent=binding?`!bind ${signal.color} ${signal.shape} ${signal.pulses}`:`!test ${selectedEye} ${signal.color} ${signal.shape} ${signal.pulses}`;
  const hostBinding=state?.isHost&&state.controlMode==='host'&&binding;
  const pending=!!me&&state.controlMode==='host'&&!binding&&state.pendingTests?.length;
  const allowed=running&&!pending&&((!!me&&(binding||!eye.sealed))||(hostBinding&&state.activeTeams>=(state.minimumTeams??2)));
  keyboard.setDisabled((!me&&!hostBinding)||busy||!running);$('send-signal').disabled=!allowed||busy;$('send-signal').replaceChildren(document.createTextNode(hostBinding?'Bind selected signal':binding?'Propose shared binding':state?.controlMode==='host'?'Request experiment':'Send experiment'),node('span','','→'));
  $('keyboard-title').textContent=binding?'Compose the final binding.':'Compose a signal.';
  $('keyboard-hint').textContent=hostBinding?'Choose the final signal yourself. Viewer proposals are advisory; an incorrect choice adds a fracture.':pending?'Your experiment is awaiting host approval. You can withdraw it above.':!me?(state.isHost?'The host directs the ritual. Open a viewer seat to contribute, or invite your crew.':'You are watching. Join this expedition whenever you want to contribute.'):!running?'The host holds the clock. Your keyboard becomes active when the encounter runs.':binding?'Propose a signal satisfying all five discoveries. Any evidence contributor can vote.':'Help investigate any eye. A test or a correct evidence citation earns your vote there. Arrow keys select; Ctrl/Cmd + Enter sends.';
}
async function sendSignal(){if($('send-signal').disabled)return;const result=state.isHost&&state.controlMode==='host'?await action('control',{type:'bind',signal:keyboard.value}):await action('command',{text:$('emoji-command').textContent});if(result){toast(result.kind==='test'?`Signal ${result.experiment.accepted?'accepted':'rejected'}. Shared evidence updated.`:result.message||'Binding proposal recorded.');if(result.kind==='test'){scene.pulse(result.experiment.accepted);}}}
$('send-signal').addEventListener('click',sendSignal);

function renderTheories(){
  const g=state.game,eye=g.eyes.find(e=>e.id===selectedEye),binding=g.phase==='binding',director=state.isHost&&state.controlMode==='host',ended=['won','lost'].includes(g.status),running=g.status==='running';
  $('room-theory-title').textContent=binding?'The fivefold binding':`${eye.name}’s rule`;$('room-theory-count').textContent=binding?'FINAL RITUAL':eye.sealed?'SEALED':`${eye.options.filter(o=>!o.eliminated).length} POSSIBLE`;
  $('room-theory-help').textContent=ended?'The encounter is complete. Review the discoveries and shared evidence.':binding?`One signal must satisfy all five revealed rules. ${state.minimumTeams??2} team(s) must contribute before the host binds.`:eye.sealed?'This team secured a discovery. It becomes one constraint of the final signal.':director?'Select a theory yourself after an experiment. Viewer votes are advisory.':state.isHost?'Your team votes. You seal its leading theory; ties require agreement.':state.me?.eligible.includes(selectedEye)?'Your evidence earned a voice. Choose your latest theory.':'Contribute a test, or correctly link evidence, to earn a vote at your team’s eye.';
  const showDiscovery=binding||eye.sealed||ended;
  $('room-theories').hidden=showDiscovery;$('room-discoveries').hidden=!showDiscovery;
  if(showDiscovery){
    const discoveries=binding?g.eyes:[eye],key=JSON.stringify([state.code,state.round,discoveries.map(e=>[e.id,e.discovery]),binding,g.binding]);if($('room-discoveries').dataset.signature!==key){$('room-discoveries').dataset.signature=key;$('room-discoveries').replaceChildren(...discoveries.map(e=>{const card=node('div','sealed-discovery');card.append(node('h3','',`${e.mark} ${e.name}`),node('p','',e.discovery||'This eye’s rule remains unknown.'));return card;}));
    if(binding){const title=node('h3','','Community proposals');$('room-discoveries').append(title,...(g.binding.length?g.binding.map(p=>{const row=node('div','binding-proposal');row.append(node('code','',`${signalEmoji(p.signal)} · ${p.signal.color} ${p.signal.shape} ${p.signal.pulses}`),node('span','',`${p.votes} votes`));return row;}):[node('p','binding-empty','No binding proposals yet. Use your emoji keyboard.')]));}}
  }else{
    const sig=`${state.round}:${selectedEye}`;if(sig!==theorySignature){theorySignature=sig;$('room-theories').replaceChildren(...eye.options.map(option=>{const button=node('button','theory-card');button.type='button';button.dataset.option=option.id;const copy=node('span','theory-copy');copy.append(node('strong','',option.label||`Theory ${option.id.toUpperCase()}`),node('small','',option.description));const votes=node('span','theory-votes');votes.append(node('span','count'),node('small','','VOTES'));button.append(node('span','theory-letter',option.id.toUpperCase()),copy,votes);button.addEventListener('click',async()=>{if(state.isHost&&state.controlMode==='host'){hostChoices[selectedEye]=option.id;renderTheories();return;}const result=await action('command',{text:`!solve ${selectedEye} ${option.id}`});if(result)toast('Your theory vote is recorded.');});return button;}));}
    for(const option of eye.options){const button=$('room-theories').querySelector(`[data-option="${option.id}"]`);button.disabled=busy||!running||option.eliminated||(!director&&(!state.me||!state.me.eligible.includes(selectedEye)));button.classList.toggle('eliminated',option.eliminated);const chosen=(director?hostChoices[selectedEye]:state.me?.votes[selectedEye])===option.id;button.classList.toggle('selected',chosen);button.setAttribute('aria-pressed',String(chosen));button.setAttribute('aria-label',`Theory ${option.id.toUpperCase()}: ${option.description}${option.eliminated?' Eliminated.':''}`);button.querySelector('.count').textContent=option.eliminated?'×':option.votes;button.querySelector('.theory-votes small').textContent=option.eliminated?'OUT':'VOTES';}
  }
  const community=state.controlMode==='community'&&state.me&&(binding?state.me.eligible.length>0:state.me.eligible.includes(selectedEye));
  $('host-seal').hidden=!state.isHost&&!community;
  $('host-seal').textContent=binding?(director?'Bind selected signal ↗':'Confirm leading binding ↗'):director?`Seal my choice at ${eye.name} ↗`:`Confirm ${eye.name}’s leading theory ↗`;
  const choiceReady=eye.experiments.length&&eye.options.some(o=>o.id===hostChoices[selectedEye]&&!o.eliminated);
  $('host-seal').disabled=busy||!running||(!binding&&(eye.sealed||(director?!choiceReady:!eye.voteTotal)))||(binding&&((!director&&!g.bindingVoteTotal)||state.activeTeams<(state.minimumTeams??2)));
}
function renderProof(){
  const eye=state.game.eyes.find(e=>e.id===selectedEye),eligible=state.me?.eligible.includes(selectedEye),canUse=!!state.me&&state.game.status==='running';
  const theories=eye.options.filter(o=>o.eliminated),observations=eye.experiments;
  const sig=`${state.round}:${selectedEye}:${theories.map(o=>o.id).join('')}:${observations.map(e=>e.sequence).join(',')}`;
  if(proofSignature!==sig){proofSignature=sig;$('proof-theory').replaceChildren(...theories.map(o=>{const option=node('option','',`${o.id.toUpperCase()} · ${o.description}`);option.value=o.id;return option;}));$('proof-observation').replaceChildren(...observations.map(e=>{const option=node('option','',`#${e.sequence} ${signalEmoji(e)} · ${e.accepted?'PASS':'FAIL'}`);option.value=String(e.sequence);return option;}));}
  $('cite-button').disabled=busy||!canUse||!theories.length||!observations.length||eligible;$('proof-theory').disabled=!canUse||eligible;$('proof-observation').disabled=!canUse||eligible;
  $('proof-status').textContent=eligible?'✓ Evidence contribution recorded. Your vote is earned.':!state.me?'Viewer seats can interpret evidence to earn votes.':!observations.length?'This eye needs its first experiment.':!theories.length?'No theory has been contradicted yet.':'Which recorded result could this theory not explain?';
}
$('cite-button').addEventListener('click',async()=>{const result=await action('command',{text:`!cite ${selectedEye} ${$('proof-observation').value} ${$('proof-theory').value}`});if(result)toast('Evidence linked. You earned a vote without spending a test.');});
$('host-seal').addEventListener('click',async()=>{const result=await action(state.isHost?'control':'decide',{type:state.game.phase==='binding'?'bind':'seal',eyeId:selectedEye,...(state.isHost&&state.controlMode==='host'?{optionId:hostChoices[selectedEye],signal:keyboard.value}:{})});if(result)toast(result.kind==='wrong'||result.kind==='wrongBinding'?result.message:result.kind==='bound'?'Your teams opened the veil.':`${selectedEye} sealed. A discovery is secured.`,['wrong','wrongBinding'].includes(result.kind));});
$('host-start').addEventListener('click',()=>action('control',{type:state.game.status==='running'?'pause':'start'}));
$('host-reset').addEventListener('click',async()=>{const result=await action('control',{type:'reset'});if(result)toast('New round. Room, member and team IDs stay the same.');});
$('switch-team-button').addEventListener('click',async()=>{const result=await action('team',{team:$('switch-team-select').value});if(result){selectedEye=state.me.team;render();toast('Your team has changed.');}});

function renderClock(){if(!state)return;witness.tick(state.serverNow+Date.now()-receivedAt,Date.now()-receivedAt>10000);council.tick(state.serverNow+Date.now()-receivedAt,Date.now()-receivedAt>10000);const g=state.game,remaining=Math.max(0,g.remainingMs-(g.status==='running'?Date.now()-receivedAt:0)),seconds=Math.ceil(remaining/1000),text=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;scene.updateClock(remaining,g.durationMs,text);$('chamber-time').textContent=`${text} · ${g.status==='running'?'ENCOUNTER RUNNING':g.status==='paused'?'CLOCK HELD':g.status==='idle'?'AWAITING HOST':'ENCOUNTER ENDED'}`;}
function renderGuidance(){
  const g=state.game,guide=roomGuidance(state,selectedEye),eye=g.eyes.find(e=>e.id===selectedEye);
  $('next-step-title').textContent=guide.title;$('next-step-detail').textContent=guide.detail;
  $('brief-role').textContent=state.isHost?'YOUR NEXT STEP / STREAMER':state.me?'YOUR NEXT STEP / VIEWER':'WATCHING / LIVE EXPEDITION';
  const actionLabels={'host-start':g.status==='paused'?'Resume encounter →':'Begin encounter →','room-outcome':'Review the outcome →','room-theories':'Compare theories & vote →','host-seal':g.phase==='binding'?'Review final binding →':'Review leading theory →','host-desk':'Review experiment requests →','emoji-keyboard':g.phase==='binding'?'Compose the final signal →':'Compose an experiment →','proof-panel':'Link existing evidence →','team-list':'Choose another eye →','watch-join':'Join this expedition →','host-hint':'Share a helpful nudge →'};
  $('next-step-action').textContent=actionLabels[guide.target]||'Go to the next step →';$('next-step-action').disabled=busy;
  $('quick-role').textContent=state.isHost?'STREAMER · Invite viewers, connect chat if you want, then begin.':state.me?'VIEWER · Try a signal, compare the result, then vote.':'WATCHING · Follow the journal or join whenever you want.';
  $('quick-invite').hidden=!state.isHost;$('quick-play').hidden=(!state.isHost&&!state.me)||['won','lost'].includes(g.status);$('quick-play').disabled=busy;
  $('quick-status').textContent=busy?'Saving your action…':'';
  $('room-view').setAttribute('aria-busy',String(busy));
  $('round-recap').textContent=guide.recap;$('latest-evidence').textContent=guide.last;
  $('next-step-action').dataset.target=guide.target;
  $('next-step-action').hidden=!state.isHost&&!state.me||['won','lost'].includes(g.status)||(!state.isHost&&g.status!=='running');
  const trail=g.eyes.map(e=>`${e.id}:${e.sealed}:${e.options.filter(o=>!o.eliminated).length}:${state.hintRequests?.[e.id]||0}`).join('|')+selectedEye;
  if($('discovery-trail').dataset.signature!==trail){
    $('discovery-trail').dataset.signature=trail;
    $('discovery-trail').replaceChildren(...g.eyes.map(e=>{
      const requests=state.hintRequests?.[e.id]||0;
      const button=node('button','discovery-chip',`${e.sealed?'✓':e.mark} ${e.name}${requests?` · ${requests} ?`:''}`);button.type='button';
      button.setAttribute('aria-pressed',String(e.id===selectedEye));
      button.setAttribute('aria-label',`${e.name}: ${e.sealed?e.discovery:`${e.options.filter(o=>!o.eliminated).length} theories remain`}${requests?`. ${requests} nudge requests`:''}`);
      button.title=e.sealed?e.discovery:'Investigate this eye';button.addEventListener('click',()=>{selectedEye=e.id;render();});return button;
    }));
  }
  const waiting=state.hintRequests?.[selectedEye]||0,requested=state.myHintRequests?.includes(selectedEye);
  $('hint-context').textContent=state.isHost?`${eye.name} · ${waiting} nudge request${waiting===1?'':'s'}. Share help only when your crew wants it.`:requested?'Request sent. The host decides when to share help.':'Stuck? Ask for a nudge, or keep watching. Participation is optional.';
  const active=g.phase==='investigation'&&['running','paused'].includes(g.status)&&!eye.sealed;
  $('request-hint').hidden=!state.me||!active;$('request-hint').disabled=busy||requested||g.status!=='running';
  $('request-hint').textContent=requested?'Nudge requested':'Ask host for a nudge';
  $('host-hint').hidden=!state.isHost||!active;$('host-hint').disabled=busy;
  $('shared-nudge').hidden=!state.hint;$('shared-nudge-text').textContent=state.hint?.text||'';
  $('clear-hint').hidden=!state.isHost||!state.hint;$('clear-hint').disabled=busy;
  $('watch-join').hidden=!!state.me||state.isHost;
  document.body.classList.toggle('audience-mode',audienceView);
  $('audience-view').setAttribute('aria-pressed',String(audienceView));$('audience-view').textContent=audienceView?'Return to full view':'Audience view';
}
$('next-step-action').addEventListener('click',()=>{
  const target=$($('next-step-action').dataset.target);if(!target)return;
  if(target.id==='host-start'&&!target.disabled){target.click();return;}
  if(target.matches('details'))target.open=true;
  target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
  const focus=target.matches('button')?target:target.querySelector('button:not(:disabled),select:not(:disabled)');focus?.focus({preventScroll:true});
});
$('request-hint').addEventListener('click',async()=>{const r=await action('hint-request',{eyeId:selectedEye});if(r)toast(r.message);});
$('quick-play').addEventListener('click',()=>{document.querySelector('.expedition-brief').scrollIntoView({block:'center',behavior:scene.enabled?'smooth':'instant'});if(!$('next-step-action').hidden)$('next-step-action').focus({preventScroll:true});});
$('quick-invite').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(joinUrl(state.code));toast('Viewer invite copied. Share it with your crew.');}catch{$('invite-button').click();toast('Copy the viewer link from this window.');}});
function syncPerformanceButton(){const reduced=scene.motionQuery.matches,readable=document.body.classList.contains('readable-mode');$('performance-button').textContent=readable?'Reduced effects: readable mode':reduced?'Reduced effects: system setting':`Reduced effects: ${scene.enabled?'off':'on'}`;$('performance-button').setAttribute('aria-pressed',String(!scene.enabled));$('performance-button').disabled=reduced||readable;$('effects-button').disabled=reduced||readable;}
document.addEventListener('fivefold:effects-change',syncPerformanceButton);
$('performance-button').addEventListener('click',()=>{scene.setEnabled(!scene.enabled);chambers.render();});
syncPerformanceButton();
$('host-hint').addEventListener('click',()=>action('control',{type:'hint',eyeId:selectedEye}));
$('clear-hint').addEventListener('click',()=>action('control',{type:'clearHint'}));
$('audience-view').addEventListener('click',()=>{audienceView=!audienceView;renderGuidance();guidedHelp.update();});
$('watch-room').addEventListener('click',async()=>{
  const code=$('join-code').value.trim().toUpperCase();$('watch-room').disabled=true;
  try{enter({code,role:'spectator',token:null},await api(`/${code}`,{token:null}));}catch(error){showRoomLoadError(error);}finally{$('watch-room').disabled=false;}
});
$('watch-join').addEventListener('click',()=>{const code=state.code;$('lobby-button').click();$('join-code').value=code;document.body.classList.add('invited-view');$('join-name').focus();});
function render(){
  if(!state)return;const g=state.game,me=state.me,host=state.isHost,eye=g.eyes.find(e=>e.id===selectedEye),ended=['won','lost'].includes(g.status);
  $('expedition-title').textContent=state.title;$('room-code').textContent=state.code;$('room-eyebrow').textContent=`EXPEDITION ROOM / ROUND ${state.round}`;
  $('room-source').textContent=state.twitchChannel?state.source+' · '+channelDescription(state.channelInfo):state.source;$('room-members').textContent=`${state.members.length} member${state.members.length===1?'':'s'}`;$('room-progress').textContent=`${g.sealedCount}/5 eyes sealed`;$('room-pledges').textContent=`${state.activeTeams} contributing teams · minimum ${state.minimumTeams??2}`;$('room-fractures').textContent=`${g.strikes}/3 fractures`;
  $('host-start').hidden=!host;$('host-start').disabled=busy||ended;$('host-start').textContent=g.status==='running'?'Hold the clock Ⅱ':g.status==='paused'?'Resume encounter ↗':'Begin encounter ↗';$('host-reset').hidden=!host;$('host-reset').disabled=busy;$('room-twitch-button').hidden=!host;$('viewer-seat').hidden=!host;$('viewer-seat').href=joinUrl(state.code);
  $('room-twitch-button').textContent=connection.state==='connected'?`Twitch: @${connection.channel}`:'Connect Twitch';
  $('my-name').textContent=me?.name||(host?'Expedition host':'Watching the expedition');$('my-avatar').textContent=me?.avatar||'✧';const team=me&&state.teams.find(t=>t.eyeId===me.team);
  $('my-identity').replaceChildren(node('div','',me?`MEMBER / ${me.id}`:host?'HOST / PRIVATE CONTROL KEY':'WATCHING / NO VIEWER SEAT'),node('div','',team?`TEAM / ${team.id}`:`ROOM / ${state.code}`),node('div','',me?(me.source==='browser'?'Browser guest · not Twitch-verified':'Twitch host relay'):host?'Share the viewer link, never your host key.':'Join only if you want to contribute.'));
  $('team-instruction').textContent=me?`Your team: ${team.name}. Help investigate any of the five eyes. ${me.locked?'Your team is fixed for this round.':'You may switch before contributing.'}`:`Teams can help at every eye. ${state.minimumTeams??2} contributing team(s) required for the final binding.`;
  $('switch-team').hidden=!me||me.locked;if(me&&!me.locked&&document.activeElement!==$('switch-team-select'))$('switch-team-select').value=me.team;
  worlds.render();scene.setProgress(g.eyes,selectedEye,g.phase);scene.setState(g.status);renderClock();chambers.render();
  $('room-eye-title').textContent=g.phase==='binding'?'The fivefold binding':`${eye.name} / domain encounter`;$('room-phase').textContent=ended?'ENCOUNTER CLOSED':g.status==='paused'?'TIME HELD':g.phase.toUpperCase();
  const last=eye.experiments.at(-1);$('room-output-symbol').textContent=g.status==='won'?'✧':last?(last.accepted?'✓':'×'):'?';$('room-output-text').textContent=g.status==='won'?'VEIL OPENED':last?(last.accepted?'ACCEPTED':'REJECTED'):'AWAITING SIGNAL';$('machine-stage').dataset.result=g.status==='won'?'pass':last?(last.accepted?'pass':'fail'):'idle';
  renderTeams();renderKeyboard();renderTheories();renderProof();renderGuidance();hostDesk.render();witness.render();council.render();lounge.render();
  guidedHelp.update();
  $('room-twitch-button').hidden=!state.canRelay;
  renderTwitchConnection();
  let roster=$('member-roster');if(!roster){roster=node('div','member-roster');roster.id='member-roster';document.querySelector('.crew-identity').append(roster);}const members=state.members.filter(m=>m.team===(me?.team||selectedEye)),rosterKey=JSON.stringify([state.code,members]);if(roster.dataset.signature!==rosterKey){roster.dataset.signature=rosterKey;roster.replaceChildren(node('span','','TEAM ROSTER'),...members.slice(0,8).map(m=>{const item=node('p','',`${m.avatar} ${m.name}`);item.append(node('small','',m.id));return item;}));if(!members.length)roster.append(node('p','','No one has joined this team yet.'));}
  $('journal-count').textContent=`${g.experiments.length}/30 EXPERIMENTS`;$('room-journal-empty').hidden=!!g.experiments.length;$('room-journal-table').hidden=!g.experiments.length;
  const journalKey=JSON.stringify([state.code,state.round,g.experiments]);if($('room-evidence').dataset.signature!==journalKey){$('room-evidence').dataset.signature=journalKey;$('room-evidence').replaceChildren(...g.experiments.slice().reverse().map(e=>{const row=node('tr');row.append(node('td','',`${e.sequence} / ${e.eyeId}`),node('td','',signalEmoji(e)),node('td','',e.name),node('td',`result-tag${e.accepted?'':' fail'}`,e.accepted?'✓ PASS':'× FAIL'));return row;}));}
  const latest=state.activity[0]?.id||'';if(latest!==activitySignature){activitySignature=latest;$('room-activity').replaceChildren(...state.activity.slice(0,6).map(a=>{const row=node('li');row.append(node('strong','',`${a.avatar} ${a.name}`),document.createTextNode(` · ${a.source==='browser'?'browser guest':a.source==='twitch'?'Twitch relay':'host'}${a.team?` / ${a.team}`:''}`),node('div','',a.text));return row;}));}
  $('room-outcome').hidden=!ended;if(ended){$('room-outcome-title').textContent=g.status==='won'?'Your teams opened the veil.':g.remainingMs===0?'The veil has closed.':'The veil has fractured.';$('room-outcome-text').textContent=g.status==='won'?`${signalEmoji(g.finalSignal)} · ${g.finalSignal.color} ${g.finalSignal.shape} ${g.finalSignal.pulses}. ${g.participants} evidence contributors across ${state.activeTeams} teams.`:`${g.endReason} ${g.sealedCount}/5 discoveries secured. The host can begin a new round with the same room IDs.`;}
}

$('effects-button').addEventListener('click',()=>{scene.setEnabled(!scene.enabled);chambers.render();});
$('guide-button').addEventListener('click',()=>$('room-guide').showModal());
for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=>$(button.dataset.close).close());
$('invite-button').addEventListener('click',()=>{$('invite-url').value=joinUrl(state.code);$('invite-dialog').showModal();});
$('copy-invite').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('invite-url').value);toast('Viewer link copied. It contains no host credentials.');}catch{$('invite-url').select();toast('Select and copy the viewer link above.');}});

const twitch=new TwitchChat({sessionClient:twitchSession,onMessage:message=>{
  if(!session||!state?.canRelay||(!state.isHost&&/^!spotlight\s/i.test(message.text))||!(/^!(team|domain|tune|test|solve|cite|bind|focus|hint|seal|spotlight|back|opinion|memevote)\s/i.test(message.text)||/^!confirmbind$/i.test(message.text.trim())))return;
  const seat=session;api(`/${seat.code}/twitch`,{method:'POST',token:seat.token,body:{text:message.text,userId:message.id,name:message.name,messageId:message.messageId,sentAt:message.sentAt,channel:connection.channel,requestId:requestId()}}).then(response=>{if(session!==seat)return;applyState(response.state);if(response.result?.kind==='test')scene.pulse(response.result.experiment.accepted);}).catch(error=>{if(session===seat)toast(error.message,true);});
},onModeration:event=>{
  if(!session||!state?.canRelay)return;const seat=session;
  if(state.council?.event)api(`/${seat.code}/council-moderation`,{method:'POST',token:seat.token,body:{...event,channel:connection.channel,requestId:requestId()}}).then(response=>{if(session===seat)applyState(response.state);}).catch(()=>{if(session===seat)toast('Council moderation could not sync. The event host can cancel the round if needed.',true);});
  if(!state.isHost)return;
  api(`/${seat.code}/witness-moderation`,{method:'POST',token:seat.token,body:{...event,requestId:requestId()}}).then(response=>{if(session===seat)applyState(response.state);}).catch(()=>{if(session!==seat)return;toast('Chat moderation could not sync. Turning off spotlights; reconnect before using them.',true);action('witness',{type:'enable',enabled:false});});
},onStatus:next=>{
  connection=next;renderTwitchConnection();
  if(next.state==='connected'){const seat=session;toast(`Twitch connected: @${next.channel}. Council commands: !back crown 1, !opinion a your reason, !memevote m1.`);if(session&&state?.canRelay)api(`/${session.code}/council`,{method:'POST',body:{type:'connect',channel:next.channel,info:next.info,requestId:requestId()}}).then(response=>{if(session===seat)applyState(response.state);}).catch(error=>{if(session===seat)toast(error.message,true);});if($('room-twitch-dialog').open)$('room-twitch-dialog').close();}
  if(['error','reconnecting'].includes(next.state)&&state?.game.status==='running'&&state?.isHost)action('control',{type:'pause'});
  if(state)render();
}});
function renderTwitchConnection(){
  const restoring=['restoring','connecting','reconnecting'].includes(connection.state);
  const working=restoring||twitchAuthBusy;
  const connected=connection.state==='connected';
  const message=twitchAuthBusy?'Opening Twitch sign-in…':connection.message||(connected?`Connected to @${connection.channel}`:'Twitch is optional. Connect your channel to receive chat commands.');
  $('room-twitch-status').textContent=message;
  $('room-twitch-status').setAttribute('aria-busy',String(working));
  $('room-twitch-live').hidden=!state?.canRelay;
  $('room-twitch-live').textContent=connected?`Twitch chat connected · @${connection.channel} · saved sign-in`:`Twitch chat · ${message}`;
  $('room-twitch-live').dataset.state=connection.state;
  $('room-twitch-button').textContent=connected?`Twitch: @${connection.channel}`:working?'Twitch: connecting…':connection.state==='error'?'Reconnect Twitch':'Connect Twitch';
  $('room-twitch-form').hidden=connected||restoring||twitchConfigured===false;
  $('room-twitch-form').querySelector('button').disabled=twitchAuthBusy;
  $('room-twitch-retry').hidden=connection.state!=='error'||working||twitchConfigured===false;
  $('room-twitch-disconnect').hidden=!connected&&connection.state!=='error';
}
async function restoreTwitch(){
  if(!session||!state?.canRelay)return;
  const serial=++restoreSerial,seat=session;
  twitch.disconnect(false);connection={state:'restoring',message:'Restoring saved Twitch sign-in…'};renderTwitchConnection();
  try{
    const saved=await twitchSession.request('status');
    if(serial!==restoreSerial||session!==seat)return;
    twitchConfigured=saved.configured;
    if(!saved.configured){connection={state:'disconnected',message:'Saved Twitch sign-in is not configured yet. Browser teams can still play.'};renderTwitchConnection();return;}
    if(!saved.connected){connection={state:'disconnected',message:'Connect your Twitch channel once. This browser can restore it after a refresh.'};renderTwitchConnection();return;}
    await twitch.connect(null,saved.clientId);
  }catch(error){if(serial===restoreSerial&&session===seat){connection={state:'error',message:error.message};renderTwitchConnection();}}
}
$('room-twitch-button').addEventListener('click',()=>$('room-twitch-dialog').showModal());
$('room-twitch-retry').addEventListener('click',restoreTwitch);
$('room-twitch-form').addEventListener('submit',async event=>{event.preventDefault();if(twitchAuthBusy||!session||!state?.canRelay)return;const seat=session,serial=++restoreSerial;twitchAuthBusy=true;renderTwitchConnection();try{remember(seat);sessionStorage.setItem('fivefold-twitch-return',JSON.stringify({code:seat.code,role:seat.role}));const url=await twitchSession.start();if(session===seat&&serial===restoreSerial)location.assign(url);}catch(error){if(session===seat&&serial===restoreSerial)toast(error.message,true);}finally{twitchAuthBusy=false;renderTwitchConnection();}});
$('room-twitch-disconnect').addEventListener('click',async()=>{++restoreSerial;twitch.disconnect(false);const button=$('room-twitch-disconnect');button.disabled=true;try{await twitchSession.request('disconnect',{});connection={state:'disconnected',message:'Disconnected and saved sign-in removed. Browser teams can continue.'};}catch{connection={state:'error',message:'Chat stopped, but saved sign-in could not be removed. Retry Disconnect when online.'};}finally{button.disabled=false;renderTwitchConnection();if(state)render();}});

setInterval(()=>{if(!document.hidden)refresh();},3000);setInterval(()=>{if(!document.hidden)renderClock();},250);
document.addEventListener('visibilitychange',()=>{chambers.render();if(!document.hidden)refresh();});
window.addEventListener('beforeunload',()=>{scene.destroy();lounge.destroy();twitch.disconnect(false);});
async function initialize(){
  const query=new URL(location.href).searchParams;let code=(query.get('room')||'').toUpperCase(),role=query.get('view')==='host'?'host':'member';
  if(ids.includes(query.get('team')))$('join-team').value=query.get('team');
  if(query.get('chamber')==='1'&&validDomain(query.get('domain')))pendingChamber=query.get('domain');
  if(oauthReturned&&!code){let back;try{back=JSON.parse(sessionStorage.getItem('fivefold-twitch-return')||'null');}catch{}code=back?.code||readStore(localStorage,HOST_KEY).last||'';role=back?.role||'host';sessionStorage.removeItem('fivefold-twitch-return');}
  if(code){$('join-code').value=code;document.body.classList.add('invited-view');if(query.get('view')==='watch'){try{enter({code,role:'spectator',token:null},await api(`/${code}`,{token:null}));}catch(error){showRoomLoadError(error);}return;}const saved=lookup(code,role);if(saved){try{const next=await api(`/${code}`,{token:saved.token});if((role==='host'&&next.isHost)||(role==='member'&&next.me))enter(saved,next);}catch(error){showRoomLoadError(error);}}}
  if(oauth){const code=oauth;oauth=null;if(state?.canRelay){const seat=session;connection={state:'restoring',message:'Completing secure Twitch sign-in…'};renderTwitchConnection();try{await twitchSession.request('exchange',code);if(session===seat)await restoreTwitch();}catch(error){if(session===seat){connection={state:'error',message:error.message};renderTwitchConnection();}}}else{toast('Open your saved host or captain seat before reconnecting Twitch.',true);}}
}
initialize();

