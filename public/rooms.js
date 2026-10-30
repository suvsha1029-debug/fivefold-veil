import { EmojiKeyboard, signalEmoji } from './emoji-keyboard.js';
import { DomainScene } from './domain.js';
import { TeamWorlds } from './team-worlds.js';
import { getDomain } from './domains.js';
import { TwitchChat, beginTwitchLogin, consumeTwitchLogin, callbackUrl, savedClientId } from './twitch.js';

const $=id=>document.getElementById(id);
const node=(tag,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
const ids=['crown','dusk','heart','dawn','root'];
const avatars=['🦊','🦉','🐸','🐙','🦋','🐼','🐺','🐱'];
const HOST_KEY='fivefold-host-rooms-v1',GUEST_KEY='fivefold-viewer-seats-v1';
let session=null,state=null,selectedEye='heart',avatar='🦊',busy=false,polling=false,receivedAt=0,toastTimer,proofSignature='',theorySignature='',activitySignature='',connection={state:'disconnected'};
let oauth=null;try{oauth=consumeTwitchLogin();}catch(error){setTimeout(()=>toast(error.message,true),0);}
const scene=new DomainScene();
const keyboard=new EmojiKeyboard($('emoji-keyboard'),{onChange:renderKeyboard,onSubmit:()=>sendSignal()});
const worlds=new TeamWorlds({scene,getState:()=>state,getEye:()=>selectedEye,isBusy:()=>busy,vote:domain=>action('domain',{domain}),toast});
const requestId=()=>crypto.randomUUID();
function toast(message,error=false){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.toggle('error',error);$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,6000);}
function readStore(storage,key){try{return JSON.parse(storage.getItem(key)||'{}');}catch{return {};}}
function remember(value){try{const storage=value.role==='host'?localStorage:sessionStorage,key=value.role==='host'?HOST_KEY:GUEST_KEY;const data=readStore(storage,key);data[value.code]={token:value.token,role:value.role};data.last=value.code;storage.setItem(key,JSON.stringify(data));}catch{toast('This browser cannot save your seat. Keep this tab open.',true);}}
function lookup(code,role){const storage=role==='host'?localStorage:sessionStorage,key=role==='host'?HOST_KEY:GUEST_KEY;const found=readStore(storage,key)[code];return found?{code,role,token:found.token}:null;}
function joinUrl(code){const url=new URL(location.pathname,location.origin);url.searchParams.set('room',code);return url.href;}
async function api(path,{method='GET',body,token=session?.token}={}){
  const response=await fetch(`/api/rooms${path}`,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
  let data;try{data=await response.json();}catch{throw new Error('The room service could not be reached. Please retry.');}
  if(!response.ok)throw new Error(data.error||'That action could not be completed.');return data;
}
function applyState(next){
  if(state&&state.code===next.code&&next.serverNow<state.serverNow)return;
  const changed=state?.code!==next.code||state?.round!==next.round;
  state=next;receivedAt=Date.now();
  if(changed){selectedEye=state.me?.team||'heart';theorySignature=proofSignature=activitySignature='';}
  $('room-sync').replaceChildren(node('span','sync-dot'),document.createTextNode('Synced · updates every 3s'));
  $('room-banner').hidden=true;render();
}
function enter(value,next){session=value;state=null;remember(value);const url=new URL(location.pathname,location.origin);url.searchParams.set('room',value.code);if(value.role==='host')url.searchParams.set('view','host');history.replaceState(null,'',url.pathname+url.search);$('lobby').hidden=true;$('room-view').hidden=false;$('lobby-button').hidden=false;applyState(next);}
async function action(path,body){
  if(!session||busy)return null;busy=true;renderKeyboard();
  try{const response=await api(`/${session.code}/${path}`,{method:'POST',body:{...body,requestId:requestId()}});applyState(response.state);return response.result;}
  catch(error){toast(error.message,true);return null;}
  finally{busy=false;renderKeyboard();worlds.render();}
}
async function refresh(){if(!session||polling||busy)return;polling=true;try{applyState(await api(`/${session.code}`));}catch(error){$('room-sync').textContent='Connection interrupted';$('room-banner').textContent=`${error.message} Your seat is kept; reconnecting…`;$('room-banner').hidden=false;}finally{polling=false;}}

for(const emoji of avatars){const button=node('button','avatar-key',emoji);button.type='button';button.setAttribute('aria-label',`Avatar ${emoji}`);button.setAttribute('aria-pressed',String(emoji===avatar));button.addEventListener('click',()=>{avatar=emoji;for(const b of $('avatar-picker').children)b.setAttribute('aria-pressed',String(b===button));});$('avatar-picker').append(button);}
$('create-form').addEventListener('submit',async event=>{event.preventDefault();const submit=event.submitter;submit.disabled=true;try{const result=await api('',{method:'POST',token:null,body:{title:$('room-title').value,durationMs:Number($('room-duration').value)}});enter({code:result.state.code,token:result.token,role:'host'},result.state);toast('Room created. Invite your teams; your host key stays in this browser.');}catch(error){toast(error.message,true);}finally{submit.disabled=false;}});
$('join-form').addEventListener('submit',async event=>{event.preventDefault();const submit=event.submitter;submit.disabled=true;const code=$('join-code').value.trim().toUpperCase();try{const remembered=lookup(code,'member');if(remembered){const next=await api(`/${code}`,{token:remembered.token});if(next.me){enter(remembered,next);toast('Your browser seat has rejoined.');return;}}const result=await api(`/${code}/join`,{method:'POST',token:null,body:{name:$('join-name').value,avatar,team:$('join-team').value}});enter({code,token:result.token,role:'member'},result.state);toast('Welcome to the expedition. Your team ID is on your identity card.');}catch(error){toast(error.message,true);}finally{submit.disabled=false;}});
$('lobby-button').addEventListener('click',()=>{session=null;state=null;worlds.teamId=null;worlds.preview=null;worlds.render();scene.setState('paused');$('lobby').hidden=false;$('room-view').hidden=true;$('lobby-button').hidden=true;history.replaceState(null,'',location.pathname);});

function renderTeams(){
  const signature=state.teams.map(t=>`${t.eyeId}:${t.members}:${t.contributors}:${t.sealed}:${t.domain}`).join('|')+selectedEye;
  if($('team-list').dataset.signature===signature)return;$('team-list').dataset.signature=signature;
  $('team-list').replaceChildren(...state.teams.map(team=>{const button=node('button',`team-row${team.sealed?' sealed':''}`);button.type='button';button.setAttribute('aria-pressed',String(team.eyeId===selectedEye));button.setAttribute('aria-label',`Inspect ${team.name} team, ${team.members} members${team.sealed?', sealed':''}`);const copy=node('span','team-text');copy.append(node('strong','',team.name),node('small','',team.id),node('small','world-team-label',getDomain(team.domain).name));button.append(node('span','',team.sealed?'✓':team.emoji),copy,node('span','team-size',`${team.members} member${team.members===1?'':'s'}`));button.addEventListener('click',()=>{selectedEye=team.eyeId;render();});return button;}));
}
function renderKeyboard(){
  const signal=keyboard.value,binding=state?.game.phase==='binding',me=state?.me,running=state?.game.status==='running',eye=state?.game.eyes.find(e=>e.id===selectedEye);
  $('emoji-preview').textContent=signalEmoji(signal);$('emoji-command').textContent=binding?`!bind ${signal.color} ${signal.shape} ${signal.pulses}`:`!test ${selectedEye} ${signal.color} ${signal.shape} ${signal.pulses}`;
  const allowed=!!me&&running&&(binding||!eye.sealed);
  keyboard.setDisabled(!me||busy||!running);$('send-signal').disabled=!allowed||busy;$('send-signal').replaceChildren(document.createTextNode(binding?'Propose shared binding':'Send experiment'),node('span','','→'));
  $('keyboard-title').textContent=binding?'Compose the final binding.':'Compose a signal.';
  $('keyboard-hint').textContent=!me?'The host directs the ritual. Open a viewer seat to contribute, or invite your crew.':!running?'The host holds the clock. Your keyboard becomes active when the encounter runs.':binding?'Propose a signal satisfying all five discoveries. Any evidence contributor can vote.':'Help investigate any eye. A test or a correct evidence citation earns your vote there. Arrow keys select; Ctrl/Cmd + Enter sends.';
}
async function sendSignal(){if($('send-signal').disabled)return;const result=await action('command',{text:$('emoji-command').textContent});if(result){toast(result.kind==='test'?`Signal ${result.experiment.accepted?'accepted':'rejected'}. Shared evidence updated.`:'Binding proposal recorded.');if(result.kind==='test'){scene.pulse(result.experiment.accepted);}}}
$('send-signal').addEventListener('click',sendSignal);

function renderTheories(){
  const g=state.game,eye=g.eyes.find(e=>e.id===selectedEye),binding=g.phase==='binding',ended=['won','lost'].includes(g.status),running=g.status==='running';
  $('room-theory-title').textContent=binding?'The fivefold binding':`${eye.name}’s rule`;$('room-theory-count').textContent=binding?'FINAL RITUAL':eye.sealed?'SEALED':`${eye.options.filter(o=>!o.eliminated).length} POSSIBLE`;
  $('room-theory-help').textContent=ended?'The encounter is complete. Review the discoveries and shared evidence.':binding?'One signal must satisfy all five revealed rules. Two teams must contribute before the host binds.':eye.sealed?'This team secured a discovery. It becomes one constraint of the final signal.':state.isHost?'Your team votes. You seal its leading theory; ties require agreement.':state.me?.eligible.includes(selectedEye)?'Your evidence earned a voice. Choose your latest theory.':'Contribute a test, or correctly link evidence, to earn a vote at your team’s eye.';
  const showDiscovery=binding||eye.sealed||ended;
  $('room-theories').hidden=showDiscovery;$('room-discoveries').hidden=!showDiscovery;
  if(showDiscovery){
    const discoveries=binding?g.eyes:[eye];$('room-discoveries').replaceChildren(...discoveries.map(e=>{const card=node('div','sealed-discovery');card.append(node('h3','',`${e.mark} ${e.name}`),node('p','',e.discovery||'This eye’s rule remains unknown.'));return card;}));
    if(binding){const title=node('h3','','Community proposals');$('room-discoveries').append(title,...(g.binding.length?g.binding.map(p=>{const row=node('div','binding-proposal');row.append(node('code','',`${signalEmoji(p.signal)} · ${p.signal.color} ${p.signal.shape} ${p.signal.pulses}`),node('span','',`${p.votes} votes`));return row;}):[node('p','binding-empty','No binding proposals yet. Use your emoji keyboard.')]));}
  }else{
    const sig=`${state.round}:${selectedEye}`;if(sig!==theorySignature){theorySignature=sig;$('room-theories').replaceChildren(...eye.options.map(option=>{const button=node('button','theory-card');button.type='button';button.dataset.option=option.id;const copy=node('span','theory-copy');copy.append(node('strong','',`Theory ${option.id.toUpperCase()}`),node('small','',option.description));const votes=node('span','theory-votes');votes.append(node('span','count'),node('small','','VOTES'));button.append(node('span','theory-letter',option.id.toUpperCase()),copy,votes);button.addEventListener('click',async()=>{const result=await action('command',{text:`!solve ${selectedEye} ${option.id}`});if(result)toast('Your theory vote is recorded.');});return button;}));}
    for(const option of eye.options){const button=$('room-theories').querySelector(`[data-option="${option.id}"]`);button.disabled=busy||!running||option.eliminated||!state.me||!state.me.eligible.includes(selectedEye);button.classList.toggle('eliminated',option.eliminated);const chosen=state.me?.votes[selectedEye]===option.id;button.classList.toggle('selected',chosen);button.setAttribute('aria-pressed',String(chosen));button.setAttribute('aria-label',`Theory ${option.id.toUpperCase()}: ${option.description}${option.eliminated?' Eliminated.':''}`);button.querySelector('.count').textContent=option.eliminated?'×':option.votes;button.querySelector('.theory-votes small').textContent=option.eliminated?'OUT':'VOTES';}
  }
  $('host-seal').hidden=!state.isHost;$('host-seal').textContent=binding?'Bind the domain ↗':`Seal ${eye.name}’s leading theory ↗`;$('host-seal').disabled=!running||(!binding&&(!eye.voteTotal||eye.sealed))||(binding&&(!g.bindingVoteTotal||state.activeTeams<2));
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
$('host-seal').addEventListener('click',async()=>{const result=await action('control',{type:state.game.phase==='binding'?'bind':'seal',eyeId:selectedEye});if(result)toast(result.kind==='wrong'||result.kind==='wrongBinding'?result.message:result.kind==='bound'?'Your teams opened the veil.':`${selectedEye} sealed. A discovery is secured.`,['wrong','wrongBinding'].includes(result.kind));});
$('host-start').addEventListener('click',()=>action('control',{type:state.game.status==='running'?'pause':'start'}));
$('host-reset').addEventListener('click',async()=>{const result=await action('control',{type:'reset'});if(result)toast('New round. Room, member and team IDs stay the same.');});
$('switch-team-button').addEventListener('click',async()=>{const result=await action('team',{team:$('switch-team-select').value});if(result){selectedEye=state.me.team;render();toast('Your team has changed.');}});

function renderClock(){if(!state)return;const g=state.game,remaining=Math.max(0,g.remainingMs-(g.status==='running'?Date.now()-receivedAt:0)),seconds=Math.ceil(remaining/1000),text=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;scene.updateClock(remaining,g.durationMs,text);}
function render(){
  if(!state)return;const g=state.game,me=state.me,host=state.isHost,eye=g.eyes.find(e=>e.id===selectedEye),ended=['won','lost'].includes(g.status);
  $('expedition-title').textContent=state.title;$('room-code').textContent=state.code;$('room-eyebrow').textContent=`EXPEDITION ROOM / ROUND ${state.round}`;
  $('room-source').textContent=state.source;$('room-members').textContent=`${state.members.length} member${state.members.length===1?'':'s'}`;$('room-progress').textContent=`${g.sealedCount}/5 eyes sealed`;$('room-pledges').textContent=`${state.activeTeams} contributing teams · minimum 2`;$('room-fractures').textContent=`${g.strikes}/3 fractures`;
  $('host-start').hidden=!host;$('host-start').disabled=ended;$('host-start').textContent=g.status==='running'?'Hold the clock Ⅱ':g.status==='paused'?'Resume encounter ↗':'Begin encounter ↗';$('host-reset').hidden=!host;$('room-twitch-button').hidden=!host;$('viewer-seat').hidden=!host;$('viewer-seat').href=joinUrl(state.code);
  $('room-twitch-button').textContent=connection.state==='connected'?`Twitch: @${connection.channel}`:'Connect Twitch';
  $('my-name').textContent=me?.name||'Expedition host';$('my-avatar').textContent=me?.avatar||'✧';const team=me&&state.teams.find(t=>t.eyeId===me.team);
  $('my-identity').replaceChildren(node('div','',me?`MEMBER / ${me.id}`:'HOST / PRIVATE CONTROL KEY'),node('div','',team?`TEAM / ${team.id}`:`ROOM / ${state.code}`),node('div','',me?(me.source==='browser'?'Browser guest · not Twitch-verified':'Twitch host relay'):'Share the viewer link, never your host key.'));
  $('team-instruction').textContent=me?`Your team: ${team.name}. Help investigate any of the five eyes. ${me.locked?'Your team is fixed for this round.':'You may switch before contributing.'}`:'Teams can help across the constellation. At least two teams must contribute before the final binding.';
  $('switch-team').hidden=!me||me.locked;if(me&&!me.locked&&document.activeElement!==$('switch-team-select'))$('switch-team-select').value=me.team;
  worlds.render();scene.setProgress(g.eyes,selectedEye,g.phase);scene.setState(g.status);renderClock();
  $('room-eye-title').textContent=g.phase==='binding'?'The fivefold binding':`${eye.name} / domain encounter`;$('room-phase').textContent=ended?'ENCOUNTER CLOSED':g.status==='paused'?'TIME HELD':g.phase.toUpperCase();
  const last=eye.experiments.at(-1);$('room-output-symbol').textContent=g.status==='won'?'✧':last?(last.accepted?'✓':'×'):'?';$('room-output-text').textContent=g.status==='won'?'VEIL OPENED':last?(last.accepted?'ACCEPTED':'REJECTED'):'AWAITING SIGNAL';$('machine-stage').dataset.result=g.status==='won'?'pass':last?(last.accepted?'pass':'fail'):'idle';
  renderTeams();renderKeyboard();renderTheories();renderProof();
  let roster=$('member-roster');if(!roster){roster=node('div','member-roster');roster.id='member-roster';document.querySelector('.crew-identity').append(roster);}const members=state.members.filter(m=>m.team===(me?.team||selectedEye));roster.replaceChildren(node('span','','TEAM ROSTER'),...members.slice(0,8).map(m=>{const item=node('p','',`${m.avatar} ${m.name}`);item.append(node('small','',m.id));return item;}));if(!members.length)roster.append(node('p','','No one has joined this team yet.'));
  $('journal-count').textContent=`${g.experiments.length}/30 EXPERIMENTS`;$('room-journal-empty').hidden=!!g.experiments.length;$('room-journal-table').hidden=!g.experiments.length;
  $('room-evidence').replaceChildren(...g.experiments.toReversed().map(e=>{const row=node('tr');row.append(node('td','',`${e.sequence} / ${e.eyeId}`),node('td','',signalEmoji(e)),node('td','',e.name),node('td',`result-tag${e.accepted?'':' fail'}`,e.accepted?'✓ PASS':'× FAIL'));return row;}));
  const latest=state.activity[0]?.id||'';if(latest!==activitySignature){activitySignature=latest;$('room-activity').replaceChildren(...state.activity.slice(0,6).map(a=>{const row=node('li');row.append(node('strong','',`${a.avatar} ${a.name}`),document.createTextNode(` · ${a.source==='browser'?'browser guest':a.source==='twitch'?'Twitch relay':'host'}${a.team?` / ${a.team}`:''}`),node('div','',a.text));return row;}));}
  $('room-outcome').hidden=!ended;if(ended){$('room-outcome-title').textContent=g.status==='won'?'Your teams opened the veil.':g.remainingMs===0?'The veil has closed.':'The veil has fractured.';$('room-outcome-text').textContent=g.status==='won'?`${signalEmoji(g.finalSignal)} · ${g.finalSignal.color} ${g.finalSignal.shape} ${g.finalSignal.pulses}. ${g.participants} evidence contributors across ${state.activeTeams} teams.`:`${g.endReason} ${g.sealedCount}/5 discoveries secured. The host can begin a new round with the same room IDs.`;}
}

$('effects-button').addEventListener('click',()=>scene.setEnabled(!scene.enabled));
$('guide-button').addEventListener('click',()=>$('room-guide').showModal());
for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=>$(button.dataset.close).close());
$('invite-button').addEventListener('click',()=>{$('invite-url').value=joinUrl(state.code);$('invite-dialog').showModal();});
$('copy-invite').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('invite-url').value);toast('Viewer link copied. It contains no host credentials.');}catch{$('invite-url').select();toast('Select and copy the viewer link above.');}});

