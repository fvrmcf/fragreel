import { WeaponName } from '../types/demo';

/**
 * Synthesizes punchy, domain-authentic Counter-Strike 2 weapon shots,
 * metallic headshot dinks, and multi-kill broadcast stingers using Web Audio API.
 * Can route to speakers (live preview) or to a MediaStreamAudioDestinationNode (video export).
 */
export class CS2AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;

  public init(forStreamExport = false): MediaStream | null {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.72;

      if (forStreamExport) {
        this.streamDest = this.ctx.createMediaStreamDestination();
        this.masterGain.connect(this.streamDest);
      } else {
        this.masterGain.connect(this.ctx.destination);
      }

      this.noiseBuffer = this.createNoiseBuffer(this.ctx, 1.2);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.streamDest ? this.streamDest.stream : null;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.72, this.ctx.currentTime);
    }
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
      this.streamDest = null;
      this.noiseBuffer = null;
    }
  }

  private createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public playKillSound(weapon: WeaponName, headshot: boolean, streakCount: number): void {
    if (this.muted && !this.streamDest) return;
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) {
      this.init(false);
    }
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    const now = this.ctx.currentTime;
    this.triggerGunshot(this.ctx, this.masterGain, this.noiseBuffer, weapon, now);

    if (headshot) {
      this.triggerHeadshotDink(this.ctx, this.masterGain, now + 0.032);
    } else {
      this.triggerBodyThud(this.ctx, this.masterGain, now + 0.03);
    }

    if (streakCount >= 4) {
      this.triggerStreakStinger(this.ctx, this.masterGain, now + 0.12, streakCount >= 5);
    }
  }

  public playIntroWhoosh(): void {
    if (this.muted && !this.streamDest) return;
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(160, now);
    filter.frequency.exponentialRampToValueAtTime(920, now + 0.35);
    filter.Q.value = 1.6;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.48);
  }

  private triggerGunshot(
    ctx: AudioContext,
    dest: AudioNode,
    noiseBuffer: AudioBuffer,
    weapon: WeaponName,
    t: number
  ): void {
    const isAwp = weapon === 'AWP';
    const isSilenced = weapon === 'M4A1-S' || weapon === 'USP-S';
    const isDeagle = weapon === 'Desert Eagle';

    // Noise burst (transient crack)
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = isSilenced ? 'bandpass' : 'lowpass';
    filter.frequency.setValueAtTime(isAwp ? 2200 : isSilenced ? 1600 : isDeagle ? 3600 : 2900, t);
    filter.frequency.exponentialRampToValueAtTime(isAwp ? 240 : 420, t + (isAwp ? 0.38 : 0.16));

    const noiseGain = ctx.createGain();
    const peak = isAwp ? 0.65 : isSilenced ? 0.24 : isDeagle ? 0.52 : 0.42;
    const decay = isAwp ? 0.42 : isSilenced ? 0.11 : isDeagle ? 0.26 : 0.19;
    noiseGain.gain.setValueAtTime(0.001, t);
    noiseGain.gain.linearRampToValueAtTime(peak, t + 0.004);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + decay);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(dest);
    noise.start(t);
    noise.stop(t + decay + 0.03);

    // Low-end punch oscillator
    const osc = ctx.createOscillator();
    osc.type = isAwp ? 'sawtooth' : 'triangle';
    const startFreq = isAwp ? 145 : isDeagle ? 210 : isSilenced ? 190 : 175;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(isAwp ? 32 : 48, t + (isAwp ? 0.24 : 0.11));

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.001, t);
    oscGain.gain.linearRampToValueAtTime(isAwp ? 0.58 : isSilenced ? 0.18 : 0.36, t + 0.003);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + (isAwp ? 0.28 : 0.13));

    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(t);
    osc.stop(t + (isAwp ? 0.3 : 0.15));
  }

  private triggerHeadshotDink(ctx: AudioContext, dest: AudioNode, t: number): void {
    // Classic crisp metallic double-partial helmet dink
    const freqs = [2480, 3860];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.88, t + 0.14);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(idx === 0 ? 0.26 : 0.16, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  private triggerBodyThud(ctx: AudioContext, dest: AudioNode, t: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(62, t + 0.09);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  private triggerStreakStinger(ctx: AudioContext, dest: AudioNode, t: number, isAce: boolean): void {
    const notes = isAce ? [220, 329.63, 440, 659.25] : [220, 329.63, 440];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.04);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, t + i * 0.04);
      gain.gain.linearRampToValueAtTime(isAce ? 0.11 : 0.08, t + i * 0.04 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + (isAce ? 1.1 : 0.7));

      osc.connect(gain);
      gain.connect(dest);
      osc.start(t + i * 0.04);
      osc.stop(t + i * 0.04 + (isAce ? 1.15 : 0.75));
    });
  }
}
