import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {DOMAINS,getDomain,domainId,teamDomainState} from '../public/domains.js';
import {RoomApi,MemoryRoomStore} from '../server/rooms.js';

function setup(){const store=new MemoryRoomStore(),api=new RoomApi(store,{now:()=>1000,seed:()=> 'domain-audit'});let serial=0;const call=async(path='',body,token)=>{const response=await api.fetch(new Request('https://veil.test/api/rooms'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify({requestId:'domain-request-'+(++serial),...body}):undefined}));return {status:response.status,...await response.json()};};return {store,call};}
async function fixture(){const h=setup(),created=await h.call('',{}),code=created.state.code;const join=(team='heart',name='Viewer')=>h.call('/'+code+'/join',{team,name});return {...h,code,host:created.token,join};}

test('six complete domain assets have distinct palettes, modes and bounded web sizes',async()=>{
  assert.equal(DOMAINS.length,6);assert.equal(new Set(DOMAINS.map(d=>d.id)).size,6);assert.equal(new Set(DOMAINS.map(d=>d.mode)).size,6);
  for(const d of DOMAINS){assert.match(d.asset,/^\/assets\/domains\/[a-z-]+\.webp$/);assert.match(d.base,/^#[0-9a-f]{6}$/i);assert.equal(d.tintA.length,3);const file=new URL('../public'+d.asset,import.meta.url);assert.ok((await stat(file)).size<300000);const header=await readFile(file);assert.equal(header.toString('ascii',8,12),'WEBP');}
  assert.equal(domainId('aurora'),'taiga');assert.equal(domainId('crimson'),'corrupted');assert.equal(getDomain('unknown').id,'taiga');
});
test('team domain votes replace earlier ballots, preserve the incumbent on ties, and synchronize',async()=>{
  const h=await fixture(),a=await h.join(),b=await h.join('heart','Second');
  const path='/'+h.code+'/domain';
  let result=await h.call(path,{domain:'lunar'},a.token);assert.equal(result.state.teams.find(t=>t.eyeId==='heart').domain,'lunar');
  result=await h.call(path,{domain:'corrupted'},b.token);let team=result.state.teams.find(t=>t.eyeId==='heart');assert.equal(team.domain,'lunar');assert.equal(team.domainVotes.lunar,1);assert.equal(team.domainVotes.corrupted,1);
  result=await h.call(path,{domain:'corrupted'},a.token);team=result.state.teams.find(t=>t.eyeId==='heart');assert.equal(team.domain,'corrupted');assert.equal(team.domainVotes.corrupted,2);assert.equal(team.domainVotes.lunar,0);
  const refreshed=await h.call('/'+h.code,undefined,b.token);assert.equal(refreshed.me.domainVote,'corrupted');assert.equal(refreshed.teams.find(t=>t.eyeId==='heart').domain,'corrupted');
});
test('a member changes only their own team’s home and no puzzle state changes',async()=>{
  const h=await fixture(),a=await h.join('heart'),b=await h.join('root');const before=await h.call('/'+h.code);
  const vote=await h.call('/'+h.code+'/domain',{domain:'fire',team:'root'},a.token);
  assert.equal(vote.state.teams.find(t=>t.eyeId==='heart').domain,'fire');assert.equal(vote.state.teams.find(t=>t.eyeId==='root').domain,'frontier');assert.deepEqual(vote.state.game,before.game);
  assert.equal((await h.call('/'+h.code+'/domain',{domain:'not-a-world'},b.token)).status,400);
  assert.equal((await h.call('/'+h.code+'/domain',{domain:'lunar'},h.host)).status,403);
  assert.equal((await h.call('/'+h.code+'/domain',{domain:'lunar'},'x'.repeat(48))).status,401);
});
test('team changes discard the old domain vote and new rounds retain settled homes',async()=>{
  const h=await fixture(),a=await h.join();await h.call('/'+h.code+'/domain',{domain:'star-sea'},a.token);
  const switched=await h.call('/'+h.code+'/team',{team:'root'},a.token);assert.equal(switched.state.me.domainVote,null);assert.equal(switched.state.teams.find(t=>t.eyeId==='heart').domainVoteTotal,0);
  await h.call('/'+h.code+'/domain',{domain:'fire'},a.token);const reset=await h.call('/'+h.code+'/control',{type:'reset'},h.host);
  assert.equal(reset.state.teams.find(t=>t.eyeId==='root').domain,'fire');const recovered=await h.call('/'+h.code,undefined,a.token);assert.equal(recovered.me.domainVote,'fire');
});
test('concurrent domain ballots are preserved and older rooms receive compatible homes',async()=>{
  const h=await fixture(),a=await h.join(),b=await h.join('heart','Two');await Promise.all([h.call('/'+h.code+'/domain',{domain:'lunar'},a.token),h.call('/'+h.code+'/domain',{domain:'corrupted'},b.token)]);
  const latest=await h.call('/'+h.code);const team=latest.teams.find(t=>t.eyeId==='heart');assert.equal(team.domainVoteTotal,2);assert.equal(team.domainVotes.lunar,1);assert.equal(team.domainVotes.corrupted,1);
  const row=await h.store.get(h.code);delete row.data.teamDomains;delete row.data.domainVotes;row.data.theme='crimson';await h.store.save(h.code,row.data,row.version);
  const older=await h.call('/'+h.code,undefined,a.token);assert.equal(older.teams.length,5);assert.equal(older.theme,'corrupted');assert.equal(older.me.domainVote,null);assert.equal(teamDomainState(row.data,'heart').domain,'taiga');
});
test('Twitch domain commands use the relayed account’s actual team',async()=>{
  const h=await fixture(),path='/'+h.code+'/twitch';await h.call(path,{userId:'123',name:'Twitch viewer',channel:'demo',text:'!team dusk'},h.host);
  const voted=await h.call(path,{userId:'123',name:'Twitch viewer',channel:'demo',text:'!domain corrupted'},h.host);assert.equal(voted.result.kind,'domainVote');assert.equal(voted.state.teams.find(t=>t.eyeId==='dusk').domain,'corrupted');assert.equal(voted.state.teams.find(t=>t.eyeId==='heart').domain,'taiga');
});