const twitch=new TwitchChat({onMessage:message=>{
  if(!session||!state?.isHost||!/^!(team|domain|test|solve|cite|bind|focus)\s/i.test(message.text))return;
  api(`/${session.code}/twitch`,{method:'POST',body:{text:message.text,userId:message.id,name:message.name,channel:connection.channel,requestId:requestId()}}).then(response=>{applyState(response.state);if(response.result?.kind==='test')scene.pulse(response.result.experiment.accepted);}).catch(error=>toast(error.message,true));
},onStatus:next=>{
  connection=next;$('room-twitch-status').textContent=next.message||next.state;$('room-twitch-form').hidden=next.state==='connected';$('room-twitch-disconnect').hidden=next.state!=='connected';
  if(next.state==='connected'){toast(`Twitch connected: @${next.channel}. Chat may choose teams with !team crown.`);if($('room-twitch-dialog').open)$('room-twitch-dialog').close();}
  if(['error','reconnecting'].includes(next.state)&&state?.game.status==='running'&&state?.isHost)action('control',{type:'pause'});
  if(state)render();
}});
$('room-callback').textContent=callbackUrl();$('room-client-id').value=savedClientId();
$('room-twitch-button').addEventListener('click',()=>$('room-twitch-dialog').showModal());
$('room-twitch-form').addEventListener('submit',event=>{event.preventDefault();try{remember(session);beginTwitchLogin($('room-client-id').value);}catch(error){toast(error.message,true);}});
$('room-twitch-disconnect').addEventListener('click',()=>{twitch.disconnect(false);connection={state:'disconnected'};$('room-twitch-form').hidden=false;$('room-twitch-disconnect').hidden=true;$('room-twitch-status').textContent='Disconnected. Browser teams can continue.';render();});

setInterval(()=>{if(!document.hidden)refresh();},3000);setInterval(renderClock,250);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
window.addEventListener('beforeunload',()=>{scene.destroy();twitch.disconnect(false);});
async function initialize(){
  const query=new URL(location.href).searchParams;let code=(query.get('room')||'').toUpperCase(),role=query.get('view')==='host'?'host':'member';
  if(oauth&&!code){code=readStore(localStorage,HOST_KEY).last||'';role='host';}
  if(code){$('join-code').value=code;const saved=lookup(code,role);if(saved){try{const next=await api(`/${code}`,{token:saved.token});if((role==='host'&&next.isHost)||(role==='member'&&next.me))enter(saved,next);}catch(error){toast(error.message,true);}}}
  if(oauth){if(session?.role==='host'){twitch.connect(oauth.token,oauth.clientId);oauth=null;}else{toast('Open your saved host room before reconnecting Twitch.',true);oauth=null;}}
}
initialize();

