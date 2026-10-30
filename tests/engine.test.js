import test from 'node:test';
import assert from 'node:assert/strict';
import { LabGame, RULES, COLORS, SHAPES, parseCommand } from '../dist/engine.js';

const actor = (id = 'one') => ({ id, name: `Researcher ${id}` });

test('chat parser accepts exact commands and ignores unrelated or malformed messages', () => {
  assert.deepEqual(parseCommand('  !TEST BLUE  triangle 2 '), { type: 'test', signal: { color: 'blue', shape: 'triangle', pulses: 2 } });
  assert.deepEqual(parseCommand('!solve F'), { type: 'vote', ruleId: 'f' });
  for (const bad of ['hello', '!test green circle 2', '!test red circle 99', '!solve a extra', '!test red circle 2 <script>', null]) assert.equal(parseCommand(bad), null);
});

test('no inputs are accepted before start, while paused, or after expiry', () => {
  const game = new LabGame({ secretId: 'a', durationMs: 5000 });
  assert.equal(game.process('!test red circle 2', actor(), 0).kind, 'error');
  game.start(0);
  game.pause(1000);
  assert.equal(game.process('!test red circle 2', actor(), 2000).kind, 'error');
  game.resume(10000);
  assert.equal(game.remainingMs, 4000);
  assert.equal(game.process('!test red circle 2', actor(), 14000).kind, 'error');
  assert.equal(game.status, 'lost');
  assert.equal(game.pause(14001), false);
  assert.equal(game.resume(15000), false);
});

test('all six mysteries remain consistent and can be uniquely identified by evidence', () => {
  for (const rule of RULES) {
    const game = new LabGame({ secretId: rule.id, durationMs: 1000000 });
    game.start(0);
    let n = 0;
    for (const color of COLORS) for (const shape of SHAPES) for (const pulses of [1, 2, 3]) {
      if (game.eliminated.size === 5) break;
      const result = game.process(`!test ${color} ${shape} ${pulses}`, actor(String(n++)), n * 10);
      assert.equal(result.kind, 'test');
      assert.equal(result.experiment.accepted, rule.accepts({ color, shape, pulses }));
      assert.ok(!game.eliminated.has(rule.id));
    }
    assert.equal(game.eliminated.size, 5, `Rule ${rule.id} should be identifiable within budget`);
    assert.equal(game.snapshot().revealedRule, null);
  }
});

test('duplicate experiments and spam do not consume the shared budget', () => {
  const game = new LabGame({ secretId: 'b' });
  game.start(0);
  assert.equal(game.process('!test blue circle 2', actor(), 0).kind, 'test');
  assert.equal(game.process('!test red circle 2', actor(), 100).kind, 'error');
  assert.equal(game.process('!test blue circle 2', actor('two'), 2000).kind, 'error');
  assert.equal(game.experiments.length, 1);
  assert.equal(game.participants.size, 1);
});

test('each viewer gets one changeable vote and tied theories cannot be locked', () => {
  const game = new LabGame({ secretId: 'a' });
  game.start(0);
  game.process('!solve a', actor(), 0);
  game.process('!solve b', actor(), 2000);
  assert.equal(game.voteCounts().a, 0);
  assert.equal(game.voteCounts().b, 1);
  assert.equal(game.votes.size, 1);
  game.process('!solve a', actor('two'), 2100);
  assert.equal(game.lockTheory(2200).kind, 'error');
  assert.equal(game.strikes, 0);
});

test('new evidence removes contradicted theories and their stale votes', () => {
  const game = new LabGame({ secretId: 'b' });
  game.start(0);
  game.process('!solve a', actor(), 0);
  game.process('!test red circle 1', actor('two'), 10);
  assert.ok(game.eliminated.has('a'));
  assert.equal(game.votes.size, 0);
  assert.equal(game.process('!solve a', actor(), 2000).kind, 'error');
});

test('a correct lock wins; two wrong locks lose and inputs cannot change the outcome', () => {
  const won = new LabGame({ secretId: 'f' });
  won.start(0);
  won.process('!solve f', actor(), 0);
  assert.equal(won.lockTheory(100).kind, 'solved');
  assert.equal(won.snapshot().revealedRule, 'f');
  assert.equal(won.process('!test red square 2', actor('two'), 200).kind, 'error');
  const lost = new LabGame({ secretId: 'a' });
  lost.start(0);
  lost.process('!solve b', actor(), 0);
  assert.equal(lost.lockTheory(100).kind, 'wrong');
  assert.equal(lost.status, 'running');
  lost.process('!solve c', actor(), 2000);
  lost.lockTheory(2100);
  assert.equal(lost.status, 'lost');
  assert.equal(lost.snapshot().revealedRule, 'a');
});

test('experiment budget is bounded while voting remains available', () => {
  const game = new LabGame({ secretId: 'a', durationMs: 1000000 });
  game.start(0);
  let i = 0;
  for (const color of COLORS) for (const shape of SHAPES) for (const pulses of [1, 2, 3]) {
    game.process(`!test ${color} ${shape} ${pulses}`, actor(String(i++)), i * 10);
  }
  assert.equal(game.experiments.length, 18);
  assert.equal(game.process('!solve a', actor('final'), 1000).kind, 'vote');
  assert.equal(game.lockTheory(1001).kind, 'solved');
});
