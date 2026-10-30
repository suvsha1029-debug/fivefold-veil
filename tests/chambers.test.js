import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAMBERS,initialChamber,rotateEcho,echoAligned} from '../public/chamber-engine.js';
import {DOMAINS} from '../public/domains.js';
import {RoomApi,MemoryRoomStore} from '../server/rooms.js';

function setup(){let time=1000,serial=0;const store=new MemoryRoomStore(),api=new RoomApi(store,{now:()=>time,seed:()=> 'chamber-tests'});return {store,advance(){time+=500;},async call(path='',body,token){const r=await api.fetch(new Request('https://veil.test/api/rooms'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify({requestId:'chamber-request-'+(++serial),...body}):undefined}));return {status:r.status,...await r.json()};}};}
async function fixture(){const h=setup(),r=await h.call('',{}),a=await h.call('/'+r.state.code+'/join',{name:'First',team:'heart'}),b=await h.call('/'+r.state.code+'/join',{name:'Second',team:'heart'});return {...h,code:r.state.code,host:r.token,a:a.token,b:b.token};}
const chamber=(response,domain='taiga',team='heart')=>(response.state||response).teams.find(t=>t.eyeId===team).chambers.find(c=>c.domain===domain);
function solve(values,target){const queue=[[values,[]]],seen=new Set([values.join()]);while(queue.length){const [v,path]=queue.shift();if(v.every((x,i)=>x===target[i]))return path;for(let i=0;i<3;i++){const n=rotateEcho(v,i);if(!seen.has(n.join())){seen.add(n.join());queue.push([n,[...path,i]]);}}}throw Error('Unreachable target');}

test('all linked-dial states are reachable; six authored rooms begin unsolved and have distinct IDs',()=>{
  const found=new Set(['0,0,0']),queue=[[0,0,0]];while(queue.length){const v=queue.shift();for(let n=0;n<3;n++){const next=rotateEcho(v,n);if(!found.has(next.join())){found.add(next.join());queue.push(next);}}}assert.equal(found.size,27);
  const ids=new Set();for(const domain of DOMAINS)for(const team of ['crown','dusk','heart','dawn','root']){const c=initialChamber({code:'ABCDEFG',round:1},team,domain.id);assert.ok(!echoAligned(c));assert.ok(solve(c.values,c.target).length<=6);assert.equal(CHAMBERS[domain.id].stations.length,3);ids.add(c.id);}assert.equal(ids.size,30);
});
test('teammates share persisted chamber state while team and domain boundaries are enforced',async()=>{
  const h=await fixture(),path='/'+h.code+'/chamber',before=await h.call('/'+h.code);
  const tuned=await h.call(path,{domain:'taiga',node:0,team:'root',values:[0,0,0]},h.a);assert.equal(tuned.status,200);assert.equal(tuned.state.me.locked,true);assert.equal(chamber(tuned).moves,1);assert.equal(chamber(tuned,'taiga','root').moves,0);assert.equal(chamber(tuned,'lunar').moves,0);assert.deepEqual(tuned.state.game,before.game);
  const recovered=await h.call('/'+h.code,undefined,h.b);assert.deepEqual(chamber(recovered),chamber(tuned));
  assert.equal((await h.call(path,{domain:'taiga',node:0},h.host)).status,403);assert.equal((await h.call(path,{domain:'unknown',node:0},h.b)).status,400);assert.equal((await h.call(path,{domain:'taiga',node:3},h.b)).status,400);assert.equal((await h.call(path,{domain:'taiga',node:1.5},h.b)).status,400);assert.equal((await h.call(path,{domain:'taiga',node:0},'x'.repeat(48))).status,401);
});
test('concurrent tunes survive and duplicate request IDs spend only one move',async()=>{
  const h=await fixture(),path='/'+h.code+'/chamber';const rs=await Promise.all([h.call(path,{domain:'lunar',node:0,requestId:'replay-chamber-1'},h.a),h.call(path,{domain:'lunar',node:1},h.b)]);assert.ok(rs.every(r=>r.status===200));
  const latest=await h.call('/'+h.code);assert.equal(chamber(latest,'lunar').moves,2);assert.equal(chamber(latest,'lunar').contributors,2);
  await h.call(path,{domain:'lunar',node:0,requestId:'replay-chamber-1'},h.a);const again=await h.call('/'+h.code);assert.equal(chamber(again,'lunar').moves,2);
  assert.equal((await h.call(path,{domain:'lunar',node:2},h.a)).status,429);
});
test('a solved memory persists through home changes, remains solved, and a new round clears it',async()=>{
  const h=await fixture();let state=await h.call('/'+h.code),c=chamber(state,'fire'),path=solve(c.values,c.target),last;
  for(const [i,node]of path.entries()){h.advance();last=await h.call('/'+h.code+'/chamber',{domain:'fire',node},i%2?h.a:h.b);assert.equal(last.status,200);}
  assert.equal(last.result.kind,'echoComplete');assert.ok(chamber(last,'fire').completedAt);const moves=chamber(last,'fire').moves;h.advance();const same=await h.call('/'+h.code+'/chamber',{domain:'fire',node:0},h.a);assert.equal(chamber(same,'fire').moves,moves);
  await h.call('/'+h.code+'/domain',{domain:'fire'},h.a);state=await h.call('/'+h.code,undefined,h.b);assert.equal(chamber(state,'fire').moves,moves);
  const reset=await h.call('/'+h.code+'/control',{type:'reset'},h.host);assert.equal(chamber(reset,'fire').moves,0);assert.equal(chamber(reset,'fire').completedAt,null);assert.notEqual(chamber(reset,'fire').id,chamber(state,'fire').id);assert.equal(reset.state.teams.find(t=>t.eyeId==='heart').domain,'fire');
});
test('older rooms gain empty chambers without a schema migration or a read mutation',async()=>{
  const h=await fixture();const before=await h.store.get(h.code),state=await h.call('/'+h.code);assert.equal(state.teams.flatMap(t=>t.chambers).length,30);assert.deepEqual(await h.store.get(h.code),before);assert.ok(state.teams.every(t=>t.chambers.every(c=>c.moves===0)));
});
test('Twitch tune commands operate the relayed participant’s own saved home',async()=>{
  const h=await fixture(),p='/'+h.code+'/twitch',base={userId:'12345',name:'Chat explorer',channel:'demo'};await h.call(p,{...base,text:'!team dusk'},h.host);await h.call(p,{...base,text:'!domain corrupted'},h.host);const r=await h.call(p,{...base,text:'!tune 2'},h.host);assert.equal(r.status,200);assert.equal(chamber(r,'corrupted','dusk').moves,1);assert.equal(chamber(r,'corrupted','heart').moves,0);assert.equal((await h.call(p,{...base,text:'!tune 4'},h.host)).result.kind,'ignored');
});
