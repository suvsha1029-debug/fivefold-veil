/** Shared public world catalogue. Worlds change presentation, never puzzle rules. */
export const DOMAINS=Object.freeze([
  {id:'taiga',name:'Taiga / Tundra',symbol:'❄',subtitle:'Where the aurora listens',description:'Snowbound conifers, open tundra and slow curtains of northern light.',detail:'Aurora · drifting snow · frost glass',asset:'/assets/domains/taiga.webp',mode:0,hue:135,accent:'#a8e5d2',base:'#0c222b',panel:'#173640',raised:'#214752',paper:'#e5efe9',ink:'#294a4b',tintA:[.12,.72,.56],tintB:[.31,.45,.82],narrative:'Under the northern lights, the forest listens.'},
  {id:'corrupted',name:'Corrupted Universe',symbol:'◈',subtitle:'A fracture in the heavens',description:'Red and purple nebulae, shattered planets, broken moons and a watchful crimson guardian.',detail:'Red haze · orbital fragments · violet circuitry',asset:'/assets/domains/corrupted.webp',mode:1,hue:0,accent:'#efb6d6',base:'#200e2d',panel:'#35203f',raised:'#4b2d57',paper:'#f1e5ee',ink:'#503a58',tintA:[.9,.08,.16],tintB:[.47,.12,.7],narrative:'Beyond the fractured moons, the crimson eyes awaken.'},
  {id:'lunar',name:'Lunar Waters',symbol:'☾',subtitle:'Beneath the silver tide',description:'A luminous moon, quiet islands and silver-blue water reflecting a vast night sky.',detail:'Moon reflection · water ripples · pearl controls',asset:'/assets/domains/lunar.webp',mode:2,hue:195,accent:'#c1ddfa',base:'#101f38',panel:'#223952',raised:'#304f6b',paper:'#e8eef7',ink:'#354c68',tintA:[.34,.6,.9],tintB:[.65,.72,.95],narrative:'The moon holds its reflection. The water keeps a secret.'},
  {id:'fire',name:'Temple of Fire',symbol:'△',subtitle:'The ember staircase',description:'A fictional Andean-inspired stepped temple, geometric terraces and volcanic light.',detail:'Rising embers · warm stone · stepped ornament',asset:'/assets/domains/fire.webp',mode:3,hue:26,accent:'#f6cf91',base:'#2b1b1c',panel:'#44302c',raised:'#654338',paper:'#f3e7d3',ink:'#5b4536',tintA:[.98,.36,.06],tintB:[.79,.14,.1],narrative:'The ember stairs remember every signal.'},
  {id:'frontier',name:'Frozen Frontier',symbol:'⟐',subtitle:'Where three worlds meet',description:'A frozen ocean meets jagged mountains and dunes of pale gold at the edge of winter.',detail:'Ice mist · desert dust · blue-gold seams',asset:'/assets/domains/frontier.webp',mode:4,hue:175,accent:'#e9d6ab',base:'#152b36',panel:'#28404b',raised:'#3a5760',paper:'#edf0e4',ink:'#43514f',tintA:[.19,.63,.82],tintB:[.85,.59,.24],narrative:'Ice, mountain and desert meet at one impossible horizon.'},
  {id:'star-sea',name:'Dark Sea of Stars',symbol:'✧',subtitle:'Sail beyond the last light',description:'An indigo cosmic ocean, scattered stars and a galaxy reflected across endless dark water.',detail:'Constellations · cosmic swells · starlit ink',asset:'/assets/domains/star-sea.webp',mode:5,hue:255,accent:'#d5c3ff',base:'#14152e',panel:'#292a49',raised:'#3e3f67',paper:'#eeeafa',ink:'#484565',tintA:[.32,.28,.77],tintB:[.55,.35,.83],narrative:'The dark sea carries a sky of untold stars.'},
]);
export const DEFAULT_TEAM_DOMAINS=Object.freeze({crown:'fire',dusk:'star-sea',heart:'taiga',dawn:'lunar',root:'frontier'});
export function domainId(value){if(value==='aurora')return 'taiga';if(value==='crimson')return 'corrupted';return DOMAINS.some(d=>d.id===value)?value:'taiga';}
export const getDomain=value=>DOMAINS.find(d=>d.id===domainId(value));
export const validDomain=value=>DOMAINS.some(d=>d.id===value);

export function teamDomainState(room,teamId){
  const current=domainId(room.teamDomains?.[teamId]||DEFAULT_TEAM_DOMAINS[teamId]);
  const voters=room.members.filter(m=>m.team===teamId);
  const counts=Object.fromEntries(DOMAINS.map(d=>[d.id,0]));
  for(const member of voters){const vote=room.domainVotes?.[member.id];if(vote?.team===teamId&&validDomain(vote.domain))counts[vote.domain]++;}
  return {domain:current,domainVotes:counts,domainVoteTotal:Object.values(counts).reduce((a,b)=>a+b,0)};
}
export function settleTeamDomain(room,teamId){
  const tally=teamDomainState(room,teamId),ranked=Object.entries(tally.domainVotes).sort((a,b)=>b[1]-a[1]);
  room.teamDomains||={...DEFAULT_TEAM_DOMAINS};
  if(ranked[0][1]>0&&ranked[0][1]>ranked[1][1])room.teamDomains[teamId]=ranked[0][0];
  return teamDomainState(room,teamId);
}
