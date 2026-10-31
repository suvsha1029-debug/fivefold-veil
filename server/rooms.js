import { VeilGame, EYES, parseCommand } from '../public/engine.js';
import { getDomain, domainId, validDomain, DEFAULT_TEAM_DOMAINS, teamDomainState, settleTeamDomain } from '../public/domains.js';
import { teamChambers, tuneChamber } from '../public/chamber-engine.js';
import { recordDiscovery, resetWitness, witnessState, witnessAction, submitWitness, moderateWitness } from './witness.js';

const TTL=24*60*60*1000;
const AVATARS=['🦊','🦉','🐸','🐙','🦋','🐼','🐺','🐱'];
const TEAM_EMOJI={crown:'👑',dusk:'🌙',heart:'💠',dawn:'🌅',root:'🌿'};
const MODES=['community','shared','host'];
const randomHex=n=>[...crypto.getRandomValues(new Uint8Array(n))].map(x=>x.toString(16).padStart(2,'0')).join('');
const roomCode=()=>[...crypto.getRandomValues(new Uint8Array(7))].map(x=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x%32]).join('');
const hash=async token=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))].map(x=>x.toString(16).padStart(2,'0')).join('');
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
const cleanName=value=>String(value||'').trim().replace(/[\p{Cc}\p{Cf}]/gu,'').slice(0,24);

export class D1RoomStore {
  constructor(db){if(!db)throw fail('Room storage is unavailable. Please try again later.',503);this.db=db;}
  async get(code){const row=await this.db.prepare('SELECT data, version FROM room_documents WHERE code = ?').bind(code).first();return row?{data:JSON.parse(row.data),version:row.version}:null;}
  async insert(code,data){const r=await this.db.prepare('INSERT OR IGNORE INTO room_documents (code, data, version, expires_at) VALUES (?, ?, 0, ?)').bind(code,JSON.stringify(data),data.expiresAt).run();return r.meta.changes===1;}
  async save(code,data,version){const r=await this.db.prepare('UPDATE room_documents SET data = ?, version = version + 1, expires_at = ? WHERE code = ? AND version = ?').bind(JSON.stringify(data),data.expiresAt,code,version).run();return r.meta.changes===1;}
  async cleanup(now){await this.db.prepare('DELETE FROM room_documents WHERE code IN (SELECT code FROM room_documents WHERE expires_at < ? LIMIT 20)').bind(now).run();}
}

export class MemoryRoomStore {
  constructor(){this.rows=new Map();}
  async get(code){return structuredClone(this.rows.get(code)||null);}
  async insert(code,data){if(this.rows.has(code))return false;this.rows.set(code,{data:structuredClone(data),version:0});return true;}
  async save(code,data,version){if(this.rows.get(code)?.version!==version)return false;this.rows.set(code,{data:structuredClone(data),version:version+1});return true;}
  async cleanup(now){for(const [code,row] of this.rows)if(row.data.expiresAt<now)this.rows.delete(code);}
}

