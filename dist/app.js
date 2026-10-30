import { LabGame, RULES, COLORS, SHAPES, signalKey } from './engine.js';
import { TwitchChat, beginTwitchLogin, consumeTwitchLogin, callbackUrl, savedClientId } from './twitch.js';
import { DomainScene } from './domain.js';

let login = null;
let loginError = null;
try { login = consumeTwitchLogin(); } catch (error) { loginError = error.message; }

const $ = id => document.getElementById(id);
const element = (tag, className = '', text = '') => {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
};
const scene = new DomainScene();
let gameDurationMs = 180000;
let game = new LabGame({ durationMs: gameDurationMs });
let caseNumber = 1;
let mode = 'practice';
let connection = { state: 'disconnected', message: 'Local inputs · not connected to Twitch' };
let liveActivated = false;
let feed = [];
let selectedTheory = null;
let toastTimer;
let sampleIndex = 0;
const sampleNames = ['Nora', 'Atlas', 'Juno', 'Moss', 'Theo', 'Lumi'];
const theoryNodes = new Map();

function toast(message, error = false) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').classList.toggle('error', error);
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 5200);
}

for (const rule of RULES) {
  const button = element('button', 'theory-card');
  button.type = 'button';
  button.dataset.rule = rule.id;
  const letter = element('span', 'theory-letter', rule.id.toUpperCase());
  const copy = element('span', 'theory-copy');
  copy.append(element('strong', '', rule.title), element('small', '', rule.description));
  const votes = element('span', 'theory-votes');
  votes.append(element('span', 'count', '0'), element('small', '', 'VOTES'));
  button.append(letter, copy, votes);
  button.addEventListener('click', async () => {
    if (mode === 'twitch') {
      await copyText(`!solve ${rule.id}`, 'Vote command copied. Send it in Twitch chat.');
      return;
    }
    const result = dispatch(`!solve ${rule.id}`, { id: 'practice:you', name: 'You' }, true);
    if (result.kind === 'vote') { selectedTheory = rule.id; render(); }
  });
  theoryNodes.set(rule.id, button);
  $('theory-list').append(button);
}

function builderSignal() {
  return { color: $('signal-color').value, shape: $('signal-shape').value, pulses: Number($('signal-pulses').value) };
}

function updateBuilder() {
  const signal = builderSignal();
  $('specimen-shape').className = `specimen-shape ${signal.color} ${signal.shape}`;
  $('specimen-description').textContent = `${signal.color} · ${signal.shape} · ${signal.pulses} PULSES`.toUpperCase();
  $('command-preview').textContent = `!test ${signal.color} ${signal.shape} ${signal.pulses}`;
}

function resetCase(increment = true) {
  game = new LabGame({ durationMs: gameDurationMs });
  if (increment) caseNumber += 1;
  feed = [];
  selectedTheory = null;
  $('machine-stage').dataset.result = 'idle';
  $('output-symbol').textContent = '?';
  $('output-label').textContent = 'LET’S FIND OUT';
  render();
}

function dispatch(text, actor, local = false) {
  const result = game.process(text, actor);
  if (result.kind === 'error') {
    if (local) toast(result.message, true);
    render();
    return result;
  }
  if (result.kind === 'ignored') return result;
  if (selectedTheory && game.eliminated.has(selectedTheory)) selectedTheory = null;
  feed.unshift({ ...result, actor, simulated: mode === 'practice' });
  feed = feed.slice(0, 3);
  if (result.kind === 'test') {
    const { experiment } = result;
    scene.pulse(experiment.accepted);
    $('machine-stage').dataset.result = experiment.accepted ? 'pass' : 'fail';
    $('output-symbol').textContent = experiment.accepted ? '✓' : '×';
    $('output-label').textContent = experiment.accepted ? 'SIGNAL ACCEPTED' : 'SIGNAL REJECTED';
    $('specimen-shape').className = `specimen-shape ${experiment.color} ${experiment.shape}`;
    $('specimen-description').textContent = `${experiment.color} · ${experiment.shape} · ${experiment.pulses} PULSES`.toUpperCase();
    $('machine-stage').classList.remove('signal-ping');
    void $('machine-stage').offsetWidth;
    $('machine-stage').classList.add('signal-ping');
    if (local) toast(`${experiment.accepted ? 'Accepted' : 'Rejected'}. The evidence board has been updated.`);
  }
  render();
  return result;
}

