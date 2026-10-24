/**
 * Sound Manager for Heartbeat & Interactive UI Sounds
 * Uses Web Audio API to synthesize realistic biological heartbeat (lub-dub)
 * and UI interaction effects with zero external audio assets.
 */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.volume = 0.5;
    this.isBeating = false;
    this.beatInterval = null;
    this.bpm = 72;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound(forceState) {
    this.init();
    if (forceState !== undefined) {
      this.enabled = forceState;
    } else {
      this.enabled = !this.enabled;
    }

    if (!this.enabled && this.isBeating) {
      this.stopHeartbeat();
    }
    return this.enabled;
  }

  setBpm(bpm) {
    this.bpm = Math.max(40, Math.min(180, bpm));
    if (this.isBeating) {
      this.stopHeartbeat();
      this.startHeartbeat(this.bpm);
    }
  }

  /**
   * Synthesize a single organic "Lub-Dub" cardiac beat
   */
  playSingleHeartbeat(pitchMultiplier = 1.0) {
    if (!this.enabled || !this.ctx) return;
    this.init();

    const now = this.ctx.currentTime;

    // "Lub" (S1 sound - closure of AV valves)
    this._createBeatTone(now, 58 * pitchMultiplier, 0.14, 0.8 * this.volume);

    // "Dub" (S2 sound - closure of semilunar valves, slightly higher pitch, ~140ms later)
    this._createBeatTone(now + 0.14, 82 * pitchMultiplier, 0.10, 0.65 * this.volume);
  }

  _createBeatTone(startTime, baseFreq, duration, peakGain) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * 1.3, startTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, startTime + duration);

      // Lowpass filter to make it sound muffled inside human chest tissue
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, startTime);
      filter.Q.setValueAtTime(2.5, startTime);

      // Gain envelope
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  startHeartbeat(bpm = 72) {
    this.bpm = bpm;
    this.isBeating = true;
    if (this.beatInterval) clearInterval(this.beatInterval);

    // Initial beat
    this.playSingleHeartbeat();

    const intervalMs = (60 / this.bpm) * 1000;
    this.beatInterval = setInterval(() => {
      this.playSingleHeartbeat();
    }, intervalMs);
  }

  stopHeartbeat() {
    this.isBeating = false;
    if (this.beatInterval) {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    }
  }

  /**
   * Subtle UI click feedback sound
   */
  playUiBeep(freq = 600) {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.05);

      gain.gain.setValueAtTime(0.15 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {
      // ignore
    }
  }
}

export const soundManager = new SoundManager();
