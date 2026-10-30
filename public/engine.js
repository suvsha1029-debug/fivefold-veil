export const COLORS = ['red', 'blue', 'amber'];
export const SHAPES = ['circle', 'triangle', 'square'];
export const EYES = Object.freeze([
  { id: 'crown', name: 'Crown', position: 'Above', mark: 'Ⅰ' },
  { id: 'dusk', name: 'Dusk', position: 'Left', mark: 'Ⅱ' },
  { id: 'heart', name: 'Heart', position: 'Centre', mark: 'Ⅲ' },
  { id: 'dawn', name: 'Dawn', position: 'Right', mark: 'Ⅳ' },
  { id: 'root', name: 'Root', position: 'Below', mark: 'Ⅴ' },
]);
export const SIGNALS = COLORS.flatMap(color => SHAPES.flatMap(shape => [1, 2, 3].map(pulses => ({ color, shape, pulses }))));
const ALL = (1 << 27) - 1;
export const signalKey = s => `${s.color}-${s.shape}-${s.pulses}`;
export const validSignal = s => s && COLORS.includes(s.color) && SHAPES.includes(s.shape) && [1,2,3].includes(s.pulses);
export const bitCount = n => { let total = 0; for (; n; n &= n - 1) total++; return total; };
const maskOf = test => SIGNALS.reduce((mask,s,i) => test(s) ? mask | (1 << i) : mask, 0);
const labels = { color: v => v, shape: v => v, pulses: v => `${v} pulse${v === 1 ? '' : 's'}` };
const attributes = [['color',COLORS],['shape',SHAPES],['pulses',[1,2,3]]];
const atomText = (a,v) => labels[a](v);
function buildRules() {
  const rules = [], seen = new Set();
  const add = (id,description,test) => { const mask = maskOf(test); if (!seen.has(mask) && mask && mask !== ALL) { seen.add(mask); rules.push({ id,description,mask,accepts:test }); } };
  for (const [a,values] of attributes) for (const v of values) {
    add(`is-${a}-${v}`, `Must be ${atomText(a,v)}.`, s => s[a] === v);
    add(`not-${a}-${v}`, `Must not be ${atomText(a,v)}.`, s => s[a] !== v);
  }
  for (let i=0;i<attributes.length;i++) for (let j=i+1;j<attributes.length;j++) {
    const [a,as] = attributes[i], [b,bs] = attributes[j];
    for (const x of as) for (const y of bs) {
      const first = atomText(a,x), second = atomText(b,y), id = `${a}-${x}-${b}-${y}`;
      add(`or-${id}`, `${first} OR ${second}; either is enough.`, s => s[a] === x || s[b] === y);
      add(`xor-${id}`, `Exactly one: ${first} or ${second}.`, s => (s[a] === x) !== (s[b] === y));
      add(`iff-${id}`, `${first} and ${second} must appear together, or both be absent.`, s => (s[a] === x) === (s[b] === y));
      add(`if-${id}`, `If ${first}, it must also be ${second}. Other signals pass.`, s => s[a] !== x || s[b] === y);
      add(`if-reverse-${id}`, `If ${second}, it must also be ${first}. Other signals pass.`, s => s[b] !== y || s[a] === x);
    }
  }
  return Object.freeze(rules);
}
export const RULE_POOL = buildRules();
export function authoredPuzzle(definition) {
  if(!Array.isArray(definition)||definition.length!==5)throw new Error('Design all five eyes.');
  const eyes=EYES.map(eye=>{
    const spec=definition.find(s=>s.id===eye.id);
    if(!spec||!Array.isArray(spec.options)||spec.options.length!==4||!['a','b','c','d'].includes(spec.correct))throw new Error(`${eye.name} needs four options and one correct answer.`);
    const options=spec.options.map((o,i)=>{
      const rule=RULE_POOL.find(r=>r.id===o.ruleId);
      if(!rule)throw new Error(`${eye.name} has an unknown rule.`);
      const label=String(o.label||'').trim().replace(/[\p{Cc}\p{Cf}]/gu,'');
      if(label.length>48)throw new Error('Option labels must be 48 characters or shorter.');
      return {id:'abcd'[i],rule,label};
    });
    if(new Set(options.map(o=>o.rule.mask)).size!==4)throw new Error(`${eye.name} needs four different rules.`);
    return {...eye,options,rule:options.find(o=>o.id===spec.correct).rule};
  });
  const remaining=eyes.reduce((mask,eye)=>mask&eye.rule.mask,ALL),count=bitCount(remaining);
  if(count!==1)throw new Error(`These five correct rules allow ${count} final signals. Adjust them until exactly one remains.`);
  if(!eyes.every((_,i)=>bitCount(eyes.reduce((mask,e,j)=>i===j?mask:mask&e.rule.mask,ALL))>1))throw new Error('One of the five correct rules is redundant. Each eye must add a necessary clue.');
  return eyes;
}
function randomFor(seed) {
  let state = 2166136261;
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0),16777619) >>> 0;
  if (!state) state = 0x9e3779b9;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
}
const shuffled = (items,random) => { const result = [...items]; for (let i=result.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [result[i],result[j]]=[result[j],result[i]]; } return result; };
export function createPuzzle(seed) {
  if (typeof seed !== 'string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(seed)) throw new Error('Use 1–40 letters, numbers, underscores, or hyphens for a case code.');
  const random = randomFor(seed), anchorIndex = Math.floor(random()*SIGNALS.length), anchor = SIGNALS[anchorIndex];
  const eligible = RULE_POOL.filter(r => r.mask & (1 << anchorIndex));
  let chosen = null;
  for (let attempt=0;attempt<6000;attempt++) {
    const sample = shuffled(eligible,random).slice(0,5);
    if (sample.reduce((m,r)=>m&r.mask,ALL) !== (1 << anchorIndex)) continue;
    if (!sample.every((_,i)=>bitCount(sample.reduce((m,r,j)=>j===i?m:m&r.mask,ALL))>1)) continue;
    chosen = sample; break;
  }
  if (!chosen) {
    const specs = [`is-color-${anchor.color}`, ...SHAPES.filter(v=>v!==anchor.shape).map(v=>`not-shape-${v}`), ...[1,2,3].filter(v=>v!==anchor.pulses).map(v=>`not-pulses-${v}`)];
    chosen = specs.map(id=>RULE_POOL.find(r=>r.id===id));
  }
  return EYES.map((eye,i) => {
    const rule = chosen[i];
    const decoys = shuffled(RULE_POOL.filter(r => r.mask!==rule.mask && bitCount(r.mask ^ rule.mask)>=6),random).slice(0,3);
    return { ...eye, rule, options:shuffled([rule,...decoys],random).map((candidate,j)=>({ id:'abcd'[j], rule:candidate })) };
  });
}

export function parseCommand(text) {
  if (typeof text!=='string' || text.length>120) return null;
  const symbols={'🔴':'red','🔵':'blue','🟡':'amber','⚪':'circle','🔺':'triangle','⬜':'square','1⃣':'1','2⃣':'2','3⃣':'3'};
  const input=text.replace(/\uFE0F/g,'').replace(/🔴|🔵|🟡|⚪|🔺|⬜|[123]\u20E3/g,s=>symbols[s]).trim().toLowerCase().replace(/\s+/g,' ');
  const eye='(crown|dusk|heart|dawn|root)';
  let match=new RegExp(`^!focus ${eye}$`).exec(input);
  if (match) return {type:'focus',eyeId:match[1]};
  match=new RegExp(`^!test (?:${eye} )?(red|blue|amber) (circle|triangle|square) ([123])$`).exec(input);
  if (match) return {type:'test',eyeId:match[1]||null,signal:{color:match[2],shape:match[3],pulses:Number(match[4])}};
  match=new RegExp(`^!solve (?:${eye} )?([a-d])$`).exec(input);
  if (match) return {type:'vote',eyeId:match[1]||null,optionId:match[2]};
  match=new RegExp(`^!cite ${eye} ([1-9]|[12][0-9]|30) ([a-d])$`).exec(input);
  if(match)return {type:'cite',eyeId:match[1],sequence:Number(match[2]),optionId:match[3]};
  match=/^!bind (red|blue|amber) (circle|triangle|square) ([123])$/.exec(input);
  if (match) return {type:'bindingVote',signal:{color:match[1],shape:match[2],pulses:Number(match[3])}};
  return null;
}

const problem = message => ({kind:'error',message});
const rankedVotes = votes => {
  const counts=new Map();
  for(const value of votes.values()) { const key=value.optionId||signalKey(value.signal); counts.set(key,(counts.get(key)||0)+1); }
  return [...counts].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]));
};