function renderEvidence(snapshot) {
  const hasExperiments = snapshot.experiments.length > 0;
  $('evidence-empty').hidden = hasExperiments;
  $('evidence-table-wrap').hidden = !hasExperiments;
  const rows = [];
  for (const experiment of snapshot.experiments.toReversed()) {
    const tr = element('tr');
    tr.append(element('td', '', String(experiment.number).padStart(2, '0')));
    const cell = element('td');
    const signal = element('span', 'signal-cell');
    const dot = element('span', `shape-dot ${experiment.color} ${experiment.shape}`);
    dot.setAttribute('aria-hidden', 'true');
    signal.append(dot, document.createTextNode(`${experiment.color} ${experiment.shape} · ${experiment.pulses}`));
    cell.append(signal);
    tr.append(cell, element('td', '', experiment.name));
    const resultCell = element('td');
    resultCell.append(element('span', `result-tag${experiment.accepted ? '' : ' fail'}`, experiment.accepted ? '✓ PASS' : '× FAIL'));
    tr.append(resultCell);
    rows.push(tr);
  }
  $('evidence-body').replaceChildren(...rows);
  $('evidence-summary').textContent = hasExperiments ? `${snapshot.experiments.length} OBSERVATION${snapshot.experiments.length === 1 ? '' : 'S'}` : 'YOUR SHARED LAB NOTES';
}

function renderFeed() {
  $('feed-empty').hidden = feed.length > 0;
  const nodes = feed.map(item => {
    const li = element('li', 'feed-item');
    const author = element('div', 'feed-author');
    author.append(element('span', 'feed-avatar', item.actor.name.slice(0, 1).toUpperCase()), document.createTextNode(item.actor.name), element('small', '', item.simulated ? 'SAMPLE' : 'TWITCH'));
    li.append(author, element('code', '', item.command));
    li.append(element('div', 'feed-outcome', item.kind === 'test' ? `Signal ${item.experiment.accepted ? 'accepted' : 'rejected'} · evidence recorded` : `Voted for theory ${item.ruleId.toUpperCase()}`));
    return li;
  });
  $('feed-list').replaceChildren(...nodes);
}

function renderClock() {
  const seconds = Math.ceil(game.remainingMs / 1000);
  $('timer').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  $('timer').classList.toggle('timer-urgent', seconds <= 30 && game.status !== 'idle');
  scene.updateClock(game.remainingMs, game.durationMs, $('timer').textContent);
}

