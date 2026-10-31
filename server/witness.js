import { teamDomainState } from '../public/domains.js';

const fail=(text,status=409)=>Object.assign(new Error(text),{status});
const empty=()=>({enabled:false,discoveries:[],seats:[],featured:null,replay:null});
const data=room=>room.witness||=empty();
export function resetWitness(room){room.witness={...empty(),enabled:!!room.witness?.enabled};}
export function recordDiscovery(room,game,eyeId,now){
  const w=data(room),eye=game.eye(eyeId);
  if(!eye?.sealed||w.discoveries.some(d=>d.eyeId===eyeId))return;
  let possible=[...eye.options];const credits=new Map();
  const credit=(id,reason)=>{const member=room.members.find(m=>m.id===id);if(member&&!credits.has(id))credits.set(id,{memberId:id,name:member.name,team:member.team,source:member.source,domain:teamDomainState(room,member.team).domain,reason});};
  const steps=eye.experiments.map(e=>{
    const removed=possible.filter(o=>o.rule.accepts(e)!==e.accepted);possible=possible.filter(o=>!removed.includes(o));
    const eliminated=removed.map(o=>o.id.toUpperCase());
    if(eliminated.length)credit(e.by,`Experiment #${e.sequence} ruled out ${eliminated.join(', ')} at ${eye.name}.`);
    return {sequence:e.sequence,name:e.name,signal:{color:e.color,shape:e.shape,pulses:e.pulses},accepted:e.accepted,eliminated};
  });
  for(const [id,c]of eye.citations)credit(id,`Linked experiment #${c.sequence} to disprove ${c.optionId.toUpperCase()} at ${eye.name}.`);
  const discovery={id:`${room.round}-${eye.id}`,eyeId:eye.id,name:eye.name,rule:eye.rule.description,at:now,steps,credits:[...credits.values()]};
  w.discoveries.push(discovery);
  for(const c of credits.values())if(!w.seats.some(s=>s.memberId===c.memberId))w.seats.push({...c,id:`${room.round}-${c.memberId}`,discoveryId:discovery.id,earnedAt:now,status:'earned',text:'',expiresAt:null});
}
function active(s,now){return s.status==='pending'&&s.expiresAt>now;}
export function witnessState(room,auth,now){
  const w=room.witness||empty();
  const clean=s=>({id:s.id,name:s.name,team:s.team,source:s.source,domain:s.domain,reason:s.reason,discoveryId:s.discoveryId,status:s.status==='pending'&&!active(s,now)?'expired':s.status,text:s.text,expiresAt:s.expiresAt});
  return {enabled:w.enabled,discoveries:w.discoveries,queue:auth.host?w.seats.filter(s=>active(s,now)).map(clean):[],
    mine:auth.member?w.seats.filter(s=>s.memberId===auth.member.id).map(clean):[],
    featured:w.enabled&&w.featured?.until>now?w.featured:null,replay:w.replay?.until>now?w.replay:null};
}
export function submitWitness(room,member,text,now,meta={}){
  const w=data(room);if(!w.enabled)throw fail('The host has not enabled the Witness Seat.');
  const seat=w.seats.find(s=>s.memberId===member.id);if(!seat||seat.status!=='earned')throw fail('Earn one seat per round by contributing useful evidence before a correct seal.');
  const clean=String(text||'').trim().replace(/[\p{Cc}\p{Cf}]/gu,'');if(!clean||clean.length>180)throw fail('Use 1–180 characters for your spotlight message.',400);
  if(w.seats.filter(s=>active(s,now)).length>=10)throw fail('Ten messages are waiting. Try again after the host reviews one.',429);
  if(member.source==='twitch'){
    if(typeof meta.messageId!=='string'||!meta.messageId||meta.messageId.length>100||!Number.isFinite(meta.sentAt))throw fail('Twitch message provenance is required.',400);
    if(meta.sentAt<seat.earnedAt)throw fail('Send a new spotlight message after earning your seat.');
    const mod=room.witnessModeration||{};
    if(mod.deleted?.includes(meta.messageId)||meta.sentAt<=(mod.clearAt||0)||meta.sentAt<=(mod.users?.[member.id]||0))throw fail('That Twitch message was removed.');
  }
  Object.assign(seat,{status:'pending',text:clean,expiresAt:now+300000,...(member.source==='twitch'?{messageId:meta.messageId,sentAt:meta.sentAt}:{})});
  return {kind:'spotlightSubmitted',message:'Sent privately to the host for review. Approval is optional; the request expires in five minutes.'};
}
export function witnessAction(room,auth,body,now){
  const w=data(room),type=body.type;
  if(type==='submit'){if(!auth.member)throw fail('Join a viewer seat first.',403);return submitWitness(room,auth.member,body.text,now);}
  if(type==='withdraw'){
    if(!auth.member)throw fail('Only the contributor can withdraw their message.',403);
    const seat=w.seats.find(s=>s.memberId===auth.member.id);if(!seat)throw fail('No seat to withdraw.');
    seat.text='';seat.status='withdrawn';if(w.featured?.id===seat.id)w.featured=null;
    return {kind:'spotlightWithdrawn',message:'Your message was removed.'};
  }
  if(!auth.host)throw fail('Only the host can direct the Witness Seat.',403);
  if(type==='enable'){
    if(typeof body.enabled!=='boolean')throw fail('Choose on or off.',400);w.enabled=body.enabled;
    if(!w.enabled){w.featured=null;for(const s of w.seats)if(s.status==='pending'){s.status='dismissed';s.text='';}}
  }else if(type==='approve'||type==='dismiss'){
    const s=w.seats.find(s=>s.id===body.id);if(!s||!active(s,now))throw fail('This request expired or has already been reviewed.');
    if(type==='approve'){
      if(!w.enabled)throw fail('Enable the Witness Seat first.');
      if(w.featured?.until>now)throw fail('Dismiss the current spotlight before featuring another.');
      w.featured={id:s.id,name:s.name,team:s.team,domain:s.domain,source:s.source,reason:s.reason,text:s.text,until:now+60000};s.status='featured';
    }else{s.status='dismissed';s.text='';}
  }else if(type==='clear'){w.featured=null;}
  else if(type==='replay'){
    if(!w.discoveries.some(d=>d.id===body.id))throw fail('Choose a recorded discovery.');
    w.replay={id:body.id,until:now+20000};
  }else if(type==='clearReplay'){w.replay=null;}
  else throw fail('Unknown Witness Seat action.',400);
  return {kind:'witnessUpdated',message:type==='approve'?'Spotlight featured for 60 seconds.':type==='replay'?'Discovery replay shown for 20 seconds.':'Witness Seat updated.'};
}
export function moderateWitness(room,body,now){
  if(!['delete','user','clear'].includes(body.type))throw fail('Unknown chat moderation event.',400);
  if(body.type==='delete'&&(typeof body.messageId!=='string'||!body.messageId||body.messageId.length>100))throw fail('Invalid message ID.',400);
  if(body.type==='user'&&!/^\d{1,20}$/.test(String(body.userId)))throw fail('Invalid user ID.',400);
  const w=data(room),mod=room.witnessModeration||={deleted:[],users:{},clearAt:0};
  const at=Number.isFinite(body.at)?Math.min(body.at,now):now;
  if(body.type==='delete')mod.deleted=[...new Set([...mod.deleted,body.messageId])].slice(-500);
  if(body.type==='user'){mod.users['T-'+body.userId]=Math.max(mod.users['T-'+body.userId]||0,at);mod.users=Object.fromEntries(Object.entries(mod.users).sort((a,b)=>b[1]-a[1]).slice(0,200));}
  if(body.type==='clear')mod.clearAt=Math.max(mod.clearAt,at);
  for(const s of w.seats)if(s.source==='twitch'&&(body.type==='delete'?s.messageId===body.messageId:body.type==='user'?s.memberId==='T-'+body.userId&&(s.sentAt||0)<=at:(s.sentAt||0)<=at)){
    if(s.status!=='earned'){s.text='';s.status='removed';}if(w.featured?.id===s.id)w.featured=null;
  }
  return {kind:'spotlightModerated',message:'Chat moderation applied to spotlight messages.'};
}