function hydrate(room,now){
  const game=VeilGame.restore(room.game);
  if(room.game.status==='running'){game.status='running';game.deadline=room.deadline;game.tick(now);}
  game.focus=new Map(room.runtime?.focus||[]);game.cooldowns=new Map(room.runtime?.cooldowns||[]);game.testWindows=new Map(room.runtime?.testWindows||[]);
  return game;
}
function saveGame(room,game,now){
  room.game=game.serialize(now);room.deadline=game.status==='running'?game.deadline:null;
  room.runtime={focus:[...game.focus],cooldowns:[...game.cooldowns],testWindows:[...game.testWindows]};
}
function addActivity(room,member,result){room.activity.unshift({id:randomHex(6),at:Date.now(),name:member?.name||'Host',avatar:member?.avatar||'✧',team:member?.team||null,source:member?.source||'host',kind:result.kind,text:result.command||result.message||result.description||result.kind});room.activity=room.activity.slice(0,20);}
function credential(room,tokenHash){
  if(tokenHash===room.hostHash)return {host:true,member:null};
  return {host:false,member:room.members.find(member=>member.tokenHash===tokenHash)||null};
}
function requestNudge(room,game,member,eyeId,now){
  if(game.status!=='running'||game.phase!=='investigation'||!game.eye(eyeId)||game.eye(eyeId).sealed)throw fail('Ask for a nudge at an active, unsealed eye.',409);
  room.hintRequests||=[];
  if(room.hintRequests.some(r=>r.memberId===member.id&&r.eyeId===eyeId))throw fail('Your request is already waiting for the host.',409);
  if(now-(member.hintRequestedAt??-Infinity)<30000)throw fail('Wait 30 seconds before requesting another nudge.',429);
  room.hintRequests.push({memberId:member.id,eyeId});member.hintRequestedAt=now;
  return {kind:'hintRequested',message:'The host can see your request. Keep investigating or watch while you wait.'};
}
function runMemberCommand(room,game,member,text,now,{approved=false}={}){
  const parsed=parseCommand(text);if(!parsed)throw fail('Use a test, theory vote, evidence citation or binding command.');
  const targetEye=parsed.eyeId||game.focus.get(member.id)||member.team;
  const normalized=parsed.type==='test'?`!test ${targetEye} ${parsed.signal.color} ${parsed.signal.shape} ${parsed.signal.pulses}`:parsed.type==='vote'?`!solve ${targetEye} ${parsed.optionId}`:text;
  if(room.controlMode==='host'&&parsed.type==='test'&&!approved){
    const eye=game.eye(targetEye);
    if(game.status!=='running'||!eye||eye.sealed)throw fail('Request an experiment at a running, unsealed eye.',409);
    if(eye.experiments.length>=game.maxPerEye)throw fail('This eye’s experiments are used. Interpret the journal instead.',409);
    if(eye.experiments.some(e=>e.color===parsed.signal.color&&e.shape===parsed.signal.shape&&e.pulses===parsed.signal.pulses))throw fail('That signal is already in the journal.',409);
    room.pendingTests||=[];
    if(room.pendingTests.some(p=>p.memberId===member.id))throw fail('Your experiment is waiting for the host. Withdraw it before proposing another.',409);
    if(room.pendingTests.length>=24)throw fail('The host has 24 experiments to review. Try again after one is reviewed.',429);
    room.pendingTests.push({id:randomHex(8),memberId:member.id,name:member.name,eyeId:targetEye,signal:parsed.signal,text:normalized});
    return {kind:'testRequested',message:`${member.name} proposed an experiment at ${targetEye}. Waiting for host approval.`};
  }
  const result=game.process(normalized,{id:member.id,name:member.name,source:member.source,eyeId:member.team},now);
  if(['test','vote','cite','bindingVote'].includes(result.kind))member.lockedRound=room.round;
  return result;
}
function communityDecision(room,game,member,type,eyeId,now){
  if(room.controlMode!=='community'||!member||!['seal','bind'].includes(type))throw fail('Only evidence contributors in Viewers lead mode can confirm a decision.',403);
  if(type==='seal'){
    if(!game.eye(eyeId)||!game.eligible(game.eye(eyeId),member.id))throw fail('Contribute evidence at this eye before confirming its vote.',403);
    return game.lockEye(eyeId,now);
  }
  if(!game.participants.has(member.id))throw fail('Contribute evidence before confirming the final vote.',403);
  const active=new Set(room.members.filter(m=>game.participants.has(m.id)).map(m=>m.team));
  if(active.size<(room.minimumTeams??2))throw fail('More teams must contribute evidence before the final binding.',409);
  return game.commitBinding(now);
}
function publicState(room,game,auth,now){
  const snapshot=game.snapshot();snapshot.seed=['won','lost'].includes(game.status)?game.seed:`room-${room.round}`;
  const teams=EYES.map(eye=>{const members=room.members.filter(m=>m.team===eye.id);return {id:`${room.code}-${eye.id.toUpperCase()}`,eyeId:eye.id,name:eye.name,emoji:TEAM_EMOJI[eye.id],members:members.length,contributors:members.filter(m=>game.participants.has(m.id)).length,sealed:game.eye(eye.id).sealed,...teamDomainState(room,eye.id),chambers:teamChambers(room,eye.id)};});
  return {code:room.code,round:room.round,title:room.title,createdAt:room.createdAt,expiresAt:room.expiresAt,serverNow:now,minimumTeams:room.minimumTeams??2,
    controlMode:room.controlMode||'shared',puzzleType:game.definition?'authored':'generated',puzzleRevision:room.puzzleRevision||0,pendingTestCount:(room.pendingTests||[]).length,
    pendingTests:(room.pendingTests||[]).filter(p=>auth.host||p.memberId===auth.member?.id),
    authoring:auth.host&&game.status==='idle'?game.eyes.map(e=>({id:e.id,correct:e.options.find(o=>o.rule.id===e.rule.id).id,options:e.options.map(o=>({ruleId:o.rule.id,label:o.label||''}))})):null,
    hint:room.hint||null,hintRequests:Object.fromEntries(EYES.map(e=>[e.id,(room.hintRequests||[]).filter(r=>r.eyeId===e.id).length])),
    myHintRequests:auth.member?(room.hintRequests||[]).filter(r=>r.memberId===auth.member.id).map(r=>r.eyeId):[],
    source:room.twitchChannel?`Twitch relay @${room.twitchChannel} + browser guests`:'Browser team room',twitchChannel:room.twitchChannel||null,
    theme:domainId(room.theme),teams,activeTeams:teams.filter(t=>t.contributors>0).length,
    members:room.members.map(m=>({id:m.id,name:m.name,avatar:m.avatar,team:m.team,source:m.source,contributed:game.participants.has(m.id)})),
    me:auth.member?{id:auth.member.id,name:auth.member.name,avatar:auth.member.avatar,team:auth.member.team,source:auth.member.source,locked:auth.member.lockedRound===room.round,domainVote:room.domainVotes?.[auth.member.id]?.team===auth.member.team?room.domainVotes[auth.member.id].domain:null,eligible:game.eyes.filter(e=>game.eligible(e,auth.member.id)).map(e=>e.id),votes:Object.fromEntries(game.eyes.map(e=>[e.id,e.votes.get(auth.member.id)?.optionId||null]))}:null,
    witness:witnessState(room,auth,now),isHost:auth.host,game:snapshot,activity:room.activity};
}