function render() {
  const s = game.snapshot();
  const connected = mode === 'twitch' && connection.state === 'connected';
  const runnable = mode === 'practice' || connected;
  const running = s.status === 'running';
  const ended = ['won', 'lost'].includes(s.status);
  scene.setState(s.status);
  $('case-duration').disabled = running || s.status === 'paused';
  $('reset-case-button').disabled = s.status === 'idle';
  renderClock();
  $('case-label').textContent = `CASE FILE / ${String(caseNumber).padStart(3, '0')}`;
  $('experiment-count').textContent = String(s.experiments.length).padStart(2, '0');
  $('researcher-count').textContent = String(s.participants).padStart(2, '0');
  $('strike-count').textContent = `${s.strikes > 0 ? '●' : '○'} ${s.strikes > 1 ? '●' : '○'}`;
  $('strike-count').setAttribute('aria-label', `${s.strikes} of 2 incorrect guesses`);
  $('start-button').replaceChildren(document.createTextNode(ended ? 'New case' : running ? 'Pause case' : s.status === 'paused' ? 'Resume case' : connected ? 'Start live case' : 'Start practice'), element('span', '', running ? 'Ⅱ' : '↗'));
  $('start-button').disabled = !runnable;
  $('machine-status').textContent = ended ? 'CASE CLOSED' : s.status === 'paused' ? 'EXPERIMENT PAUSED' : running ? 'EXPERIMENT IN PROGRESS' : 'AWAITING INPUT';
  const pill = $('mode-pill');
  pill.classList.toggle('live', connected);
  pill.replaceChildren(element('span', 'status-dot'), document.createTextNode(mode === 'practice' ? ' PRACTICE' : connected ? ' TWITCH CHAT' : ' TWITCH OFFLINE'));
  $('mode-description').textContent = mode === 'practice' ? 'Local inputs · not connected to Twitch' : connected ? `@${connection.channel} · real chat commands` : connection.message;
  $('feed-source').textContent = mode === 'practice' ? 'PRACTICE · SIMULATED CHAT' : connected ? `TWITCH · @${connection.channel}` : 'TWITCH · DISCONNECTED';
  $('sample-button').hidden = mode !== 'practice';
  $('sample-button').disabled = !running;
  $('builder-mode').textContent = mode === 'practice' ? 'PRACTICE INPUT' : 'SEND IN TWITCH CHAT';
  $('test-button').replaceChildren(document.createTextNode(mode === 'practice' ? 'Test signal' : 'Copy command'), element('span', '', '→'));
  $('test-button').disabled = mode === 'practice' && !running;
  $('theory-help').textContent = mode === 'practice' ? 'Test to eliminate theories. Select one to cast a practice vote.' : 'Chat votes with !solve a–f. Select a theory to copy its command.';
  for (const rule of RULES) {
    const node = theoryNodes.get(rule.id);
    const eliminated = s.eliminated.includes(rule.id);
    node.classList.toggle('eliminated', eliminated);
    node.classList.toggle('selected', rule.id === selectedTheory || (ended && rule.id === s.revealedRule));
    node.querySelector('.count').textContent = eliminated ? '×' : String(s.votes[rule.id]);
    node.querySelector('.theory-votes small').textContent = eliminated ? 'OUT' : 'VOTES';
    node.disabled = !running || eliminated;
    node.setAttribute('aria-pressed', String(selectedTheory === rule.id));
    node.setAttribute('aria-label', `Theory ${rule.id.toUpperCase()}: ${rule.description} ${eliminated ? 'Eliminated.' : `${s.votes[rule.id]} votes. ${mode === 'practice' ? 'Cast a practice vote.' : 'Copy chat command.'}`}`);
  }
  $('theory-count').textContent = `${RULES.length - s.eliminated.length} POSSIBLE`;
  $('vote-summary').textContent = s.voteTotal ? `${s.voteTotal} RESEARCHER${s.voteTotal === 1 ? '' : 'S'} VOTED` : 'NO VOTES YET';
  $('lock-button').disabled = !running || !s.voteTotal;
  renderEvidence(s);
  renderFeed();
  $('result-panel').hidden = !ended;
  if (ended) {
    const rule = RULES.find(r => r.id === s.revealedRule);
    $('result-panel').classList.toggle('lost', s.status === 'lost');
    $('result-eyebrow').textContent = s.status === 'won' ? 'DISCOVERY MADE / CASE CLOSED' : 'CASE CLOSED / KEEP YOUR CURIOSITY';
    $('result-title').textContent = s.status === 'won' ? 'You cracked the signal.' : 'A mystery for another day.';
    $('result-description').textContent = `${s.endReason} ${s.experiments.length} experiments · ${s.participants} researchers.`;
    $('revealed-rule').textContent = `The hidden rule was ${rule.id.toUpperCase()}: ${rule.description}`;
  }
  $('connect-label').textContent = connected ? `@${connection.channel}` : connection.state === 'connecting' ? 'Connecting…' : 'Connect Twitch';
  document.querySelector('.connection-dot').classList.toggle('live', connected);
  $('connected-details').hidden = mode === 'practice';
  $('connected-channel').textContent = connected ? `Reading chat from @${connection.channel}. The game listens for !test and !solve commands.` : connection.message;
  $('connect-form').hidden = connected;
}

const twitch = new TwitchChat({
  onMessage: message => dispatch(message.text, { id: message.id, name: message.name }),
  onStatus: status => {
    connection = status;
    if (status.state === 'connected') {
      mode = 'twitch';
      if (!liveActivated) { liveActivated = true; resetCase(false); }
      toast(`Connected to @${status.channel}. Start a live case, then send !test commands in Twitch chat.`);
      if ($('connect-dialog').open) $('connect-dialog').close();
    } else if (['connecting', 'reconnecting', 'error'].includes(status.state)) {
      mode = 'twitch';
      game.pause();
      if (status.state === 'error') {
        $('connect-error').textContent = status.message;
        $('connect-error').hidden = false;
        toast(status.message, true);
      }
    }
    render();
  },
});

function startOrPause() {
  if (mode === 'twitch' && connection.state !== 'connected') { toast('Reconnect Twitch before resuming this case.', true); return; }
  if (game.status === 'idle') game.start();
  else if (game.status === 'running') game.pause();
  else if (game.status === 'paused') game.resume();
  else { resetCase(); game.start(); }
  render();
}

$('start-button').addEventListener('click', startOrPause);
$('new-case-button').addEventListener('click', () => { resetCase(); startOrPause(); $('workbench').scrollIntoView({ block: 'start', behavior: 'smooth' }); });
for (const id of ['signal-color', 'signal-shape', 'signal-pulses']) $(id).addEventListener('change', updateBuilder);
$('test-button').addEventListener('click', async () => {
  const s = builderSignal();
  const command = `!test ${s.color} ${s.shape} ${s.pulses}`;
  if (mode === 'twitch') { await copyText(command, 'Experiment command copied. Send it in Twitch chat.'); return; }
  dispatch(command, { id: 'practice:you', name: 'You' }, true);
});

