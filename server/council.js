import { EYES } from '../public/engine.js';

const fail=(message,status=409)=>Object.assign(new Error(message),{status});
const empty=()=>({captains:{},balances:{},scores:{},serial:0,event:null,history:[]});
const data=room=>room.council||=empty();
const clean=(v,max)=>String(v||'').trim().replace(/[\p{Cc}\p{Cf}]/gu,'').slice(0,max);
const result=message=>({kind:'council',message});
const active=e=>e&&!['results','cancelled'].includes(e.phase);
export const captainTeam=(room,id)=>Object.keys(room.council?.captains||{}).find(t=>room.council.captains[t].memberId===id)||null;
export const councilLocked=(room,id)=>!!captainTeam(room,id)||!!(active(room.council?.event)&&room.council.event.participants[id]);
function participant(room,auth,e){
  const m=auth.member;if(!m)throw fail('Join a viewer seat to participate.',403);
  if(!e.teams.includes(m.team))throw fail('Join a team with a captain before this event.',403);
  e.participants[m.id]=m.team;return m;
}
function settle(room,e,winners,now,cancel=false){
  if(!active(e))return;
  const c=data(room);e.phase=cancel?'cancelled':'results';e.winners=winners;e.endedAt=now;e.featured=null;
  for(const [id,b] of Object.entries(e.backs))c.balances[id]=(c.balances[id]??10)+(cancel?b.stake:winners.includes(b.team)?b.stake*2:0);
  if(!cancel)for(const team of winners)c.scores[team]=(c.scores[team]||0)+1;
}
export function cancelCouncil(room,now){const c=room.council;if(c&&active(c.event))settle(room,c.event,[],now,true);}
export function resolveCouncil(room,game,now){
  const e=room.council?.event;if(!active(e)||e.kind!=='theory')return;
  const eye=game.eye(e.eyeId);if(eye?.sealed){e.answer=eye.options.find(o=>o.rule.id===eye.rule.id).id;settle(room,e,e.teams.filter(t=>e.commitments[t]?.option===e.answer),now);}
  else if(['won','lost'].includes(game.status))cancelCouncil(room,now);
}
export function guardCouncilSeal(room,eyeId){const e=room.council?.event;if(e?.kind==='theory'&&e.eyeId===eyeId&&e.phase==='predict')throw fail('Close council predictions before sealing this eye.');}
export function councilState(room,auth,now){
  const c=room.council||empty(),e=c.event,id=auth.member?.id,team=auth.member?.team;
  const captains=Object.entries(c.captains).map(([team,v])=>({team,...v,score:c.scores[team]||0}));
  if(!e)return {captains,event:null,history:c.history,myBalance:c.balances[id]??10,myCaptain:captainTeam(room,id)};
  const publicMeme=m=>({id:m.id,team:m.team,name:m.name,caption:m.caption,domain:m.domain,image:m.image,approved:m.approved,shown:m.shown});
  const visible=e.memes.filter(m=>auth.host||m.memberId===id||(m.approved&&e.phase!=='predict'));
  const ballots=Object.values(e.opinions).filter(b=>auth.host||b.memberId===id||b.team===team||e.phase!=='predict').map(({memberId,name,team,option,reason})=>({memberId,name,team,option,reason}));
  return {captains,history:c.history,myBalance:c.balances[id]??10,myCaptain:captainTeam(room,id),event:{
    id:e.id,kind:e.kind,title:e.title,phase:e.phase,eyeId:e.eyeId,options:e.options,teams:e.teams,createdAt:e.createdAt,
    commitments:Object.fromEntries(Object.entries(e.commitments).map(([t,p])=>[t,e.phase==='predict'&&t!==captainTeam(room,id)?{locked:true}:{...p,locked:true}])),
    opinions:ballots,memes:visible.map(publicMeme),myMeme:e.memes.find(m=>m.memberId===id)?.id||null,
    myBack:e.backs[id]||null,myOpinion:e.opinions[id]||null,myVote:e.votes[id]?.memeId||null,
    predictionCount:Object.keys(e.backs).length,voteCount:Object.keys(e.votes).length,deadline:e.deadline,
    featured:e.featured&&e.featured.until>now?e.featured:null,
    winners:e.winners||[],answer:e.answer||null,scores:e.phase==='results'?e.scores||{}:{},
  }};
}
function imageData(value){
  if(!value)return '';
  if(typeof value!=='string'||value.length>64000||!/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/=]+$/.test(value))throw fail('Use the image picker: JPEG preview must be under 48 KB.',400);
  return value;
}
export function councilAction(room,game,auth,body,now,relay=null){
  const c=data(room),type=body.type,e=c.event;
  if(type==='connect'){
    const team=captainTeam(room,auth.member?.id),channel=String(body.channel||'').toLowerCase();
    if(!auth.host&&!team)throw fail('Only the host or a captain can connect a chat relay.',403);
    if(!/^\w{1,25}$/.test(channel))throw fail('Invalid channel.',400);
    const info=body.info ? {category:clean(body.info.category,100),title:clean(body.info.title,140)} : null;
    if(team)Object.assign(c.captains[team],{channel,info});
    else {room.twitchChannel=channel;room.channelInfo=info;}
    return result('Channel relay registered. Keep this browser tab open while connected.');
  }
  if(type==='captain'){
    if(!auth.host)throw fail('Only the event host appoints captains.',403);
    if(active(e))throw fail('Finish or cancel this event before changing captains.');
    if(!EYES.some(t=>t.id===body.team))throw fail('Choose one of the five teams.',400);
    if(!body.memberId){delete c.captains[body.team];return result('Captain removed.');}
    const m=room.members.find(m=>m.id===body.memberId&&m.team===body.team&&m.source==='browser');
    if(!m)throw fail('Ask the streamer to join this team in their browser first.',400);
    c.captains[body.team]={memberId:m.id,name:m.name};return result(`${m.name} now captains ${body.team}.`);
  }
  if(type==='open'){
    if(!auth.host)throw fail('Only the event host opens rounds.',403);
    if(active(e))throw fail('Finish or cancel the current council round.');
    const teams=Object.keys(c.captains);if(teams.length<2)throw fail('Appoint captains for at least two teams.');
    if(!['theory','meme'].includes(body.kind))throw fail('Choose theory council or meme intermission.',400);
    const eye=game.eye(body.eyeId);if(body.kind==='theory'&&(!eye||eye.sealed||['won','lost'].includes(game.status)))throw fail('Choose an unsealed eye in an unfinished encounter.');
    if(e)c.history.unshift({id:e.id,title:e.title,kind:e.kind,winners:e.winners||[],phase:e.phase});c.history=c.history.slice(0,8);
    c.event={id:`${room.round}-council-${++c.serial}`,kind:body.kind,title:body.kind==='theory'?`${eye.name}: which theory survives?`:clean(body.title,80)||'The Council Meme Intermission',phase:'predict',eyeId:body.kind==='theory'?eye.id:null,
      options:body.kind==='theory'?eye.options.map(o=>({id:o.id,description:o.description,label:o.label||o.id.toUpperCase()})):[],
      teams,createdAt:now,participants:{},commitments:{},opinions:{},backs:{},memes:[],memeSerial:0,votes:{},featured:null,deadline:null};
    return result('Council open. Choose your captain before the reveal.');
  }
  if(!active(e)&&!['feature','clear','reject'].includes(type))throw fail('Open a council round first.');
  if(['back','opinion','commit','submit','withdraw'].includes(type)&&e.phase!=='predict')throw fail('Predictions and submissions are closed.');
  if(type==='back'){
    const m=participant(room,auth,e);if(e.backs[m.id])throw fail('Your prediction is already locked.');
    if(!e.teams.includes(body.team)||!Number.isInteger(body.stake)||body.stake<1||body.stake>3)throw fail('Choose a captain and 1–3 confidence points.',400);
    const balance=c.balances[m.id]??10;if(balance<body.stake)throw fail('Not enough confidence points. You can still vote and submit.');
    c.balances[m.id]=balance-body.stake;e.backs[m.id]={team:body.team,stake:body.stake};return result('Prediction locked. A correct pick returns twice your stake; these points have no cash value.');
  }
  if(type==='opinion'||type==='commit'){
    if(e.kind!=='theory'||!e.options.some(o=>o.id===body.option))throw fail('Choose a theory on this council board.',400);
    const m=participant(room,auth,e),reason=clean(body.reason,180);if(!reason)throw fail('Add a short reason for your theory.',400);
    if(type==='commit'){
      const team=captainTeam(room,m.id);if(!team)throw fail('Only an appointed captain can commit.',403);
      if(e.commitments[team])throw fail('Your commitment is sealed until the reveal.');
      e.commitments[team]={option:body.option,reason,at:now};
    }else {
      if(relay){
        if(typeof relay.messageId!=='string'||relay.messageId.length>100||!Number.isFinite(relay.sentAt))throw fail('Twitch opinion is missing message provenance.',400);
        if(relay.sentAt<e.createdAt)throw fail('That opinion predates this council round.');
        const moderation=c.moderation?.[relay.channel];
        if(moderation&&(moderation.deleted.includes(relay.messageId)||relay.sentAt<=moderation.clearAt||relay.sentAt<=(moderation.users[m.id]||0)))throw fail('That Twitch message was removed by moderation.');
      }
      e.opinions[m.id]={memberId:m.id,name:m.name,team:m.team,option:body.option,reason,...(relay?{relay}:{} )};
    }
    return result(type==='commit'?'Captain commitment sealed.':'Opinion shared with your team. You may revise before the reveal.');
  }
  if(type==='submit'){
    if(e.kind!=='meme')throw fail('Memes belong to a meme intermission.');
    const m=participant(room,auth,e);if(e.memes.some(x=>x.memberId===m.id))throw fail('One meme per viewer per round. Withdraw before replacing.');
    if(e.memes.length>=12)throw fail('The review queue is full (12 memes).');
    const caption=clean(body.caption,180);if(!caption)throw fail('Give your meme a caption.',400);
    const meme={id:`m${++e.memeSerial}`,memberId:m.id,team:m.team,name:m.name,caption,image:imageData(body.image),domain:room.teamDomains?.[m.team]||'taiga',approved:false,shown:false};
    e.memes.push(meme);return result('Meme sent privately for host approval.');
  }
  if(type==='withdraw'){
    const m=participant(room,auth,e);e.memes=e.memes.filter(x=>x.memberId!==m.id);return result('Meme withdrawn.');
  }
  if(type==='vote'){
    if(e.kind!=='meme'||e.phase!=='vote'||now>=e.deadline)throw fail('Meme voting is closed.');
    const m=participant(room,auth,e),meme=e.memes.find(x=>x.id===body.memeId&&x.approved&&x.shown);if(!meme)throw fail('Choose a showcased meme.',400);
    e.votes[m.id]={memeId:meme.id,team:m.team};return result('Vote saved. You can change it before voting closes.');
  }
  if(!auth.host)throw fail('Only the event host can manage the stage.',403);
  if(type==='approve'||type==='reject'){
    if(!e)throw fail('Open a council round first.');
    if(type==='approve'&&e.phase!=='predict')throw fail('Review memes before the reveal.');
    const m=e.memes.find(x=>x.id===body.memeId);if(!m)throw fail('Meme no longer in the queue.');
    if(type==='reject'){
      if(e.phase!=='predict'&&active(e))cancelCouncil(room,now);
      e.memes=e.memes.filter(x=>x.id!==m.id);if(e.featured?.id===m.id)e.featured=null;
    }else m.approved=true;
    return result(type==='approve'?'Meme approved for the reveal.':'Meme removed from the queue.');
  }
  if(type==='lock'){
    if(e.phase!=='predict')throw fail('Predictions already closed.');
    if(e.kind==='theory'&&e.teams.some(t=>!e.commitments[t]))throw fail('Every captain must seal a theory first.');
    if(e.kind==='meme'&&e.teams.some(t=>!e.memes.some(m=>m.team===t&&m.approved)))throw fail('Approve at least one meme from every captain’s team first.');
    e.phase='showcase';e.memes=e.memes.filter(m=>m.approved);return result('Predictions closed. The council reveal is live.');
  }
  if(type==='feature'){
    if(!e||e.kind!=='meme'||!['showcase','vote','results'].includes(e.phase))throw fail('Reveal the memes before putting one on stage.');
    const m=e.memes.find(x=>x.id===body.memeId&&x.approved);if(!m)throw fail('Only approved memes can go live.');
    m.shown=true;e.featured={id:m.id,until:now+60000};return result('Meme live on the audience stage for 60 seconds.');
  }
  if(type==='clear'){if(e)e.featured=null;return result('Stage cleared.');}
  if(type==='startVote'){
    if(e.kind!=='meme'||e.phase!=='showcase')throw fail('Showcase the memes first.');
    if(e.memes.some(m=>!m.shown))throw fail('Show every approved meme before opening voting.');
    e.phase='vote';e.deadline=now+60000;return result('Audience voting open for 60 seconds.');
  }
  if(type==='finish'){
    if(e.kind!=='meme'||e.phase!=='vote'||now<e.deadline)throw fail('Wait until the 60-second vote ends.');
    const groups={};for(const v of Object.values(e.votes)){groups[v.team]||=[];groups[v.team].push(v);}
    const groupsCount=Object.keys(groups).length;if(!groupsCount)throw fail('No votes received. Cancel to refund predictions.');
    e.scores=Object.fromEntries(e.teams.map(t=>[t,0]));
    for(const votes of Object.values(groups))for(const v of votes){const target=e.memes.find(m=>m.id===v.memeId).team;e.scores[target]+=100/(groupsCount*votes.length);}
    const top=Math.max(...Object.values(e.scores));settle(room,e,e.teams.filter(t=>Math.abs(e.scores[t]-top)<1e-8),now);
    return result('Results revealed. Each voting community had equal weight; tied captains share the win.');
  }
  if(type==='cancel'){cancelCouncil(room,now);return result('Council cancelled. Prediction stakes refunded.');}
  throw fail('Unknown council action.',400);
}