export class RoomApi {
  constructor(store,{now=()=>Date.now(),seed=()=>`crew-${randomHex(12)}`}={}){this.store=store;this.now=now;this.seed=seed;}
  async fetch(request){
    try {
      const url=new URL(request.url),parts=url.pathname.replace(/\/$/,'').split('/').filter(Boolean);
      if(parts[0]!=='api'||parts[1]!=='rooms')return json({error:'Not found'},404);
      if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed'},405);
      const origin=request.headers.get('origin');
      if(request.method==='POST'&&((origin&&origin!==url.origin)||request.headers.get('sec-fetch-site')==='cross-site'))throw fail('Use the same site to send room actions.',403);
      let body={};
      if(request.method==='POST'){
        if(!request.headers.get('content-type')?.startsWith('application/json'))throw fail('Send JSON.',415);
        if(Number(request.headers.get('content-length')||0)>4096)throw fail('Request is too large.',413);
        const text=await request.text();if(text.length>4096)throw fail('Request is too large.',413);
        try{body=JSON.parse(text);}catch{throw fail('Invalid JSON.');}
        if(!body||typeof body!=='object'||Array.isArray(body))throw fail('Invalid request.');
      }
      const now=this.now();
      if(parts.length===2&&request.method==='POST')return await this.create(body,now);
      const code=String(parts[2]||'').toUpperCase();if(!/^[A-HJ-NP-Z2-9]{7}$/.test(code))throw fail('Enter the seven-character room code.',404);
      const rawToken=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
      const tokenHash=rawToken.length===48?await hash(rawToken):'';
      const action=parts[3]||'';
      if(request.method==='GET'&&parts.length===3){const row=await this.store.get(code);if(!row||row.data.expiresAt<now)throw fail('This room expired or could not be found.',404);const game=hydrate(row.data,now);return json(publicState(row.data,game,credential(row.data,tokenHash),now));}
      if(request.method!=='POST'||parts.length!==4)throw fail('Unknown room action.',404);
      for(let attempt=0;attempt<6;attempt++){
        const row=await this.store.get(code);if(!row||row.data.expiresAt<now)throw fail('This room expired or could not be found.',404);
        const room=row.data,game=hydrate(room,now),auth=credential(room,tokenHash);
        if(action==='join'){
          const name=cleanName(body.name);if(!name)throw fail('Choose a display name.');
          if(body.team!=='auto'&&!EYES.some(e=>e.id===body.team))throw fail('Choose one of the five teams.');
          if(room.members.length>=200)throw fail('This room has reached its 200-member limit.',409);
          const token=randomHex(24),id=`M-${randomHex(5).toUpperCase()}`;
          const team=body.team==='auto'?EYES.reduce((best,e)=>room.members.filter(m=>m.team===e.id).length<room.members.filter(m=>m.team===best.id).length?e:best).id:body.team;
          const member={id,name,avatar:AVATARS.includes(body.avatar)?body.avatar:AVATARS[0],team,source:'browser',tokenHash:await hash(token),lockedRound:0};
          room.members.push(member);saveGame(room,game,now);
          if(await this.store.save(code,room,row.version))return json({token,state:publicState(room,game,{host:false,member},now)},201);
          continue;
        }
        if(!auth.host&&!auth.member)throw fail('Rejoin this room to continue. Only the host can operate host controls.',401);
        const requestId=body.requestId;
        if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(requestId))throw fail('A request ID is required.');
        const actorKey=auth.host?'host':auth.member.id;
        const previous=room.requests.find(r=>r.id===requestId&&r.by===actorKey);
        if(previous)return json({result:previous.result,state:publicState(room,game,auth,now)});
        let result;
        if(action==='witness'){
          result=witnessAction(room,auth,body,now);
        } else if(action==='witness-moderation'){
          if(!auth.host)throw fail('Only the connected host can relay moderation.',403);
          result=moderateWitness(room,body,now);
        } else if(action==='decide'){
          result=communityDecision(room,game,auth.member,body.type,body.eyeId,now);
        } else if(action==='control'){
          if(!auth.host)throw fail('Only the host can change the encounter.',403);
          const type=body.type;
          if(type==='start'){if(game.status==='idle')game.start(now);else if(game.status==='paused')game.resume(now);else throw fail('This encounter is already running or finished.',409);result={kind:'started',message:'The crew encounter is running.'};}
          else if(type==='pause'){game.pause(now);result={kind:'paused',message:'The host held the clock.'};}
          else if(type==='seal')result=game.lockEye(body.eyeId,now,auth.host&&room.controlMode==='host'?body.optionId||null:null);
          else if(type==='bind'){
            const active=new Set(room.members.filter(m=>game.participants.has(m.id)).map(m=>m.team));
            if(active.size<(room.minimumTeams??2))throw fail(`${room.minimumTeams??2} different team(s) must contribute evidence before the final binding.`,409);
            result=game.commitBinding(now,auth.host&&room.controlMode==='host'?body.signal||null:null);
          }
          else if(type==='reset'){
            resetWitness(room);
            const fresh=new VeilGame({seed:this.seed(),durationMs:game.durationMs,definition:game.definition});room.round++;room.activity=[];room.chambers={};room.twitchChannel=null;room.hint=null;room.hintRequests=[];room.pendingTests=[];for(const member of room.members)delete member.hintRequestedAt;saveGame(room,fresh,now);
            result={kind:'reset',message:'New round. Your room and team IDs stay the same.'};
            room.requests=[{id:requestId,by:actorKey,result}];if(await this.store.save(code,room,row.version))return json({result,state:publicState(room,fresh,auth,now)});continue;
          }
          else if(type==='mode'){
            if(!['idle','paused'].includes(game.status))throw fail('Hold the clock before changing control mode.',409);
            if(!MODES.includes(body.mode))throw fail('Choose a valid control mode.');
            room.controlMode=body.mode;room.pendingTests=[];result={kind:'mode',message:'Control mode updated. Pending experiment requests were cleared without spending tests.'};
          }
          else if(type==='publishPuzzle'||type==='generatePuzzle'){
            if(game.status!=='idle')throw fail('Create a new round before changing its rules or answer options.',409);
            let fresh;try{fresh=new VeilGame({seed:this.seed(),durationMs:game.durationMs,definition:type==='publishPuzzle'?body.definition:null});if(type==='publishPuzzle'&&!body.definition)throw new Error('Provide all five eye designs.');}catch(error){throw fail(error.message);}
            room.hint=null;room.hintRequests=[];room.pendingTests=[];room.puzzleRevision=(room.puzzleRevision||0)+1;saveGame(room,fresh,now);
            result={kind:'puzzlePublished',message:type==='publishPuzzle'?'Your five-eye puzzle is published. Its rules are fixed once the encounter starts.':'A new generated puzzle is ready.'};
            addActivity(room,null,result);room.requests.unshift({id:requestId,by:actorKey,result});room.requests=room.requests.slice(0,120);
            if(await this.store.save(code,room,row.version))return json({result,state:publicState(room,fresh,auth,now)});continue;
          }
          else if(type==='approveTest'||type==='rejectTest'){
            if(room.controlMode!=='host')throw fail('Experiment approval belongs to Host-led mode.',409);
            const pending=room.pendingTests?.find(p=>p.id===body.pendingId);if(!pending)throw fail('That experiment request is no longer waiting.',409);
            const member=room.members.find(m=>m.id===pending.memberId);
            result=type==='approveTest'?runMemberCommand(room,game,member,pending.text,now,{approved:true}):{kind:'testRejected',message:`The host declined ${pending.name}’s experiment request.`};
            if(result.kind!=='error')room.pendingTests=room.pendingTests.filter(p=>p.id!==pending.id);
          }
          else if(type==='hint'){
            if(!['running','paused'].includes(game.status)||game.phase!=='investigation')throw fail('Share a nudge during an investigation.',409);
            const eye=game.eye(body.eyeId);if(!eye||eye.sealed)throw fail('Choose an unsealed eye.',409);
            const suggested=eye.experiments.length<game.maxPerEye?game.suggest(eye.id):null;
            const remaining=game.compatible(eye).length;
            const message=suggested?`Try ${suggested.color} ${suggested.shape} with ${suggested.pulses} pulse${suggested.pulses===1?'':'s'} at ${eye.name}. The remaining theories disagree about this signal; compare their predictions before testing.`:remaining===1?`Only one theory at ${eye.name} fits the recorded evidence. Contributors can vote for it; the host can seal it.`:`Review ${eye.name}’s recorded PASS and FAIL results against the remaining theories. You can link evidence to earn a vote without another test.`;
            room.hint={eyeId:eye.id,text:message,at:now};room.hintRequests=(room.hintRequests||[]).filter(r=>r.eyeId!==eye.id);result={kind:'hint',message};
          }
          else if(type==='clearHint'){room.hint=null;result={kind:'hintCleared',message:'The shared nudge was dismissed.'};}
          else if(type==='theme'){room.theme=domainId(body.theme);result={kind:'theme',message:'The host’s legacy atmosphere changed.'};}
          else throw fail('Unknown host control.');
        } else if(action==='withdraw-test'){
          if(!auth.member)throw fail('Only the requesting viewer can withdraw an experiment.',403);
          room.pendingTests=(room.pendingTests||[]).filter(p=>p.memberId!==auth.member.id);result={kind:'testWithdrawn',message:'Your experiment request was withdrawn.'};
        } else if(action==='hint-request'){
          if(!auth.member)throw fail('Join a team to ask for a nudge.',403);
          result=requestNudge(room,game,auth.member,body.eyeId,now);
        } else if(action==='team'){
          if(!auth.member)throw fail('Join as a viewer to choose a team.');
          if(auth.member.lockedRound===room.round)throw fail('Your team is fixed after your first contribution until the next round.',409);
          if(!EYES.some(e=>e.id===body.team))throw fail('Choose a valid team.');
          const previousTeam=auth.member.team;auth.member.team=body.team;if(room.domainVotes)delete room.domainVotes[auth.member.id];settleTeamDomain(room,previousTeam);settleTeamDomain(room,body.team);result={kind:'team',message:'Team updated.'};
        } else if(action==='domain'){
          if(!auth.member)throw fail('Join a team to vote for its home domain.',403);
          if(!validDomain(body.domain))throw fail('Choose one of the six available domains.');
          room.domainVotes||={};room.domainVotes[auth.member.id]={team:auth.member.team,domain:body.domain};
          const settled=settleTeamDomain(room,auth.member.team);
          result={kind:'domainVote',message:`Domain vote recorded. ${auth.member.team} stays in ${getDomain(settled.domain).name}.`};addActivity(room,auth.member,result);
        } else if(action==='chamber'){
          if(!auth.member)throw fail('Join a viewer seat to tune your team’s chamber.',403);
          if(!validDomain(body.domain)||!Number.isInteger(body.node)||body.node<0||body.node>2)throw fail('Choose a domain and a landmark numbered 1–3.');
          if(now-(auth.member.chamberAt??-Infinity)<300)throw fail('Let that echo settle, then tune again.',429);
          result=tuneChamber(room,auth.member,body.domain,body.node,now);auth.member.chamberAt=now;auth.member.lockedRound=room.round;addActivity(room,auth.member,result);
        } else if(action==='command'||action==='twitch'){
          let member=auth.member;
          if(action==='twitch'){
            if(!auth.host)throw fail('Only the connected host can relay Twitch commands.',403);
            if(!/^\d{1,20}$/.test(String(body.userId))||!/^\w{1,25}$/.test(String(body.channel||'')))throw fail('Invalid Twitch relay identity.');
            const teamMatch=/^!team (crown|dusk|heart|dawn|root)$/i.exec(String(body.text||'').trim());
            const domainMatch=/^!domain (taiga|corrupted|lunar|fire|frontier|star-sea)$/i.exec(String(body.text||'').trim());
            const tuneMatch=/^!tune ([123])$/i.exec(String(body.text||'').trim());
            const hintMatch=/^!hint (crown|dusk|heart|dawn|root)$/i.exec(String(body.text||'').trim());
            const sealMatch=/^!seal (crown|dusk|heart|dawn|root)$/i.exec(String(body.text||'').trim()),bindMatch=/^!confirmbind$/i.test(String(body.text||'').trim());
            const spotlightMatch=/^!spotlight\s+([\s\S]+)$/i.exec(String(body.text||'').trim());
            const parsed=parseCommand(body.text);if(!parsed&&!teamMatch&&!domainMatch&&!tuneMatch&&!hintMatch&&!sealMatch&&!bindMatch&&!spotlightMatch)return json({result:{kind:'ignored'},state:publicState(room,game,auth,now)});
            const id=`T-${body.userId}`;member=room.members.find(m=>m.id===id);
            if(!member){if(room.members.length>=200)throw fail('The room is full.',409);member={id,name:cleanName(body.name)||'Twitch viewer',avatar:'🎮',team:teamMatch?.[1].toLowerCase()||parsed?.eyeId||'heart',source:'twitch',lockedRound:0};room.members.push(member);}
            room.twitchChannel=body.channel;
            if(spotlightMatch)result=submitWitness(room,member,spotlightMatch[1],now,{messageId:body.messageId,sentAt:body.sentAt});
            if(teamMatch){if(member.lockedRound===room.round)throw fail('Your team is fixed for this round.',409);const previousTeam=member.team;member.team=teamMatch[1].toLowerCase();if(room.domainVotes)delete room.domainVotes[member.id];settleTeamDomain(room,previousTeam);settleTeamDomain(room,member.team);result={kind:'team',message:`Joined ${member.team}.`};}
            if(domainMatch){const domain=domainMatch[1].toLowerCase();room.domainVotes||={};room.domainVotes[member.id]={team:member.team,domain};const settled=settleTeamDomain(room,member.team);result={kind:'domainVote',message:`Domain vote recorded. ${member.team} stays in ${getDomain(settled.domain).name}.`};}
            if(tuneMatch){if(now-(member.chamberAt??-Infinity)<300)throw fail('Let that echo settle, then tune again.',429);result=tuneChamber(room,member,teamDomainState(room,member.team).domain,Number(tuneMatch[1])-1,now);member.chamberAt=now;member.lockedRound=room.round;}
            if(hintMatch)result=requestNudge(room,game,member,hintMatch[1].toLowerCase(),now);
            if(sealMatch||bindMatch)result=communityDecision(room,game,member,sealMatch?'seal':'bind',sealMatch?.[1].toLowerCase(),now);
          }
          if(!result){
            if(!member)throw fail('The host directs the ritual. Join the viewer link to contribute.',403);
            result=runMemberCommand(room,game,member,body.text,now);
          }
          if(!['error','ignored'].includes(result.kind))addActivity(room,member,result);
        }else throw fail('Unknown room action.',404);
        if(result.kind==='error')throw fail(result.message,409);
        if(result.kind==='sealed')recordDiscovery(room,game,result.eyeId,now);
        if(['test','sealed','wrong'].includes(result.kind)){
          if(room.hint?.eyeId===result.eyeId)room.hint=null;
          if(result.kind==='sealed')room.hintRequests=(room.hintRequests||[]).filter(r=>r.eyeId!==result.eyeId);
          room.pendingTests=(room.pendingTests||[]).filter(p=>p.eyeId!==result.eyeId||(result.kind!=='sealed'&&!(result.kind==='test'&&p.signal.color===result.experiment.color&&p.signal.shape===result.experiment.shape&&p.signal.pulses===result.experiment.pulses)));
        }
        if(action==='control'||action==='decide')addActivity(room,auth.member,result);
        saveGame(room,game,now);room.requests.unshift({id:requestId,by:actorKey,result});room.requests=room.requests.slice(0,120);
        if(await this.store.save(code,room,row.version))return json({result,state:publicState(room,game,auth,now)});
      }
      throw fail('The room is busy. Please try that action again.',409);
    }catch(error){if(!error.status)console.error('Room request failed',error.message);return json({error:error.status?error.message:'Room storage could not be reached. Please retry.'},error.status||503);}
  }
  async create(body,now){
    const title=cleanName(body.title)||'The Fivefold Expedition';
    const minimumTeams=body.minimumTeams??2;if(![1,2].includes(minimumTeams))throw fail('Choose small crew or team expedition.');
    const controlMode=body.controlMode??'shared';if(!MODES.includes(controlMode))throw fail('Choose a valid control mode.');
    const durationMs=Number(body.durationMs||480000);if(![180000,300000,480000,720000].includes(durationMs))throw fail('Choose a supported encounter duration.');
    await this.store.cleanup(now);
    for(let attempt=0;attempt<5;attempt++){
      const code=roomCode(),token=randomHex(24),game=new VeilGame({seed:this.seed(),durationMs});
      const room={code,title,round:1,minimumTeams,controlMode,pendingTests:[],hint:null,hintRequests:[],hostHash:await hash(token),createdAt:now,expiresAt:now+TTL,theme:'taiga',teamDomains:{...DEFAULT_TEAM_DOMAINS},domainVotes:{},members:[],activity:[],requests:[],game:game.serialize(now),deadline:null,runtime:{}};
      if(await this.store.insert(code,room))return json({token,state:publicState(room,game,{host:true,member:null},now)},201);
    }
    throw fail('Could not reserve a room code. Please retry.',503);
  }
}
