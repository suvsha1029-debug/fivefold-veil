import { domainId } from './domains.js';

// Original, continuous three-note voicings. A fourth oscillator gently swells
// their shared level, so no audio files, playback timer or network is needed.
const SCORES = Object.freeze({
  taiga: { notes: [130.81, 196, 246.94], cutoff: 720, pulse: 0.075, depth: 0.09 },
  corrupted: { notes: [98, 146.83, 174.61], cutoff: 380, pulse: 0.11, depth: 0.16 },
  lunar: { notes: [146.83, 220, 277.18], cutoff: 1100, pulse: 0.055, depth: 0.07 },
  fire: { notes: [110, 164.81, 220], cutoff: 860, pulse: 0.16, depth: 0.13 },
  frontier: { notes: [123.47, 185, 277.18], cutoff: 620, pulse: 0.065, depth: 0.1 },
  'star-sea': { notes: [130.81, 207.65, 311.13], cutoff: 950, pulse: 0.04, depth: 0.08 },
});

function clampVolume(value) {
  const volume = Number(value);
  return Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.18;
}

/**
 * Opt-in domain ambience. Call start() directly from a user click and handle its
 * rejected promise when Web Audio is unavailable or the browser blocks audio.
 * A hidden page stops completely; returning to it requires another click.
 */
export class DomainAudio {
  constructor() {
    this.enabled = false;
    this.context = null;
    this.graph = null;
    this.domain = 'taiga';
    this.volume = 0.18;
    this.generation = 0;
    this.destroyed = false;
    this.onVisibility = () => {
      if (document.hidden) this.stop();
    };
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  /** Resume the single audio context and begin a quiet domain voicing. */
  async start(domain, volume = 0.18) {
    if (this.destroyed) throw new Error('This sound player has been closed.');
    this.domain = domainId(domain);
    this.volume = clampVolume(volume);
    if (document.hidden) return false;
    if (this.enabled) {
      this.setDomain(this.domain);
      this.setVolume(this.volume);
      return true;
    }

    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) throw new Error('Ambient sound is unavailable in this browser.');
    if (!this.context) this.context = new AudioContext({ latencyHint: 'playback' });
    const context = this.context;
    const generation = ++this.generation;
    try {
      // resume() runs before the first await so the click supplies activation.
      await context.resume();
      if (generation !== this.generation || this.destroyed || document.hidden) return false;
      if (context.state !== 'running') throw new Error('Audio is paused by your browser. Try enabling sound again.');
      this.createGraph();
      this.enabled = true;
      this.setDomain(this.domain);
      this.setVolume(this.volume);
      return true;
    } catch (error) {
      if (generation !== this.generation) return false;
      this.stop();
      throw error;
    }
  }

  createGraph() {
    const context = this.context;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.5;
    const swell = context.createGain();
    swell.gain.value = 0.76;
    const output = context.createGain();
    output.gain.value = 0;
    filter.connect(swell).connect(output).connect(context.destination);

    const voices = [0.2, 0.13, 0.09].map((level, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index === 2 ? 'triangle' : 'sine';
      oscillator.frequency.value = SCORES[this.domain].notes[index];
      const gain = context.createGain();
      gain.gain.value = level;
      oscillator.connect(gain).connect(filter);
      oscillator.start();
      return { oscillator, gain };
    });
    const lfo = context.createOscillator();
    const depth = context.createGain();
    lfo.frequency.value = SCORES[this.domain].pulse;
    depth.gain.value = SCORES[this.domain].depth;
    lfo.connect(depth).connect(swell.gain);
    lfo.start();
    this.graph = { voices, filter, swell, output, lfo, depth };
  }

  /** Retune the active score smoothly, or remember it while sound is off. */
  setDomain(domain) {
    this.domain = domainId(domain);
    if (!this.enabled || !this.graph) return;
    const score = SCORES[this.domain];
    const now = this.context.currentTime;
    this.graph.voices.forEach((voice, index) => {
      voice.oscillator.frequency.setTargetAtTime(score.notes[index], now, 0.8);
    });
    this.graph.filter.frequency.setTargetAtTime(score.cutoff, now, 0.8);
    this.graph.lfo.frequency.setTargetAtTime(score.pulse, now, 0.8);
    this.graph.depth.gain.setTargetAtTime(score.depth, now, 0.8);
  }

  /** Local volume only, clamped to 0–1 and kept quiet even at its maximum. */
  setVolume(volume) {
    this.volume = clampVolume(volume);
    if (this.graph) {
      this.graph.output.gain.setTargetAtTime(this.volume * 0.35, this.context.currentTime, 0.12);
    }
  }

  /** Silence and disconnect every voice, then suspend the reusable context. */
  stop() {
    this.enabled = false;
    ++this.generation;
    if (this.graph) {
      const { voices, filter, swell, output, lfo, depth } = this.graph;
      output.gain.cancelScheduledValues(this.context.currentTime);
      output.gain.setValueAtTime(0, this.context.currentTime);
      for (const voice of voices) {
        voice.oscillator.stop();
        voice.oscillator.disconnect();
        voice.gain.disconnect();
      }
      lfo.stop();
      lfo.disconnect();
      for (const node of [filter, swell, output, depth]) node.disconnect();
      this.graph = null;
    }
    if (this.context && this.context.state !== 'closed') {
      return this.context.suspend().catch(() => {});
    }
    return Promise.resolve();
  }

  /** Permanently release audio resources and the visibility listener. */
  destroy() {
    this.destroyed = true;
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.stop();
    if (this.context && this.context.state !== 'closed') return this.context.close().catch(() => {});
    return Promise.resolve();
  }
}
