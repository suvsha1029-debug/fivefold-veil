export const COLORS = ['red', 'blue', 'amber'];
export const SHAPES = ['circle', 'triangle', 'square'];
export const RULES = Object.freeze([
  { id: 'a', title: 'Red / round', description: 'Red signals OR circles pass.', accepts: s => s.color === 'red' || s.shape === 'circle' },
  { id: 'b', title: 'Blue double', description: 'Only blue signals with 2 pulses pass.', accepts: s => s.color === 'blue' && s.pulses === 2 },
  { id: 'c', title: 'Three / triangle', description: 'Triangles OR signals with 3 pulses pass.', accepts: s => s.shape === 'triangle' || s.pulses === 3 },
  { id: 'd', title: 'Amber / single', description: 'Amber signals OR signals with 1 pulse pass.', accepts: s => s.color === 'amber' || s.pulses === 1 },
  { id: 'e', title: 'Square rhythm', description: 'Only squares with 2 or 3 pulses pass.', accepts: s => s.shape === 'square' && s.pulses >= 2 },
  { id: 'f', title: 'Blue / double', description: 'Blue signals OR signals with 2 pulses pass.', accepts: s => s.color === 'blue' || s.pulses === 2 },
]);

export function parseCommand(text) {
  if (typeof text !== 'string' || text.length > 100) return null;
  const input = text.trim().toLowerCase();
  const test = /^!test (red|blue|amber) (circle|triangle|square) ([123])$/.exec(input.replace(/\s+/g, ' '));
  if (test) return { type: 'test', signal: { color: test[1], shape: test[2], pulses: Number(test[3]) } };
  const vote = /^!solve ([a-f])$/.exec(input.replace(/\s+/g, ' '));
  if (vote) return { type: 'vote', ruleId: vote[1] };
  return null;
}

export const signalKey = s => `${s.color}-${s.shape}-${s.pulses}`;

export class LabGame {
  constructor({ secretId = RULES[Math.floor(Math.random() * RULES.length)].id, durationMs = 180000 } = {}) {
    if (!RULES.some(r => r.id === secretId)) throw new Error('Unknown rule');
    this.secretId = secretId;
    this.durationMs = durationMs;
    this.remainingMs = durationMs;
    this.status = 'idle';
    this.deadline = null;
    this.experiments = [];
    this.votes = new Map();
    this.participants = new Set();
    this.cooldowns = new Map();
    this.eliminated = new Set();
    this.strikes = 0;
    this.endReason = null;
    this.maxExperiments = 18;
  }

  start(now = Date.now()) {
    if (this.status !== 'idle') return false;
    this.status = 'running';
    this.deadline = now + this.remainingMs;
    return true;
  }

  tick(now = Date.now()) {
    if (this.status !== 'running') return;
    this.remainingMs = Math.max(0, this.deadline - now);
    if (!this.remainingMs) {
      this.status = 'lost';
      this.endReason = 'Time ran out. Every experiment brought you closer.';
    }
  }

  pause(now = Date.now()) {
    this.tick(now);
    if (this.status !== 'running') return false;
    this.status = 'paused';
    this.deadline = null;
    return true;
  }

  resume(now = Date.now()) {
    if (this.status !== 'paused') return false;
    this.status = 'running';
    this.deadline = now + this.remainingMs;
    return true;
  }

  process(text, { id, name = 'Researcher' }, now = Date.now()) {
    const command = parseCommand(text);
    if (!command) return { kind: 'ignored' };
    this.tick(now);
    if (this.status !== 'running') return { kind: 'error', message: this.status === 'paused' ? 'The experiment is paused.' : 'Start a case to send signals.' };
    if (!id) return { kind: 'error', message: 'A researcher identity is required.' };
    if (now - (this.cooldowns.get(id) ?? -Infinity) < 1800) return { kind: 'error', message: 'Give the machine a moment. Try again in 2 seconds.' };

    if (command.type === 'vote') {
      if (this.eliminated.has(command.ruleId)) return { kind: 'error', message: 'That theory is contradicted by the evidence. Choose another.' };
      this.votes.set(id, { ruleId: command.ruleId, name: name.slice(0, 32) });
      this.participants.add(id);
      this.cooldowns.set(id, now);
      return { kind: 'vote', ruleId: command.ruleId, name: name.slice(0, 32), command: `!solve ${command.ruleId}` };
    }

    const key = signalKey(command.signal);
    if (this.experiments.some(e => e.key === key)) return { kind: 'error', message: 'We tested that signal already. Try a different combination.' };
    if (this.experiments.length >= this.maxExperiments) return { kind: 'error', message: 'Experiment budget reached. Use the evidence to choose a theory.' };
    const accepted = RULES.find(r => r.id === this.secretId).accepts(command.signal);
    const experiment = { ...command.signal, key, accepted, name: name.slice(0, 32), number: this.experiments.length + 1 };
    this.experiments.push(experiment);
    this.participants.add(id);
    this.cooldowns.set(id, now);
    for (const rule of RULES) if (rule.accepts(command.signal) !== accepted) this.eliminated.add(rule.id);
    for (const [user, vote] of this.votes) if (this.eliminated.has(vote.ruleId)) this.votes.delete(user);
    return { kind: 'test', experiment, command: text.trim().toLowerCase() };
  }

  lockTheory(now = Date.now()) {
    this.tick(now);
    if (this.status !== 'running') return { kind: 'error', message: 'The case must be running to lock a theory.' };
    const counts = this.voteCounts();
    const ranked = Object.entries(counts).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    if (!ranked.length) return { kind: 'error', message: 'Ask chat to vote with !solve a, or select a theory in practice.' };
    if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) return { kind: 'error', message: 'The vote is tied. Ask one researcher to change their vote.' };
    const ruleId = ranked[0][0];
    if (ruleId === this.secretId) {
      this.status = 'won';
      this.endReason = 'The evidence is in. You cracked the signal together.';
      return { kind: 'solved', ruleId };
    }
    this.strikes += 1;
    this.eliminated.add(ruleId);
    this.votes.clear();
    if (this.strikes >= 2) {
      this.status = 'lost';
      this.endReason = 'Two incorrect locks. A fresh case is a fresh start.';
    }
    return { kind: 'wrong', ruleId, message: 'Theory rejected. Compare the evidence and vote again.' };
  }

  voteCounts() {
    const counts = Object.fromEntries(RULES.map(r => [r.id, 0]));
    for (const vote of this.votes.values()) counts[vote.ruleId] += 1;
    return counts;
  }

  snapshot() {
    return {
      status: this.status, remainingMs: this.remainingMs,
      experiments: this.experiments.map(e => ({ ...e })),
      participants: this.participants.size, votes: this.voteCounts(), voteTotal: this.votes.size,
      eliminated: [...this.eliminated], strikes: this.strikes, maxExperiments: this.maxExperiments,
      endReason: this.endReason,
      revealedRule: ['won', 'lost'].includes(this.status) ? this.secretId : null,
    };
  }
}