export function moderateCouncil(room,auth,body,now){
  const c=data(room),team=captainTeam(room,auth.member?.id);
  if(!auth.host&&!team)throw fail('Only a host or captain can relay moderation.',403);
  const channel=String(body.channel||'').toLowerCase();if(!/^\w{1,25}$/.test(channel))throw fail('Invalid channel.',400);
  const known=team?c.captains[team].channel:room.twitchChannel;
  if(!known||known.toLowerCase()!==channel)throw fail('Moderate only your connected channel.',403);
  if(!['delete','user','clear'].includes(body.type))throw fail('Invalid moderation action.',400);
  if(body.type==='delete'&&(typeof body.messageId!=='string'||body.messageId.length>100))throw fail('Invalid message.',400);
  if(body.type==='user'&&!/^\d{1,20}$/.test(String(body.userId)))throw fail('Invalid viewer.',400);
  c.moderation||={};const log=c.moderation[channel]||={deleted:[],users:{},clearAt:0};
  c.moderation=Object.fromEntries(Object.entries(c.moderation).slice(-10));
  const at=Number.isFinite(body.at)?Math.min(now,body.at):now;
  if(body.type==='delete'){log.deleted.push(body.messageId);log.deleted=log.deleted.slice(-300);}
  if(body.type==='user'){log.users['T-'+body.userId]=Math.max(log.users['T-'+body.userId]||0,at);log.users=Object.fromEntries(Object.entries(log.users).slice(-200));}
  if(body.type==='clear')log.clearAt=Math.max(log.clearAt,at);
  if(c.event)for(const [id,o]of Object.entries(c.event.opinions))if(o.relay?.channel===channel&&(log.deleted.includes(o.relay.messageId)||o.relay.sentAt<=log.clearAt||o.relay.sentAt<=(log.users[id]||0)))delete c.event.opinions[id];
  return result('Council chat moderation applied.');
}
