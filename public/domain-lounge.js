import { DOMAINS, getDomain, validDomain } from './domains.js';
import { makeSigil } from './domain-sigils.js';
import { DomainAudio } from './domain-audio.js';

const node = (tag, className = '', text = '') => {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
};

const soundNames = {
  taiga: 'Northern hush', corrupted: 'Fractured orbit', lunar: 'Silver currents',
  fire: 'Ember procession', frontier: 'Horizon winds', 'star-sea': 'Astral drift',
};

/** An expedition's six shared lounges. Scene and audio controls are local. */
export class DomainLounge {
  constructor({ getState, isBusy, action, toast, scene, worlds }) {
    Object.assign(this, { getState, isBusy, action, toast, scene, worlds });
    this.audio = new DomainAudio();
    this.domain = 'taiga';
    this.chatSignature = '';
    this.memeSignature = '';
    this.motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.dialog = node('dialog', 'domain-lounge');
    this.dialog.id = 'domain-lounge';
    this.dialog.setAttribute('aria-labelledby', 'lounge-title');
    this.dialog.innerHTML = `
      <div class="lounge-backdrop" aria-hidden="true"></div>
      <div class="lounge-aurora" aria-hidden="true"></div>
      <div class="lounge-particles" aria-hidden="true"></div>
      <div class="lounge-shell">
        <header class="lounge-header">
          <span class="lounge-brand">FIVEFOLD VEIL <span>/ THE COMMON GROUNDS</span></span>
          <span class="lounge-room-code"></span>
          <button type="button" class="lounge-share text-button">Copy lounge invite</button>
          <button type="button" class="lounge-close outline-button">Return to expedition ↗</button>
        </header>
        <div class="lounge-layout">
          <section class="lounge-world" aria-label="Domain atmosphere">
            <p class="eyebrow lounge-coordinate"></p>
            <h2 id="lounge-title"></h2>
            <p class="lounge-subtitle"></p>
            <div class="lounge-grove-controls" hidden>
              <button type="button" class="lounge-grove-toggle outline-button">Explore original 3D grove ↗</button>
              <div class="lounge-grove-views" hidden role="group" aria-label="Grove viewpoint">
                <button type="button" class="text-button" data-view="garden">Garden</button>
                <button type="button" class="text-button" data-view="pond">Pond</button>
                <button type="button" class="text-button" data-view="sky">Sky</button>
              </div>
              <span class="lounge-grove-status" role="status"></span>
            </div>
            <div class="lounge-scenic-space" aria-hidden="true"><span class="lounge-orbit"></span><span class="lounge-scenic-sigil"></span></div>
            <div class="lounge-now-playing">
              <p class="eyebrow">A SOUNDTRACK FOR THIS HORIZON</p>
              <strong class="lounge-sound-name"></strong>
              <div class="lounge-sound-controls">
                <button type="button" class="lounge-sound outline-button" aria-pressed="false">Enable ambient music</button>
                <label>Volume<input class="lounge-volume" type="range" min="0" max="0.5" step="0.01" value="0.18"></label>
                <button type="button" class="lounge-motion text-button" aria-pressed="false">Pause atmosphere</button>
              </div>
              <p class="lounge-audio-status" role="status">Music starts when you enable it. Headphones welcome.</p>
            </div>
          </section>
          <section class="lounge-conversation" aria-label="Domain conversation and memes">
            <div class="lounge-panel-heading"><div><p class="eyebrow">ONE EXPEDITION / A SHARED PLACE</p><h3>Stay a little longer.</h3></div><span class="lounge-channel-mark"></span></div>
            <div class="lounge-tabs" role="tablist" aria-label="Lounge content">
              <button type="button" id="lounge-chat-tab" role="tab" aria-selected="true" aria-controls="lounge-chat-panel">Conversation <span class="lounge-chat-count">0</span></button>
              <button type="button" id="lounge-memes-tab" role="tab" aria-selected="false" aria-controls="lounge-memes-panel" tabindex="-1">Meme wall <span class="lounge-meme-count">0</span></button>
            </div>
            <div id="lounge-chat-panel" class="lounge-tabpanel" role="tabpanel" aria-labelledby="lounge-chat-tab">
              <div class="lounge-chat-log" role="log" aria-label="Domain messages" aria-live="polite" aria-relevant="additions"></div>
              <form class="lounge-compose">
                <label for="lounge-message">A thought for this domain</label>
                <div><input id="lounge-message" maxlength="240" autocomplete="off" placeholder="Compare a theory. Welcome a stranger…" required><button class="primary-button" type="submit">Send ↗</button></div>
                <p class="lounge-chat-note"></p>
              </form>
              <button type="button" class="lounge-join text-button" hidden>Join this expedition to chat ↗</button>
              <div class="lounge-moderation" hidden><button type="button" class="lounge-chat-toggle text-button"></button><button type="button" class="lounge-chat-clear text-button">Clear this domain’s chat</button></div>
            </div>
            <div id="lounge-memes-panel" class="lounge-tabpanel" role="tabpanel" aria-labelledby="lounge-memes-tab" hidden>
              <p class="lounge-meme-note">Revealed, host-approved Council memes from this domain. The host directs the live stage.</p>
              <div class="lounge-meme-wall"></div>
              <button type="button" class="lounge-council outline-button">Open the Council ↗</button>
            </div>
            <p class="lounge-feedback" role="status"></p>
          </section>
        </div>
        <footer class="lounge-footer"><div class="lounge-domains" role="group" aria-label="Visit a domain lounge"></div><p>EXPLORE TOGETHER. LEAVE A LITTLE LIGHT.</p></footer>
      </div>`;
    document.body.append(this.dialog);
    this.q = selector => this.dialog.querySelector(selector);
    const entry = node('button', 'outline-button lounge-enter', 'Enter domain lounge ↗');
    entry.id = 'enter-lounge';
    entry.type = 'button';
    document.querySelector('.room-actions').prepend(entry);
    entry.addEventListener('click', () => this.open());
    const homeEntry = node('button', 'outline-button', 'Gather in this domain ↗');
    homeEntry.type = 'button';
    homeEntry.addEventListener('click', () => this.open());
    document.querySelector('.realm-buttons').prepend(homeEntry);
    this.q('.lounge-close').addEventListener('click', () => this.dialog.close());
    this.q('.lounge-share').addEventListener('click', async () => {
      const url = new URL('/teams', location.origin);
      url.searchParams.set('room', this.getState().code);
      url.searchParams.set('view', 'watch');
      url.searchParams.set('lounge', this.domain);
      try {
        await navigator.clipboard.writeText(url.href);
        this.q('.lounge-feedback').textContent = 'Lounge invite copied. Viewers can watch or join a seat.';
      } catch { this.q('.lounge-feedback').textContent = 'Use the expedition invite and choose this domain from the lounge.'; }
    });
    this.dialog.addEventListener('close', () => this.leave());
    for (const domain of DOMAINS) {
      const button = node('button', 'lounge-domain');
      button.type = 'button';
      button.dataset.domain = domain.id;
      button.append(makeSigil(domain.id), node('span', '', domain.name));
      button.addEventListener('click', () => this.visit(domain.id));
      this.q('.lounge-domains').append(button);
    }
    for (let index = 0; index < 16; index++) {
      const mote = node('i');
      mote.style.setProperty('--left', `${(index * 29 + 13) % 100}%`);
      mote.style.setProperty('--delay', `${-index * 1.3}s`);
      this.q('.lounge-particles').append(mote);
    }
    this.q('.lounge-compose').addEventListener('submit', async event => {
      event.preventDefault();
      const input = this.q('#lounge-message');
      const result = await this.send({ type: 'send', domain: this.domain, text: input.value });
      if (result) input.value = '';
    });
    this.q('.lounge-chat-toggle').addEventListener('click', () => this.send({ type: 'enable', enabled: this.getState().lounge?.enabled === false }));
    this.q('.lounge-chat-clear').addEventListener('click', () => this.send({ type: 'clear', domain: this.domain }));
    this.q('.lounge-sound').addEventListener('click', () => this.toggleAudio());
    this.q('.lounge-volume').addEventListener('input', event => this.audio.setVolume(Number(event.target.value)));
    this.q('.lounge-motion').addEventListener('click', () => {
      this.motion = !this.motion;
      this.updateMotion();
    });
    this.q('.lounge-grove-toggle').addEventListener('click', () => this.toggleGrove());
    for (const button of this.dialog.querySelectorAll('[data-view]')) {
      button.addEventListener('click', () => {
        this.groveView = button.dataset.view;
        this.syncGrove();
      });
    }
    this.onGroveMessage = event => {
      if (event.source !== this.grove?.contentWindow || event.origin !== location.origin) return;
      if (event.data?.type === 'veil-sanctuary-ready') {
        this.groveReady = true;
        this.dialog.dataset.grove = 'ready';
        this.q('.lounge-grove-status').textContent = 'Original moonlit grove · drag the open scenery to explore.';
        this.syncGrove();
      } else if (event.data?.type === 'veil-sanctuary-error') {
        this.removeGrove();
        this.q('.lounge-grove-status').textContent = 'The grove could not start. Your scenic lounge is ready to use.';
      }
    };
    window.addEventListener('message', this.onGroveMessage);
    this.q('.lounge-council').addEventListener('click', () => {
      this.dialog.close();
      document.getElementById('council').scrollIntoView({ block: 'start', behavior: this.motion ? 'smooth' : 'instant' });
    });
    this.q('.lounge-join').addEventListener('click', () => {
      this.dialog.close();
      document.getElementById('watch-join').click();
    });
    this.tab = 'chat';
    for (const name of ['chat', 'memes']) {
      const tab = this.q(`#lounge-${name}-tab`);
      tab.addEventListener('click', () => this.selectTab(name));
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const destination = event.key === 'Home' ? 'chat' : event.key === 'End' ? 'memes' : name === 'chat' ? 'memes' : 'chat';
        this.selectTab(destination);
        this.q(`#lounge-${this.tab}-tab`).focus();
      });
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stopAudio();
      this.updateMotion();
    });
  }

  open(domain) {
    const state = this.getState();
    if (!state) return;
    const team = state.teams.find(team => team.eyeId === state.me?.team);
    this.domain = validDomain(domain) ? domain : this.worlds.preview || team?.domain || this.worlds.team()?.domain || 'taiga';
    this.returnWorld = this.worlds.preview;
    this.dialog.showModal();
    document.body.classList.add('in-lounge');
    this.scene.setChamberOpen(true);
    this.visit(this.domain);
  }

  visit(domain) {
    if (!validDomain(domain)) return;
    this.domain = domain;
    this.chatSignature = this.memeSignature = '';
    const world = getDomain(domain);
    this.dialog.dataset.domain = domain;
    this.dialog.style.setProperty('--lounge-image', `url("${world.asset}")`);
    this.dialog.style.setProperty('--lounge-accent', world.accent);
    this.q('#lounge-title').textContent = world.name + '.';
    this.q('.lounge-subtitle').textContent = world.subtitle + '. ' + world.description;
    this.q('.lounge-coordinate').textContent = `DOMAIN 0${world.mode + 1} / THE COMMON GROUNDS`;
    this.q('.lounge-sound-name').textContent = soundNames[domain];
    const groveDomain = ['taiga', 'lunar'].includes(domain);
    this.q('.lounge-grove-controls').hidden = !groveDomain;
    if (!groveDomain) this.removeGrove();
    this.q('.lounge-scenic-sigil').replaceChildren(makeSigil(domain));
    this.q('.lounge-channel-mark').replaceChildren(makeSigil(domain));
    for (const button of this.q('.lounge-domains').children) button.setAttribute('aria-pressed', String(button.dataset.domain === domain));
    this.audio.setDomain(domain);
    this.updateMotion();
    this.render();
  }

  leave() {
    this.stopAudio();
    this.removeGrove();
    document.body.classList.remove('in-lounge');
    this.scene.setChamberOpen(false);
  }

  selectTab(name) {
    this.tab = name;
    for (const tab of ['chat', 'memes']) {
      const selected = tab === name;
      this.q(`#lounge-${tab}-tab`).setAttribute('aria-selected', String(selected));
      this.q(`#lounge-${tab}-tab`).tabIndex = selected ? 0 : -1;
      this.q(`#lounge-${tab}-panel`).hidden = !selected;
    }
  }

  updateMotion() {
    this.dialog.dataset.motion = String(this.motion && !document.hidden && this.dialog.open);
    this.q('.lounge-motion').textContent = this.motion ? 'Pause atmosphere' : 'Resume atmosphere';
    this.q('.lounge-motion').setAttribute('aria-pressed', String(!this.motion));
    this.syncGrove();
  }

  toggleGrove() {
    if (this.grove) { this.removeGrove(); return; }
    const frame = node('iframe', 'lounge-grove');
    frame.title = 'Your original interactive moonlit grove';
    frame.src = '/assets/sanctuary/index.html';
    frame.setAttribute('tabindex', '-1');
    this.grove = frame;
    this.groveView = 'garden';
    this.groveReady = false;
    this.dialog.prepend(frame);
    this.groveObserver = new IntersectionObserver(entries => {
      this.groveVisible = entries[0].isIntersecting;
      this.syncGrove();
    });
    this.groveObserver.observe(frame);
    this.q('.lounge-grove-toggle').textContent = 'Return to scenic backdrop';
    this.q('.lounge-grove-views').hidden = false;
    this.q('.lounge-grove-status').textContent = 'Opening your original grove…';
    this.groveTimeout = setTimeout(() => {
      if (this.grove && !this.groveReady) {
        this.removeGrove();
        this.q('.lounge-grove-status').textContent = 'The grove took too long to open. Try again when your connection is ready.';
      }
    }, 20000);
  }

  syncGrove() {
    if (!this.groveReady) return;
    this.grove.contentWindow.postMessage({
      type: 'veil-sanctuary', active: this.dialog.open && !document.hidden && this.groveVisible !== false,
      motion: this.motion, domain: this.domain, view: this.groveView,
    }, location.origin);
  }

  removeGrove() {
    clearTimeout(this.groveTimeout);
    this.groveObserver?.disconnect();
    this.groveObserver = null;
    this.groveVisible = false;
    this.grove?.remove();
    this.grove = null;
    this.groveReady = false;
    delete this.dialog.dataset.grove;
    this.q('.lounge-grove-toggle').textContent = 'Explore original 3D grove ↗';
    this.q('.lounge-grove-views').hidden = true;
    this.q('.lounge-grove-status').textContent = '';
  }

  async toggleAudio() {
    if (this.audio.enabled) { this.stopAudio(); return; }
    const button = this.q('.lounge-sound');
    button.disabled = true;
    try {
      const started = await this.audio.start(this.domain, Number(this.q('.lounge-volume').value));
      if (!started) { this.stopAudio(); return; }
      if (!this.dialog.open || document.hidden) { this.stopAudio(); return; }
      button.textContent = 'Mute ambient music';
      button.setAttribute('aria-pressed', 'true');
      this.q('.lounge-audio-status').textContent = 'Original synthesized ambience · playing on this device.';
    } catch (error) {
      this.q('.lounge-audio-status').textContent = error.message || 'Audio is unavailable in this browser.';
    } finally { button.disabled = false; }
  }

  stopAudio() {
    this.audio.stop();
    this.q('.lounge-sound').textContent = 'Enable ambient music';
    this.q('.lounge-sound').setAttribute('aria-pressed', 'false');
    this.q('.lounge-audio-status').textContent = 'Music is off. Enable it whenever you want.';
  }

  async send(body) {
    const result = await this.action('lounge', body);
    if (result) this.q('.lounge-feedback').textContent = result.message || 'Updated.';
    return result;
  }

  reportError(message) {
    if (this.dialog.open) this.q('.lounge-feedback').textContent = message;
  }

  render() {
    const state = this.getState();
    if (!state) { if (this.dialog.open) this.dialog.close(); return; }
    if (!this.dialog.open) return;
    this.q('.lounge-room-code').textContent = state.code + ' / ' + this.domain.toUpperCase();
    const messages = state.lounge?.channels?.[this.domain] || [];
    const canChat = state.isHost || !!state.me;
    const enabled = state.lounge?.enabled !== false;
    this.q('.lounge-compose').hidden = !canChat;
    this.q('.lounge-join').hidden = canChat;
    this.q('.lounge-moderation').hidden = !state.isHost;
    this.q('.lounge-chat-toggle').textContent = enabled ? 'Pause lounge chat' : 'Reopen lounge chat';
    this.q('#lounge-message').disabled = !enabled || this.isBusy();
    this.q('.lounge-compose button').disabled = !enabled || this.isBusy();
    this.q('.lounge-chat-note').textContent = enabled ? 'Visible to this expedition and on broadcast. Latest 24 messages per domain · updates every 3s.' : 'The host has paused chat. Enjoy the scene while they reopen it.';
    this.q('.lounge-chat-count').textContent = messages.length;
    const signature = JSON.stringify([this.domain, messages, state.isHost, state.me?.id]);
    if (signature !== this.chatSignature) {
      this.chatSignature = signature;
      const log = this.q('.lounge-chat-log');
      const pinnedToBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
      log.replaceChildren(...messages.map(message => {
        const row = node('article', 'lounge-message');
        const heading = node('div', 'lounge-message-heading');
        const time = new Date(message.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        heading.append(node('strong', '', `${message.avatar} ${message.name}`), node('small', '', `${message.team || 'HOST'} · ${time}`));
        row.append(heading, node('p', '', message.text));
        if (state.isHost || state.me?.id === message.memberId) {
          const remove = node('button', 'text-button', 'Remove');
          remove.type = 'button';
          remove.setAttribute('aria-label', `Remove message from ${message.name}`);
          remove.addEventListener('click', () => this.send({ type: 'remove', domain: this.domain, id: message.id }));
          row.append(remove);
        }
        return row;
      }));
      if (!messages.length) log.append(node('div', 'lounge-empty', 'The horizon is quiet. Leave the first thought for your expedition.'));
      if (pinnedToBottom) log.scrollTop = log.scrollHeight;
    }
    for (const button of this.q('.lounge-moderation').querySelectorAll('button')) button.disabled = this.isBusy();
    const event = state.council?.event;
    const memes = event && event.phase !== 'predict' && event.phase !== 'cancelled' ? event.memes.filter(meme => meme.approved && meme.domain === this.domain) : [];
    this.q('.lounge-meme-count').textContent = memes.length;
    const memeSignature = JSON.stringify([this.domain, memes, state.isHost]);
    if (memeSignature !== this.memeSignature) {
      this.memeSignature = memeSignature;
      const wall = this.q('.lounge-meme-wall');
      wall.replaceChildren(...memes.map(meme => {
        const card = node('article', 'lounge-meme');
        if (meme.image) {
          const image = node('img');
          image.src = meme.image; image.alt = meme.caption; image.loading = 'lazy';
          card.append(image);
        } else card.append(makeSigil(this.domain));
        card.append(node('blockquote', '', meme.caption), node('p', 'eyebrow', `${meme.name} / ${meme.team}`));
        if (state.isHost && event.phase !== 'results') {
          const feature = node('button', 'outline-button', 'Show on the live stage ↗');
          feature.type = 'button';
          feature.addEventListener('click', async () => {
            const result = await this.action('council', { type: 'feature', memeId: meme.id });
            if (result) this.q('.lounge-feedback').textContent = result.message;
          });
          card.append(feature);
        }
        return card;
      }));
      if (!memes.length) wall.append(node('div', 'lounge-empty', 'A wall waiting for your best moment. Submit a meme in the Council. Approved entries appear here after the reveal.'));
    }
  }

  destroy() {
    this.removeGrove();
    window.removeEventListener('message', this.onGroveMessage);
    this.audio.destroy();
  }
}
