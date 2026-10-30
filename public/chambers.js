import { DOMAINS, getDomain } from './domains.js';
import { CHAMBERS } from './chamber-engine.js';

const $=id=>document.getElementById(id);
const el=(tag,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
const drawings={
  pine:'<path d="M25 87V40M54 88V20M78 88V51" stroke="#b9ddd2" stroke-width="3"/><path d="M25 22L10 48H17L5 68H45L33 48H40ZM54 4L32 42H42L24 72H84L66 42H76ZM78 33L63 58H69L59 76H97L87 58H93Z" fill="#326c69" stroke="#c8eee8" stroke-width="1.5"/><path d="M14 48H34M36 42H70M31 70H78" stroke="#d9f8ef" stroke-width="3"/>',
  pool:'<ellipse cx="50" cy="65" rx="43" ry="20" fill="#14384f" stroke="#a9daed" stroke-width="3"/><ellipse cx="50" cy="64" rx="28" ry="11" fill="none" stroke="#d8f0ff"/><ellipse cx="50" cy="64" rx="14" ry="5" fill="none" stroke="#d8f0ff"/><path d="M50 10V41M35 26H65" stroke="#e7ecff" stroke-width="2"/>',
  cairn:'<path d="M12 85L20 68H78L88 85ZM25 63L32 44H68L76 63ZM37 39L43 22H59L65 39Z" fill="#4d6772" stroke="#c2e3e9" stroke-width="2"/><path d="M50 6V21M43 13H57" stroke="#f8d994" stroke-width="3"/>',
  moon:'<path d="M63 10A37 37 0 1 0 84 72L64 65L67 51L53 40L66 30Z" fill="#592e69" stroke="#f2b8df" stroke-width="2"/><path d="M23 30L42 40L31 52L45 70L30 83" fill="none" stroke="#ff667e" stroke-width="3"/>',
  lens:'<path d="M50 7L91 50L50 93L9 50Z" fill="#3b2159" stroke="#e6a2e0" stroke-width="2"/><path d="M50 25L74 50L50 75L26 50Z" fill="#8c335e" stroke="#ffb6c2"/><circle cx="50" cy="50" r="8" fill="#ff658c"/><path d="M5 20L20 30M80 70L95 80" stroke="#e9b4fa"/>',
  planet:'<path d="M48 10A40 40 0 0 0 15 73L41 60L33 43L51 32ZM58 12L59 35L45 47L55 64L23 83A40 40 0 1 0 58 12" fill="#6d345c" stroke="#ee9cc4" stroke-width="2"/><path d="M7 75L25 63M72 18L90 8" stroke="#ff6e7f" stroke-width="3"/>',
  mirror:'<circle cx="50" cy="43" r="29" fill="#b9cedf" fill-opacity=".2" stroke="#e7ecff" stroke-width="3"/><path d="M23 43H77M50 15V71M25 88H75M39 72L33 87M61 72L67 87" stroke="#e7ecff" stroke-width="2"/><circle cx="50" cy="43" r="12" fill="#d8efff" fill-opacity=".5"/>',
  arch:'<path d="M14 88V40A36 36 0 0 1 86 40V88H69V42A19 19 0 0 0 31 42V88Z" fill="#567b92" stroke="#c0e5ff" stroke-width="2"/><path d="M6 91H94M14 48H30M70 48H86M50 6V23" stroke="#d9f1ff" stroke-width="2"/>',
  flame:'<path d="M50 6C60 29 80 39 70 57C89 51 91 79 66 85H34C8 72 18 50 32 40C24 63 48 58 43 42C39 30 51 20 50 6Z" fill="#ef9b41" stroke="#ffddb3" stroke-width="2"/><path d="M21 88H79M30 94H70" stroke="#dabd89" stroke-width="4"/>',
  temple:'<path d="M8 90V76H22V60H34V43H42V25H58V43H66V60H78V76H92V90Z" fill="#85553e" stroke="#f0c995" stroke-width="2"/><path d="M44 90V75H46V60H48V43H52V60H54V75H56V90" fill="#dda861"/><circle cx="50" cy="12" r="7" fill="#ffd18a"/>',
  ice:'<path d="M9 82L21 35L38 52L52 9L73 51L88 34L95 84L52 94Z" fill="#43809c" stroke="#c3eaff" stroke-width="2"/><path d="M52 9V94M21 35L52 94L88 34M38 52L52 65L73 51" fill="none" stroke="#ade6f7"/>',
  mountain:'<path d="M5 89L40 15L59 52L72 28L98 89Z" fill="#41627a" stroke="#d4e8f3" stroke-width="2"/><path d="M26 45L40 15L54 43L43 39L36 48ZM62 50L72 28L82 51L71 47Z" fill="#deebf3"/><path d="M5 90H98" stroke="#e9c88c" stroke-width="3"/>',
  star:'<path d="M50 4L61 37L94 50L61 62L50 96L38 62L5 50L38 37Z" fill="#746ca0" stroke="#e0d8ff" stroke-width="2"/><circle cx="50" cy="50" r="10" fill="#e9e2ff"/>',
  sail:'<path d="M50 8V79M46 13L15 68H46ZM56 25L84 68H56Z" fill="#737baf" stroke="#d9d3ff" stroke-width="2"/><path d="M10 80Q50 99 90 80L78 92H24Z" fill="#4b5282" stroke="#c4c3f0"/><path d="M7 98H92" stroke="#8ca1de"/>',
  beacon:'<path d="M33 90L42 39H58L67 90ZM35 39V24L50 11L65 24V39Z" fill="#656293" stroke="#ddd3ff" stroke-width="2"/><path d="M48 47V86M8 23L28 29M72 29L92 23M50 1V8" stroke="#ddd3ff" stroke-width="3"/><circle cx="50" cy="29" r="6" fill="#e6d8ff"/>',
};
const icon=kind=>`<svg viewBox="0 0 100 100" aria-hidden="true">${drawings[kind]||drawings.star}</svg>`;

export class DomainChambers {
  constructor({worlds,scene,getState,isBusy,tune,toast}){
    Object.assign(this,{worlds,scene,getState,isBusy,tune,toast});this.selected=0;this.key='';this.signature='';this.tiles=new Map();this.landmarks=[];
    $('enter-chamber').addEventListener('click',()=>this.open());$('domain-enter-chamber').addEventListener('click',()=>this.open(this.worlds.selection));
    const share=el('button','outline-button chamber-share','Copy room link ↗');share.type='button';$('chamber-close').before(share);share.addEventListener('click',async()=>{const state=this.getState(),team=this.team();if(!state||!team)return;const url=new URL(location.pathname,location.origin);url.searchParams.set('room',state.code);url.searchParams.set('team',team.eyeId);url.searchParams.set('domain',this.domain);url.searchParams.set('chamber','1');try{await navigator.clipboard.writeText(url.href);share.textContent='Room link copied ✓';}catch{this.feedback.textContent='Clipboard unavailable. Use Invite team in the investigation; choose this domain after joining.';}});
    $('chamber-close').addEventListener('click',()=>$('chamber-dialog').close());
    $('chamber-dialog').addEventListener('close',()=>this.leave());
    $('chamber-dialog').addEventListener('keydown',event=>{if(/^[123]$/.test(event.key)&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();this.selected=Number(event.key)-1;this.render();this.landmarks[this.selected]?.focus();}});
    this.feedback=el('p','chamber-feedback');this.feedback.setAttribute('role','status');$('chamber-tune').after(this.feedback);
    $('chamber-tune').addEventListener('click',async()=>{const result=await this.tune(this.domain,this.selected);if(result){this.feedback.textContent=result.message;this.feedback.dataset.error='false';this.toast(result.message);}});
    for(const domain of DOMAINS){const button=el('button','chamber-portal');button.type='button';button.dataset.domain=domain.id;const img=el('img');img.src=domain.asset;img.alt='';img.loading='lazy';button.append(img,el('span','',`${domain.symbol} ${domain.name}`),el('small'));button.addEventListener('click',()=>this.visit(domain.id));this.tiles.set(domain.id,button);$('chamber-portals').append(button);}
  }
  team(){return this.worlds.team();}
  reportError(message){if($('chamber-dialog').open){this.feedback.textContent=message;this.feedback.dataset.error='true';}}
  open(domain=this.worlds.preview||this.team()?.domain){
    if(!this.team())return;if($('domain-dialog').open)$('domain-dialog').close();this.returnWorld=this.worlds.preview;
    this.domain=domain;this.selected=0;this.key='';this.worlds.preview=domain;this.worlds.selection=domain;this.worlds.render();$('chamber-dialog').showModal();document.body.classList.add('in-chamber');this.scene.setChamberOpen(true);this.render();
  }
  visit(domain){this.domain=domain;this.selected=0;this.key='';this.worlds.preview=domain;this.worlds.selection=domain;this.worlds.render();this.render();}
  leave(){this.scene.setChamberOpen(false);if(this.emblemHome){this.emblemHome.insertBefore(this.scene.emblem,this.emblemNext);this.emblemHome=null;}document.body.classList.remove('in-chamber');this.worlds.preview=this.returnWorld;this.worlds.render();}
  createMap(place){
    $('chamber-landmarks').replaceChildren();this.landmarks=[];
    const paths=place.stations.map((s,i)=>{const next=place.stations[(i+1)%3],x=s[1]*10,y=s[2]*6,nx=next[1]*10,ny=next[2]*6,mx=(x+nx)/2,my=(y+ny)/2;return `<path data-route="${i}" d="M${x} ${y} Q${mx+(mx-500)*.4} ${my+(my-300)*.4} ${nx} ${ny}" marker-end="url(#chamber-arrow)"/>`;}).join('');
    $('chamber-routes').innerHTML=`<defs><marker id="chamber-arrow" markerWidth="6" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0 0L6 3L0 6" fill="none" stroke="currentColor"/></marker></defs>${paths}`;
    for(const [i,station]of place.stations.entries()){const button=el('button','chamber-landmark');button.type='button';button.style.left=`calc(${station[1]}% - var(--landmark-half-width))`;button.style.top=`calc(${station[2]}% - var(--landmark-half-height))`;const art=el('span','landmark-art');art.innerHTML=icon(station[3]);button.append(art,el('strong','landmark-name',`${i+1} / ${station[0]}`),el('span','landmark-phase'));button.addEventListener('click',()=>{this.selected=i;this.render();});$('chamber-landmarks').append(button);this.landmarks.push(button);}
    if(!this.emblemHome){this.emblemHome=this.scene.emblem.parentNode;this.emblemNext=this.scene.emblem.nextSibling;}
    // Reuse the original sandboxed guardian. No second iframe or renderer is created.
    $('chamber-guardian').append(this.scene.emblem);
  }
  render(){
    const state=this.getState();if(!state)return;const team=this.team();if(!team)return;
    $('enter-chamber').textContent=`Enter ${getDomain(this.worlds.preview||team.domain).name} room ↗`;
    const recovered=team.chambers.filter(c=>c.completedAt!==null).length;$('chamber-home-progress').textContent=`${recovered}/6 room memories recovered`;
    if(!$('chamber-dialog').open)return;
    const domain=getDomain(this.domain),place=CHAMBERS[domain.id],chamber=team.chambers.find(c=>c.domain===domain.id);if(!chamber)return;
    const key=`${chamber.id}`;if(key!==this.key){this.key=key;this.signature='';this.feedback.textContent='';this.selected=0;$('chamber-dialog').dataset.world=domain.id;$('chamber-landscape').style.backgroundImage=`url("${domain.asset}")`;$('chamber-name').textContent=place.title;$('chamber-description').textContent=place.intro;this.createMap(place);}
    $('chamber-id').textContent=chamber.id;$('chamber-team').textContent=`${team.emoji} ${team.name} team · ${team.members} explorer${team.members===1?'':'s'}`;
    const complete=chamber.completedAt!==null;$('chamber-dialog').dataset.complete=String(complete);$('chamber-dialog').dataset.motion=String(this.scene.enabled&&!document.hidden&&!['paused','won','lost'].includes(state.game.status));
    $('chamber-guardian').style.setProperty('--guardian-hue',domain.hue+'deg');$('chamber-status').textContent=complete?'ROOM MEMORY RECOVERED':'ECHO RELAY / MATCH ALL THREE';
    const matched=chamber.values.filter((v,i)=>v===chamber.target[i]).length;$('chamber-score').textContent=`${matched}/3 aligned · ${chamber.moves} tune${chamber.moves===1?'':'s'} · ${chamber.contributors} contributor${chamber.contributors===1?'':'s'}`;
    for(const [i,button]of this.landmarks.entries()){const match=chamber.values[i]===chamber.target[i];button.dataset.aligned=String(match);button.setAttribute('aria-pressed',String(i===this.selected));button.setAttribute('aria-label',`Inspect ${place.stations[i][0]}, phase ${chamber.values[i]+1}, target phase ${chamber.target[i]+1}${match?', aligned':''}`);button.querySelector('.landmark-phase').textContent=`${place.symbols[chamber.values[i]]} ${chamber.values[i]+1} → ${place.symbols[chamber.target[i]]} ${chamber.target[i]+1}${match?' ✓':''}`;}
    for(const path of $('chamber-routes').querySelectorAll('[data-route]'))path.classList.toggle('selected',Number(path.dataset.route)===this.selected);
    $('chamber-selected').textContent=`0${this.selected+1} / ${place.stations[this.selected][0]}`;$('chamber-current').textContent=`${place.symbols[chamber.values[this.selected]]} ${chamber.values[this.selected]+1}`;$('chamber-target').textContent=`${place.symbols[chamber.target[this.selected]]} ${chamber.target[this.selected]+1}`;
    $('chamber-link-note').textContent=`${place.verb} this ${place.object} to advance its phase AND ${place.stations[(this.selected+1)%3][0]} by one. Phases cycle 1 → 2 → 3 → 1.`;
    $('chamber-tune').textContent=complete?'Memory recovered ✓':`${place.verb} ${place.object} ↗`;$('chamber-tune').disabled=complete||!state.me||this.isBusy();$('chamber-role-note').textContent=state.me?'Your team shares these landmarks. Tuning fixes your research team for this round.':'Host view · join a viewer seat to tune. Your team members share this room.';
    $('chamber-memory').hidden=!complete;$('chamber-memory').textContent=place.memory;
    const last=chamber.lastMove;$('chamber-last').textContent=last?`${last.avatar} ${last.name} tuned ${place.stations[last.node][0]}.`:'Select a landmark, read its link, then tune. Try coordinating one landmark per teammate.';
    for(const [id,tile]of this.tiles){const c=team.chambers.find(c=>c.domain===id),done=Boolean(c&&c.completedAt!==null);tile.setAttribute('aria-pressed',String(id===domain.id));tile.setAttribute('aria-label',`Visit ${getDomain(id).name}${done?', memory recovered':''}`);tile.querySelector('small').textContent=done?'MEMORY RECOVERED ✓':`${c?.moves||0} tunes${id===team.domain?' · TEAM HOME':''}`;}
    const signature=`${chamber.id}:${chamber.moves}`;if(this.signature&&this.signature!==signature){$('chamber-map').classList.remove('echo-arrival');void $('chamber-map').offsetWidth;$('chamber-map').classList.add('echo-arrival');}this.signature=signature;
  }
}