export class VeilGame {
  constructor({seed='first-light',durationMs=480000,definition=null}={}) {
    if (!Number.isInteger(durationMs) || durationMs<180000 || durationMs>720000) throw new Error('Invalid duration');
    this.seed=seed; this.durationMs=durationMs; this.remainingMs=durationMs;
    this.status='idle'; this.deadline=null; this.strikes=0; this.maxStrikes=3; this.sequence=0;
    this.endReason=null; this.finalSignal=null; this.bindingVotes=new Map(); this.bindingHistory=[];
    this.focus=new Map(); this.cooldowns=new Map(); this.testWindows=new Map(); this.participants=new Map();
    this.definition=definition?structuredClone(definition):null;
    this.eyes=(definition?authoredPuzzle(definition):createPuzzle(seed)).map(eye=>({...eye,experiments:[],citations:new Map(),votes:new Map(),wrong:new Set(),sealed:false}));
    this.maxPerEye=6;
  }
  get phase(){return this.eyes.every(e=>e.sealed)?'binding':'investigation';}
  eye(id){return this.eyes.find(e=>e.id===id);}
  eligible(eye,id){return eye.citations.has(id)||eye.experiments.some(e=>e.by===id);}
  compatible(eye){return eye.options.filter(o=>!eye.wrong.has(o.id) && eye.experiments.every(e=>o.rule.accepts(e)===e.accepted));}
  start(now=Date.now()){if(this.status!=='idle')return false;this.status='running';this.deadline=now+this.remainingMs;return true;}
  tick(now=Date.now()){if(this.status!=='running')return;this.remainingMs=Math.max(0,this.deadline-now);if(!this.remainingMs){this.status='lost';this.endReason='The veil closed before the community could bind it.';}}
  pause(now=Date.now()){this.tick(now);if(this.status!=='running')return false;this.status='paused';this.deadline=null;return true;}
  resume(now=Date.now()){if(this.status!=='paused')return false;this.status='running';this.deadline=now+this.remainingMs;return true;}
  process(text,actor,now=Date.now()) {
    const command=parseCommand(text);if(!command)return {kind:'ignored'};
    this.tick(now);if(this.status!=='running')return problem(this.status==='paused'?'The encounter is paused.':'Start an encounter before sending commands.');
    if(!actor || typeof actor.id!=='string' || !actor.id || actor.id.length>100)return problem('A valid contributor identity is required.');
    const name=String(actor.name||'Explorer').slice(0,32), source=['twitch','browser'].includes(actor.source)?actor.source:'practice';
    if(command.type==='focus'){this.focus.set(actor.id,command.eyeId);return {kind:'focus',eyeId:command.eyeId,name,message:`Now investigating ${this.eye(command.eyeId).name}.`};}
    if(now-(this.cooldowns.get(actor.id)??-Infinity)<1800)return problem('Wait two seconds between contributions.');
    if(command.type==='bindingVote'){
      if(this.phase!=='binding')return problem('Seal all five eyes before proposing the final binding.');
      if(!this.participants.has(actor.id))return problem('Contribute an experiment before voting on the binding.');
      this.bindingVotes.set(actor.id,{signal:command.signal,name});this.cooldowns.set(actor.id,now);
      return {kind:'bindingVote',signal:command.signal,name,source,command:`!bind ${command.signal.color} ${command.signal.shape} ${command.signal.pulses}`};
    }
    const eye=this.eye(command.eyeId||this.focus.get(actor.id)||actor.eyeId||'heart');
    if(!eye)return problem('Choose a valid eye.');
    if(command.type==='cite'){
      const observation=eye.experiments.find(e=>e.sequence===command.sequence),option=eye.options.find(o=>o.id===command.optionId);
      if(!observation||!option||option.rule.accepts(observation)===observation.accepted)return problem('That observation does not contradict that theory. Compare its prediction with the recorded result.');
      eye.citations.set(actor.id,{sequence:command.sequence,optionId:command.optionId,name,source});this.participants.set(actor.id,name);this.cooldowns.set(actor.id,now);
      return {kind:'cite',eyeId:eye.id,name,source,message:'Evidence linked. You have earned a vote at this eye.',command:`!cite ${eye.id} ${command.sequence} ${command.optionId}`};
    }
    if(eye.sealed)return problem(`${eye.name} is already sealed. Investigate another eye.`);
    if(command.type==='vote'){
      if(!this.eligible(eye,actor.id))return problem(`Test a signal at ${eye.name}, or cite an observation that disproves a theory, before voting there.`);
      if(!this.compatible(eye).some(o=>o.id===command.optionId))return problem('That theory is contradicted by the evidence.');
      eye.votes.set(actor.id,{optionId:command.optionId,name});this.cooldowns.set(actor.id,now);
      return {kind:'vote',eyeId:eye.id,optionId:command.optionId,name,source,command:`!solve ${eye.id} ${command.optionId}`};
    }
    const key=signalKey(command.signal);
    if(eye.experiments.some(e=>e.key===key))return problem('That signal is already in this eye’s journal. Choose another.');
    if(eye.experiments.length>=this.maxPerEye)return problem('This eye’s six experiments are used. Compare the evidence and vote.');
    const windowKey=`${actor.id}:${eye.id}`, recent=(this.testWindows.get(windowKey)||[]).filter(t=>now-t<30000);
    if(recent.length>=2)return problem('Two experiments per eye every 30 seconds. Let another researcher help, or try another eye.');
    const experiment={...command.signal,key,eyeId:eye.id,by:actor.id,name,source,accepted:eye.rule.accepts(command.signal),sequence:++this.sequence,timeLeftMs:this.remainingMs};
    eye.experiments.push(experiment);this.testWindows.set(windowKey,[...recent,now]);this.cooldowns.set(actor.id,now);this.participants.set(actor.id,name);
    const possible=new Set(this.compatible(eye).map(o=>o.id));for(const [id,vote]of eye.votes)if(!possible.has(vote.optionId))eye.votes.delete(id);
    return {kind:'test',eyeId:eye.id,experiment,name,source,command:`!test ${eye.id} ${command.signal.color} ${command.signal.shape} ${command.signal.pulses}`};
  }
  lockEye(eyeId,now=Date.now(),choice=null) {
    this.tick(now);if(this.status!=='running')return problem('Resume the encounter before sealing an eye.');
    const eye=this.eye(eyeId);if(!eye || eye.sealed)return problem('Choose an unsealed eye.');
    if(choice&&!eye.experiments.length)return problem('Record an experiment before choosing this eye’s rule.');
    const ranked=rankedVotes(eye.votes);if(!choice&&!ranked.length)return problem('A contributor must vote for a theory first.');
    if(!choice&&ranked[1]&&ranked[0][1]===ranked[1][1])return problem('The vote is tied. Ask a contributor to change their vote.');
    const option=eye.options.find(o=>o.id===(choice||ranked[0][0]));
    if(!option||!this.compatible(eye).includes(option))return problem('Choose a theory that still fits the recorded evidence.');
    if(option.rule.id===eye.rule.id){eye.sealed=true;return {kind:'sealed',eyeId:eye.id,name:eye.name,description:eye.rule.description,phase:this.phase};}
    eye.wrong.add(option.id);eye.votes.clear();this.fracture('Three incorrect locks fractured the veil.');
    return {kind:'wrong',eyeId:eye.id,message:'The guardian rejected that theory. One fracture added; compare the evidence.'};
  }
  commitBinding(now=Date.now(),choice=null) {
    this.tick(now);if(this.status!=='running' || this.phase!=='binding')return problem('Seal all five eyes and resume the encounter first.');
    if(choice&&!validSignal(choice))return problem('Choose a valid final signal.');
    const ranked=rankedVotes(this.bindingVotes);if(!choice&&!ranked.length)return problem('Chat must propose a binding signal with !bind first.');
    if(!choice&&ranked[1]&&ranked[0][1]===ranked[1][1])return problem('The binding vote is tied. Agree on one signal.');
    const signal=choice||SIGNALS.find(s=>signalKey(s)===ranked[0][0]);
    const accepted=this.eyes.every(e=>e.rule.accepts(signal));
    this.bindingHistory.push({signal:{...signal},accepted});
    if(!accepted){this.bindingVotes.clear();this.fracture('Three incorrect locks fractured the veil.');return {kind:'wrongBinding',message:'That signal does not satisfy every eye. Compare the five discoveries. One fracture added.'};}
    this.status='won';this.finalSignal={...signal};this.endReason='Five discoveries. One shared signal. The community opened the veil.';
    return {kind:'bound',signal:{...signal}};
  }
  fracture(reason){this.strikes++;if(this.strikes>=this.maxStrikes){this.status='lost';this.endReason=reason;}}
  suggest(eyeId) {
    const eye=this.eye(eyeId);if(!eye || eye.sealed)return null;
    const options=this.compatible(eye);if(options.length<2)return null;
    let best=null,bestScore=0;
    for(const signal of SIGNALS){if(eye.experiments.some(e=>e.key===signalKey(signal)))continue;const yes=options.filter(o=>o.rule.accepts(signal)).length;const score=Math.min(yes,options.length-yes);if(score>bestScore){best={...signal};bestScore=score;}}
    return best;
  }
  snapshot() {
    const ended=['won','lost'].includes(this.status);
    const eyes=this.eyes.map(eye=>{const possible=new Set(this.compatible(eye).map(o=>o.id));const counts=Object.fromEntries(eye.options.map(o=>[o.id,0]));for(const vote of eye.votes.values())counts[vote.optionId]++;return {...EYES.find(e=>e.id===eye.id),sealed:eye.sealed,experiments:eye.experiments.map(e=>({...e})),contributors:new Set(eye.experiments.map(e=>e.by)).size,voteTotal:eye.votes.size,options:eye.options.map(o=>({id:o.id,label:o.label||null,description:o.rule.description,eliminated:!possible.has(o.id),votes:counts[o.id]})),discovery:eye.sealed||ended?eye.rule.description:null};});
    const experiments=eyes.flatMap(e=>e.experiments).sort((a,b)=>a.sequence-b.sequence);
    const binding=rankedVotes(this.bindingVotes).map(([key,votes])=>({signal:{...SIGNALS.find(s=>signalKey(s)===key)},votes}));
    return {seed:this.seed,status:this.status,phase:this.phase,durationMs:this.durationMs,remainingMs:this.remainingMs,strikes:this.strikes,maxStrikes:this.maxStrikes,eyes,experiments,participants:this.participants.size,sealedCount:eyes.filter(e=>e.sealed).length,binding,bindingVoteTotal:this.bindingVotes.size,finalSignal:this.finalSignal?{...this.finalSignal}:null,endReason:this.endReason,score:this.status==='won'?1000+Math.ceil(this.remainingMs/1000)*2+Math.max(0,30-experiments.length)*20:0};
  }
  serialize(now=Date.now()) {
    this.tick(now);
    return {version:2,seed:this.seed,definition:this.definition,durationMs:this.durationMs,remainingMs:this.remainingMs,status:this.status,strikes:this.strikes,eyes:this.eyes.map(e=>({id:e.id,experiments:e.experiments.map(x=>({...x})),citations:[...e.citations],votes:[...e.votes],wrong:[...e.wrong],sealed:e.sealed})),bindingVotes:[...this.bindingVotes],bindingHistory:this.bindingHistory,finalSignal:this.finalSignal};
  }
  static restore(saved) {
    if(!saved || saved.version!==2 || !Array.isArray(saved.eyes) || saved.eyes.length!==5)throw new Error('Unrecognized saved encounter.');
    const game=new VeilGame({seed:saved.seed,durationMs:saved.durationMs,definition:saved.definition||null});
    if(!Number.isFinite(saved.remainingMs)||saved.remainingMs<0||saved.remainingMs>game.durationMs||!Number.isInteger(saved.strikes)||saved.strikes<0||saved.strikes>3)throw new Error('Invalid saved encounter.');
    let sequence=new Set();
    for(const eye of game.eyes){
      const data=saved.eyes.find(e=>e.id===eye.id);if(!data||!Array.isArray(data.experiments)||data.experiments.length>6||!Array.isArray(data.votes)||data.votes.length>1000||!Array.isArray(data.wrong)||data.wrong.length>3)throw new Error('Invalid eye data.');
      const used=new Set();
      for(const e of data.experiments){if(!validSignal(e)||e.eyeId!==eye.id||e.key!==signalKey(e)||used.has(e.key)||e.accepted!==eye.rule.accepts(e)||typeof e.by!=='string'||!e.by||e.by.length>100||typeof e.name!=='string'||e.name.length>32||!['practice','twitch','browser'].includes(e.source)||!Number.isInteger(e.sequence)||e.sequence<1||e.sequence>30||sequence.has(e.sequence)||!Number.isFinite(e.timeLeftMs)||e.timeLeftMs<0||e.timeLeftMs>game.durationMs)throw new Error('Invalid observation.');used.add(e.key);sequence.add(e.sequence);eye.experiments.push({...e});game.participants.set(e.by,e.name);}
      for(const id of data.wrong){const option=eye.options.find(o=>o.id===id);if(!option||option.rule.id===eye.rule.id)throw new Error('Invalid rejected theory.');eye.wrong.add(id);}
      eye.sealed=data.sealed===true;if(eye.sealed&&!eye.experiments.length)throw new Error('A sealed eye needs evidence.');
      for(const [id,cite] of data.citations||[]){const observation=eye.experiments.find(e=>e.sequence===cite.sequence),option=eye.options.find(o=>o.id===cite.optionId);if(typeof id!=='string'||!id||id.length>100||!observation||!option||option.rule.accepts(observation)===observation.accepted||typeof cite.name!=='string'||cite.name.length>32||!['practice','twitch','browser'].includes(cite.source))throw new Error('Invalid evidence citation.');eye.citations.set(id,{...cite});game.participants.set(id,cite.name);}
      const possible=new Set(game.compatible(eye).map(o=>o.id));
      for(const entry of data.votes){if(!Array.isArray(entry)||entry.length!==2)throw new Error('Invalid vote.');const[id,vote]=entry;if(!game.eligible(eye,id)||!possible.has(vote?.optionId)||typeof vote.name!=='string'||vote.name.length>32)throw new Error('Invalid contributor vote.');eye.votes.set(id,{optionId:vote.optionId,name:vote.name});}
    }
    if(!Array.isArray(saved.bindingVotes)||saved.bindingVotes.length>1000||!Array.isArray(saved.bindingHistory)||saved.bindingHistory.length>3)throw new Error('Invalid binding data.');
    for(const[id,vote]of saved.bindingVotes){if(!game.participants.has(id)||!validSignal(vote?.signal)||typeof vote.name!=='string'||vote.name.length>32||game.phase!=='binding')throw new Error('Invalid binding vote.');game.bindingVotes.set(id,{name:vote.name,signal:{...vote.signal}});}
    game.remainingMs=saved.remainingMs;game.strikes=saved.strikes;game.sequence=Math.max(0,...sequence);
    game.bindingHistory=saved.bindingHistory.map(x=>{if(!validSignal(x?.signal)||x.accepted!==game.eyes.every(e=>e.rule.accepts(x.signal)))throw new Error('Invalid binding history.');return {signal:{...x.signal},accepted:x.accepted};});
    if(saved.status==='won'){if(game.phase!=='binding'||!validSignal(saved.finalSignal)||!game.eyes.every(e=>e.rule.accepts(saved.finalSignal)))throw new Error('Invalid finished encounter.');game.status='won';game.finalSignal={...saved.finalSignal};game.endReason='The community opened the veil.';}
    else if(!game.remainingMs||game.strikes>=3){game.status='lost';game.endReason='This encounter ended before recovery.';}
    else game.status=saved.status==='idle'?'idle':'paused';
    return game;
  }
}

