import { DOMAINS } from './domains.js';

// A small shared linked-dial system. Art and place names are authored per world.
export const CHAMBERS=Object.freeze({
  taiga:{title:'The Listening Grove',verb:'Light',object:'lantern',symbols:['☾','❋','✧'],stations:[['Pine Watch',21,43,'pine'],['Stillwater Pool',73,65,'pool'],['Tundra Cairn',36,78,'cairn']],intro:'Follow the lantern trail through your pine forest. Every light carries an echo to the next clearing.',memory:'The forest did not answer the loudest voice. It answered the voices that listened together.'},
  corrupted:{title:'The Fracture Observatory',verb:'Stabilize',object:'orbit',symbols:['◈','◐','✷'],stations:[['Broken Moon',18,38,'moon'],['Rift Lens',76,43,'lens'],['Fallen Planet',53,80,'planet']],intro:'Broken orbits still share one gravity. Stabilizing a fragment shifts the next fragment with it.',memory:'Even a shattered sky remembers the shape of its neighbours.'},
  lunar:{title:'The Moonwell',verb:'Ripple',object:'tide',symbols:['☾','◒','◉'],stations:[['Moon Mirror',20,45,'mirror'],['Tidal Arch',79,45,'arch'],['Silver Well',51,80,'pool']],intro:'Send a ripple across the moonlit water. The next shore receives the same change.',memory:'A reflection is a message that reaches another shore.'},
  fire:{title:'The Ember Stair',verb:'Kindle',object:'brazier',symbols:['△','◈','☀'],stations:[['Western Brazier',21,67,'flame'],['Sun Terrace',50,28,'temple'],['Eastern Brazier',79,67,'flame']],intro:'Climb a fictional stepped sanctuary. Every brazier kindles the next terrace along the ember path.',memory:'The summit was never a solitary flame. It was a chain of small lights.'},
  frontier:{title:'The Threefold Crossing',verb:'Turn',object:'compass',symbols:['❄','⛰','◌'],stations:[['Ice Shelf',17,51,'ice'],['Mountain Gate',52,29,'mountain'],['Dune Beacon',81,70,'cairn']],intro:'Ice, mountain and sand share one crossing. Turning a compass also turns its neighbour.',memory:'Three impossible landscapes met where the expedition agreed to look.'},
  'star-sea':{title:'The Last-Light Anchorage',verb:'Chart',object:'star',symbols:['·','✦','✧'],stations:[['Northlight Buoy',23,35,'star'],['Wanderer’s Sail',79,52,'sail'],['Deep-Sky Beacon',37,79,'beacon']],intro:'Chart a route across dark water. Each star carries its bearing to the next light.',memory:'The sea had no road until the crew connected its stars.'},
});

export const chamberId=(room,team,domain)=>`${room.code}-${team.toUpperCase()}-${domain.toUpperCase()}-R${room.round}`;
const seedNumber=text=>{let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
export const RELAY_NAMES={taiga:'Forest echo',corrupted:'Reverse orbit',lunar:'Returning tide',fire:'Ember cascade',frontier:'Opposing bearings','star-sea':'Stellar balance'};
export function echoEffects(domain,node){
  const next=(node+1)%3,previous=(node+2)%3;
  if(domain==='corrupted')return [{node,delta:-1},{node:next,delta:1}];
  if(domain==='lunar')return [{node,delta:1},{node:previous,delta:1}];
  if(domain==='fire')return [0,1,2].filter(i=>i>=node).map(node=>({node,delta:1}));
  if(domain==='frontier')return [{node,delta:1},{node:next,delta:-1}];
  if(domain==='star-sea')return [0,1,2].map(i=>({node:i,delta:i===node?-1:1}));
  return [{node,delta:1},{node:next,delta:1}];
}
export function rotateEcho(values,node,domain='taiga'){const next=[...values];for(const e of echoEffects(domain,node))next[e.node]=(next[e.node]+e.delta+3)%3;return next;}
export function relayDescription(domain,node,placeDomain=domain){return echoEffects(domain,node).map(e=>`${CHAMBERS[placeDomain].stations[e.node][0]} ${e.delta>0?'advances':'reverses'} one phase`).join('; ')+'. Phases wrap through 1, 2, 3.';}
export const chamberRule=c=>c.ruleVersion===2?c.domain:'taiga';
export const echoAligned=chamber=>chamber.values.every((v,i)=>v===chamber.target[i]);
export function initialChamber(room,team,domain){
  const id=chamberId(room,team,domain),seed=seedNumber(id),target=[seed%3,(seed>>>5)%3,(seed>>>10)%3];
  let values=[...target];
  // Generate by legal moves; every initial room is reachable and starts unsolved.
  for(let i=0;i<3;i++)for(let count=0;count<1+((seed>>>(i*4))%2);count++)values=rotateEcho(values,i,domain);
  if(values.every((v,i)=>v===target[i]))values=rotateEcho(values,seed%3,domain);
  return {id,domain,ruleVersion:2,values,target,moves:0,completedAt:null,contributors:[],lastMove:null};
}
export function readChamber(room,team,domain){return room.chambers?.[team]?.[domain]||initialChamber(room,team,domain);}
export function chamberSummary(room,team,domain){const c=readChamber(room,team,domain);return {id:c.id,domain,ruleVersion:c.ruleVersion||1,values:c.values,target:c.target,moves:c.moves,completedAt:c.completedAt,contributors:c.contributors.length,lastMove:c.lastMove};}
export function teamChambers(room,team){return DOMAINS.map(d=>chamberSummary(room,team,d.id));}
export function tuneChamber(room,member,domain,node,now){
  const c=readChamber(room,member.team,domain);
  if(c.completedAt!==null)return {kind:'echoComplete',message:'This room’s memory is already recovered. Visit another chamber.'};
  c.values=rotateEcho(c.values,node,chamberRule(c));c.moves++;if(!c.contributors.includes(member.id))c.contributors.push(member.id);
  c.lastMove={node,name:member.name,avatar:member.avatar,at:now};
  if(echoAligned(c))c.completedAt=now;
  room.chambers||={};room.chambers[member.team]||={};room.chambers[member.team][domain]=c;
  return {kind:c.completedAt!==null?'echoComplete':'echoTuned',message:c.completedAt!==null?`${CHAMBERS[domain].title}: a room memory was recovered.`:`${CHAMBERS[domain].stations[node][0]} tuned. ${RELAY_NAMES[chamberRule(c)]} applied.`};
}
