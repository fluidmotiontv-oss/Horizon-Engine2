/**
 * Web Audio API Synth Engine for The Horizon Engine
 * Generates procedural audio stems (Drone, Bassline, Pulse, Glitch Arp)
 * and provides live FFT frequency data for visual canvas reactivity.
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isRunning = false;
  private isMuted = false;

  // Stem Nodes
  private stems: {
    [key: string]: {
      gain: GainNode;
      oscillators: OscillatorNode[];
      volume: number; // 0 - 100
      muted: boolean;
      solo: boolean;
      lfo?: OscillatorNode;
      lfoGain?: GainNode;
    };
  } = {};

  private fftData: Uint8Array = new Uint8Array(64);
  private pitchMultiplier = 1.0;
  private currentBpm = 120;
  private streamDestination?: MediaStreamAudioDestinationNode;

  constructor() {
    // Audio Context initialized on user interaction
  }

  public getAudioStream(): MediaStream | null {
    return this.streamDestination ? this.streamDestination.stream : null;
  }

  public async initAudio(): Promise<boolean> {
    if (this.ctx && this.ctx.state === 'running') return true;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.6, this.ctx.currentTime); // Slight boost before dynamics

      // 1. Glue Compressor (Smooths out the mix and adds body)
      const masterCompressor = this.ctx.createDynamicsCompressor();
      masterCompressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      masterCompressor.knee.setValueAtTime(12, this.ctx.currentTime);
      masterCompressor.ratio.setValueAtTime(3, this.ctx.currentTime);
      masterCompressor.attack.setValueAtTime(0.01, this.ctx.currentTime);
      masterCompressor.release.setValueAtTime(0.25, this.ctx.currentTime);

      // 2. Brick-Wall Limiter (Strictly prevents ANY clipping above -0.5dB)
      const brickWallLimiter = this.ctx.createDynamicsCompressor();
      brickWallLimiter.threshold.setValueAtTime(-0.5, this.ctx.currentTime);
      brickWallLimiter.knee.setValueAtTime(0, this.ctx.currentTime);
      brickWallLimiter.ratio.setValueAtTime(20, this.ctx.currentTime); // Max ratio
      brickWallLimiter.attack.setValueAtTime(0.001, this.ctx.currentTime); // Fastest attack
      brickWallLimiter.release.setValueAtTime(0.05, this.ctx.currentTime); // Fast release

      // Master Low-pass filter to roll off harsh high frequencies
      const masterLpf = this.ctx.createBiquadFilter();
      masterLpf.type = 'lowpass';
      masterLpf.frequency.setValueAtTime(8000, this.ctx.currentTime); // Roll off above 8kHz
      masterLpf.Q.setValueAtTime(0.3, this.ctx.currentTime); // Very gentle roll-off

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.85;

      // Audio Chain
      this.masterGain.connect(masterCompressor);
      masterCompressor.connect(masterLpf);
      masterLpf.connect(brickWallLimiter);
      brickWallLimiter.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      
      this.streamDestination = this.ctx.createMediaStreamDestination();
      brickWallLimiter.connect(this.streamDestination);

      this.fftData = new Uint8Array(this.analyser.frequencyBinCount);

      // Create procedural stems
      this.createDroneStem();
      this.createBassStem();
      this.createPulseStem();
      this.createArpStem();

      this.isRunning = true;
      return true;
    } catch (e) {
      console.warn('AudioContext failed to initialize:', e);
      return false;
    }
  }

  private createDroneStem() {
    if (!this.ctx || !this.masterGain) return;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    // Warm Lowpass Filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, this.ctx.currentTime);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(55 * this.pitchMultiplier, this.ctx.currentTime); // A1

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(110 * this.pitchMultiplier, this.ctx.currentTime); // A2

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start();
    osc2.start();

    this.stems['geometry_drone'] = {
      gain,
      oscillators: [osc1, osc2],
      volume: 75,
      muted: false,
      solo: false,
    };
  }

  private createBassStem() {
    if (!this.ctx || !this.masterGain) return;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(160, this.ctx.currentTime);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(41.2 * this.pitchMultiplier, this.ctx.currentTime); // E1

    // Gentle sub LFO modulation
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.3, this.ctx.currentTime); // 0.3 Hz gentle pulse

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(15, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    lfo.start();

    this.stems['sub_synth'] = {
      gain,
      oscillators: [osc],
      volume: 80,
      muted: false,
      solo: false,
      lfo,
      lfoGain,
    };
  }

  private createPulseStem() {
    if (!this.ctx || !this.masterGain) return;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(440, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220 * this.pitchMultiplier, this.ctx.currentTime);

    // Smooth pulse rhythm modulation (Sine LFO avoids audio clicks/buzzing)
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(2.0, this.ctx.currentTime); // 2Hz smooth pulse

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    lfo.start();

    this.stems['plasma_pulse'] = {
      gain,
      oscillators: [osc],
      volume: 60,
      muted: false,
      solo: false,
      lfo,
      lfoGain,
    };
  }

  private createArpStem() {
    if (!this.ctx || !this.masterGain) return;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    // Warm Lowpass Filter for crystalline tone without buzz
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, this.ctx.currentTime);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440 * this.pitchMultiplier, this.ctx.currentTime);

    // Smooth sine wave frequency modulation for soft arpeggiated shimmer
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(6.0, this.ctx.currentTime); // 6Hz smooth shimmer

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(35, this.ctx.currentTime); // Gentle pitch bend modulation

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    lfo.start();

    this.stems['glitch_arp'] = {
      gain,
      oscillators: [osc],
      volume: 50,
      muted: false,
      solo: false,
      lfo,
      lfoGain,
    };
  }

  public setMasterVolume(volPercent: number) {
    if (!this.masterGain || !this.ctx) return;
    const val = Math.max(0, Math.min(100, volPercent)) / 100;
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : val, this.ctx.currentTime);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMutedState(): boolean {
    return this.isMuted;
  }

  public setStemVolume(stemId: string, volume: number) {
    const stem = this.stems[stemId];
    if (!stem || !this.ctx) return;
    stem.volume = volume;
    this.updateStemGain(stemId);
  }

  public toggleStemMute(stemId: string): boolean {
    const stem = this.stems[stemId];
    if (!stem) return false;
    stem.muted = !stem.muted;
    this.updateStemGain(stemId);
    return stem.muted;
  }

  public toggleStemSolo(stemId: string): boolean {
    const stem = this.stems[stemId];
    if (!stem) return false;
    stem.solo = !stem.solo;

    // Check if any stem is soloed
    const anySolo = Object.values(this.stems).some((s) => s.solo);

    Object.keys(this.stems).forEach((id) => {
      this.updateStemGain(id, anySolo);
    });

    return stem.solo;
  }

  private updateStemGain(stemId: string, anySoloActive = false) {
    const stem = this.stems[stemId];
    if (!stem || !this.ctx) return;

    const anySolo = anySoloActive || Object.values(this.stems).some((s) => s.solo);

    let effectiveVol = stem.volume / 100;

    if (stem.muted) {
      effectiveVol = 0;
    } else if (anySolo && !stem.solo) {
      effectiveVol = 0;
    }

    stem.gain.gain.setValueAtTime(effectiveVol * 0.5, this.ctx.currentTime);
  }

  public setPitchMultiplier(multiplier: number) {
    this.pitchMultiplier = multiplier;
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    if (this.stems['geometry_drone']) {
      this.stems['geometry_drone'].oscillators[0]?.frequency.setValueAtTime(55 * multiplier, now);
      this.stems['geometry_drone'].oscillators[1]?.frequency.setValueAtTime(110 * multiplier, now);
    }
    if (this.stems['sub_synth']) {
      this.stems['sub_synth'].oscillators[0]?.frequency.setValueAtTime(41.2 * multiplier, now);
    }
    if (this.stems['plasma_pulse']) {
      this.stems['plasma_pulse'].oscillators[0]?.frequency.setValueAtTime(220 * multiplier, now);
    }
    if (this.stems['glitch_arp']) {
      this.stems['glitch_arp'].oscillators[0]?.frequency.setValueAtTime(440 * multiplier, now);
    }
  }

  public setBpm(bpm: number) {
    this.currentBpm = Math.max(40, Math.min(240, bpm));
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const beatHz = this.currentBpm / 60; // 1 beat per second at 60 BPM

    // Pulse stem: 1/4 note pulse
    if (this.stems['plasma_pulse']?.lfo) {
      this.stems['plasma_pulse'].lfo.frequency.setValueAtTime(beatHz, now);
    }

    // Glitch arp stem: 16th note shimmer modulation (4x beat frequency)
    if (this.stems['glitch_arp']?.lfo) {
      this.stems['glitch_arp'].lfo.frequency.setValueAtTime(beatHz * 3, now);
    }

    // Sub synth: slow whole-bar modulation (1/4 beat frequency)
    if (this.stems['sub_synth']?.lfo) {
      this.stems['sub_synth'].lfo.frequency.setValueAtTime(beatHz * 0.25, now);
    }
  }

  public getBpm(): number {
    return this.currentBpm;
  }

  public getFFTData(): Uint8Array {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.fftData);
    }
    return this.fftData;
  }

  public getAudioPeakDb(): number {
    const data = this.getFFTData();
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    const avg = sum / (data.length || 1);
    // scale to approximate dB (-60 to 0)
    return Math.round((avg / 255) * 60 - 60);
  }
}

export const audioEngine = new AudioEngine();