$('sample-button').addEventListener('click', () => {
  const used = new Set(game.experiments.map(e => e.key));
  const remaining = [];
  for (const color of COLORS) for (const shape of SHAPES) for (const pulses of [1, 2, 3]) {
    const s = { color, shape, pulses };
    if (!used.has(signalKey(s))) remaining.push(s);
  }
  if (!remaining.length) { toast('All combinations have been tested. Time to choose a theory.'); return; }
  const s = remaining[Math.floor(Math.random() * remaining.length)];
  const sampleId = sampleIndex++;
  dispatch(`!test ${s.color} ${s.shape} ${s.pulses}`, { id: `practice:sample:${sampleId}`, name: sampleNames[sampleId % sampleNames.length] }, true);
});

$('lock-button').addEventListener('click', () => {
  const result = game.lockTheory();
  if (result.kind === 'error' || result.kind === 'wrong') toast(result.message, true);
  if (result.kind === 'wrong') selectedTheory = null;
  if (result.kind === 'solved') toast('Case cracked. That was the hidden rule!');
  render();
  if (['won', 'lost'].includes(game.status)) $('result-panel').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
});

async function copyText(text, message) {
  try { await navigator.clipboard.writeText(text); toast(message); }
  catch { toast('Clipboard unavailable. Select and copy the command or URL shown on screen.', true); }
}

$('help-button').addEventListener('click', () => $('help-dialog').showModal());
$('footer-help-button').addEventListener('click', () => $('help-dialog').showModal());
$('effects-button').addEventListener('click', () => scene.setEnabled(!scene.enabled));
$('reset-case-button').addEventListener('click', () => {
  resetCase();
  toast('A fresh case is ready. Choose a timer, then start when you are ready.');
});
for (const button of document.querySelectorAll('.domain-tab[data-domain]')) button.addEventListener('click', () => scene.setTheme(button.dataset.domain));
$('case-duration').addEventListener('change', () => {
  if (!['idle', 'won', 'lost'].includes(game.status)) return;
  const duration = Number($('case-duration').value);
  if (![180000, 300000, 480000].includes(duration)) return;
  gameDurationMs = duration;
  resetCase(game.status !== 'idle');
});
$('connect-button').addEventListener('click', () => $('connect-dialog').showModal());
for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', () => $(button.dataset.close).close());
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
$('callback-url').textContent = callbackUrl();
$('client-id').value = savedClientId();
$('copy-callback').addEventListener('click', () => copyText(callbackUrl(), 'Redirect URL copied. Add it to your Twitch application.'));
$('connect-form').addEventListener('submit', event => {
  event.preventDefault();
  try { beginTwitchLogin($('client-id').value); }
  catch (error) { $('connect-error').textContent = error.message; $('connect-error').hidden = false; }
});
$('disconnect-button').addEventListener('click', () => {
  twitch.disconnect(false);
  mode = 'practice';
  liveActivated = false;
  connection = { state: 'disconnected', message: 'Local inputs · not connected to Twitch' };
  $('connect-error').hidden = true;
  resetCase();
  $('connect-dialog').close();
  toast('Returned to practice. Inputs here are simulated.');
});

function toggleStream(force) {
  const active = typeof force === 'boolean' ? force : !document.body.classList.contains('stream-view');
  document.body.classList.toggle('stream-view', active);
  $('stream-button').setAttribute('aria-pressed', String(active));
  $('exit-stream-button').hidden = !active;
  if (active) toast('Capture this window in OBS. Use Exit stream view or Escape to return to controls.');
}
$('stream-button').addEventListener('click', () => toggleStream());
$('exit-stream-button').addEventListener('click', () => toggleStream(false));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !document.querySelector('dialog[open]')) toggleStream(false);
  if (event.key === '?' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName) && !document.querySelector('dialog[open]')) $('help-dialog').showModal();
});

updateBuilder();
render();
setInterval(() => {
  const before = game.status;
  game.tick();
  renderClock();
  if (before !== game.status) { render(); if (game.status === 'lost') toast('Time is up. The hidden rule is revealed below.'); }
}, 250);

if (loginError) toast(loginError, true);
if (login) { twitch.connect(login.token, login.clientId); login = null; }
window.addEventListener('beforeunload', () => { twitch.disconnect(false); scene.destroy(); });
