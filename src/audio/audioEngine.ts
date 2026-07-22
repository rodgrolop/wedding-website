// Small, framework-agnostic audio engine for the ribbon visualiser.
//
// It owns a single AudioContext + AnalyserNode and can be pointed at one of
// three sources, all sharing the same analyser so the rest of the app only
// ever reads a single 0..1 "level":
//   - "files": plays a looping playlist of 1..N audio files (heard + analysed)
//   - "mic":   uses the microphone (analysed only, never routed to speakers)
//   - "time":  no input at all (level stays 0; visuals animate on time only)
//
// Switching modes is a single call (setMode), so wiring a UI later is trivial.
// Because browsers block audio until a user gesture, call resume() from a
// click/tap handler before expecting sound or a non-zero level.

export type AudioMode = "time" | "files" | "mic";

export interface AudioEngineOptions {
  /** URLs of the audio files to loop through in "files" mode (served from /public). */
  files?: string[];
  /** FFT size for the analyser (power of two). Larger = smoother, more latency. */
  fftSize?: number;
  /** 0..1 smoothing between frames applied on top of the analyser's own. */
  smoothing?: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> = new Uint8Array(0);

  private mode: AudioMode = "time";
  private files: string[];
  private fftSize: number;
  private smoothing: number;

  // "files" mode state
  private audioEl: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private playlistIndex = 0;

  // "mic" mode state
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;

  // Output gain for the song, so it can be muted WITHOUT affecting the analyser
  // (which taps the source directly). Persists across track/source changes.
  private songGain: GainNode | null = null;
  private muted = false;

  // Playback is gated on an explicit start (the entry click), NOT on the audio
  // context state. On localhost a high Media Engagement Index can let the
  // context auto-run without a gesture, so relying on ctx.state would let the
  // song play on load. This flag flips true only in resume().
  private started = false;

  private smoothedLevel = 0;
  private smoothedBands = { bass: 0, mid: 0, treble: 0 };
  private smoothedSpectrum: number[] = [];

  constructor(options: AudioEngineOptions = {}) {
    this.files = options.files ?? [];
    this.fftSize = options.fftSize ?? 1024;
    this.smoothing = options.smoothing ?? 0.8;
  }

  /** Lazily create the AudioContext + AnalyserNode (safe to call repeatedly). */
  private ensureContext() {
    if (this.ctx) return;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new Ctx();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = 0.85;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    // song output path (source -> songGain -> speakers); mute = gain 0
    this.songGain = this.ctx.createGain();
    this.songGain.gain.value = this.muted ? 0 : 1;
    this.songGain.connect(this.ctx.destination);
  }

  /** Resume the AudioContext + (re)start file playback. Call from a user gesture. */
  async resume() {
    this.ensureContext();
    this.started = true;
    if (this.ctx && this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    if (this.mode === "files" && this.audioEl && this.audioEl.paused) {
      try {
        await this.audioEl.play();
      } catch {
        /* ignored: will retry on next gesture */
      }
    }
  }

  /** Switch the analysed source. Safe to call at any time. */
  async setMode(mode: AudioMode, options?: { files?: string[] }) {
    if (options?.files) this.files = options.files;
    this.ensureContext();
    this.teardownSources();
    this.mode = mode;

    if (mode === "files") {
      await this.startFiles();
    } else if (mode === "mic") {
      await this.startMic();
    }
    // "time" needs no input; level will read as 0.
  }

  getMode() {
    return this.mode;
  }

  /** Mute/unmute the song output (visuals keep reacting). */
  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.songGain) this.songGain.gain.value = muted ? 0 : 1;
  }

  getMuted() {
    return this.muted;
  }

  /** Number of tracks in the "files" playlist. */
  getTrackCount() {
    return this.files.length;
  }

  /**
   * Skip forward: with several tracks, advance (wrapping to the first after the
   * last); with a single track, restart it from the beginning.
   */
  async next() {
    if (this.mode !== "files" || this.files.length === 0 || !this.audioEl)
      return;
    if (this.files.length === 1) {
      this.audioEl.currentTime = 0;
    } else {
      this.playlistIndex = (this.playlistIndex + 1) % this.files.length;
      this.audioEl.src = this.files[this.playlistIndex];
      this.audioEl.loop = false;
    }
    if (this.started) {
      try {
        await this.audioEl.play();
      } catch {
        /* ignored: will play on next resume() */
      }
    }
  }

  private async startFiles() {
    if (!this.ctx || !this.analyser || this.files.length === 0) return;

    const el = new Audio();
    el.crossOrigin = "anonymous";
    el.preload = "auto";
    // A single file loops itself; multiple files advance as a looping playlist.
    el.loop = this.files.length === 1;
    el.src = this.files[this.playlistIndex % this.files.length];

    if (this.files.length > 1) {
      el.addEventListener("ended", () => {
        this.playlistIndex = (this.playlistIndex + 1) % this.files.length;
        el.src = this.files[this.playlistIndex];
        void el.play().catch(() => {});
      });
    }

    this.audioEl = el;
    this.mediaSource = this.ctx.createMediaElementSource(el);
    // analyser (for visuals) + songGain -> destination (so it is audible/mutable)
    this.mediaSource.connect(this.analyser);
    if (this.songGain) this.mediaSource.connect(this.songGain);

    // Only auto-play once playback has been explicitly started via resume()
    // (the entry click). Before that the song stays paused no matter what state
    // the audio context is in. This also covers switching back to "files" from
    // the controls after entry.
    if (this.started) {
      try {
        await el.play();
      } catch {
        /* ignored: will play on next resume() */
      }
    }
  }

  private async startMic() {
    if (!this.ctx || !this.analyser) return;
    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.micSource = this.ctx.createMediaStreamSource(this.micStream);
    // Do NOT connect to destination (would cause feedback); analyser only.
    this.micSource.connect(this.analyser);
  }

  private teardownSources() {
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.src = "";
    }
    this.mediaSource?.disconnect();
    this.micSource?.disconnect();
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.audioEl = null;
    this.mediaSource = null;
    this.micSource = null;
    this.micStream = null;
  }

  /** Current audio energy as a smoothed 0..1 value (0 in "time" mode). */
  getLevel(): number {
    if (this.mode === "time" || !this.analyser) return 0;
    this.analyser.getByteFrequencyData(this.freqData);
    let sum = 0;
    for (let i = 0; i < this.freqData.length; i++) sum += this.freqData[i];
    const avg = sum / this.freqData.length / 255; // 0..1
    // simple exponential smoothing across frames
    this.smoothedLevel =
      this.smoothedLevel * this.smoothing + avg * (1 - this.smoothing);
    return this.smoothedLevel;
  }

  /**
   * Current energy split into three frequency bands, each smoothed to 0..1:
   *   - bass:   low bins (kick/bass)
   *   - mid:    mid bins (body/vocals)
   *   - treble: high bins (hats/air), gain-boosted since they carry less energy
   * Returns zeros in "time" mode.
   */
  getBands(): { bass: number; mid: number; treble: number } {
    if (this.mode === "time" || !this.analyser) {
      return { bass: 0, mid: 0, treble: 0 };
    }
    this.analyser.getByteFrequencyData(this.freqData);
    const n = this.freqData.length;

    // bin ranges as fractions of the spectrum (low bins hold most musical energy)
    const bassEnd = Math.max(1, Math.floor(n * 0.06));
    const midEnd = Math.max(bassEnd + 1, Math.floor(n * 0.35));
    const trebleEnd = n;

    const avgRange = (start: number, end: number) => {
      let sum = 0;
      for (let i = start; i < end; i++) sum += this.freqData[i];
      return sum / Math.max(1, end - start) / 255; // 0..1
    };

    const bass = avgRange(0, bassEnd);
    const mid = avgRange(bassEnd, midEnd);
    const treble = Math.min(1, avgRange(midEnd, trebleEnd) * 2.5); // boost quiet highs

    const k = this.smoothing;
    this.smoothedBands.bass = this.smoothedBands.bass * k + bass * (1 - k);
    this.smoothedBands.mid = this.smoothedBands.mid * k + mid * (1 - k);
    this.smoothedBands.treble =
      this.smoothedBands.treble * k + treble * (1 - k);
    return { ...this.smoothedBands };
  }

  /**
   * Spectrum split into `bands` contiguous groups, each smoothed to 0..1.
   * Uses roughly the lower 70% of the FFT (where musical energy lives) and
   * gently boosts higher bands so they aren't perpetually tiny. This is the
   * data behind the "spatial EQ": index 0 = lows, last = highs. In "time" mode
   * (or before audio starts) it returns zeros.
   */
  getSpectrum(bands: number): number[] {
    if (this.smoothedSpectrum.length !== bands) {
      this.smoothedSpectrum = new Array(bands).fill(0);
    }
    if (this.mode === "time" || !this.analyser) return this.smoothedSpectrum;

    this.analyser.getByteFrequencyData(this.freqData);
    const usable = Math.floor(this.freqData.length * 0.7);
    const k = this.smoothing;

    for (let b = 0; b < bands; b++) {
      const start = Math.floor((b / bands) * usable);
      const end = Math.max(start + 1, Math.floor(((b + 1) / bands) * usable));
      let sum = 0;
      for (let i = start; i < end; i++) sum += this.freqData[i];
      let v = sum / (end - start) / 255; // 0..1
      v = Math.min(1, v * (1 + b / bands)); // gentle high-band boost
      this.smoothedSpectrum[b] = this.smoothedSpectrum[b] * k + v * (1 - k);
    }
    return this.smoothedSpectrum;
  }

  dispose() {
    this.teardownSources();
    this.analyser?.disconnect();
    void this.ctx?.close();
    this.ctx = null;
    this.analyser = null;
  }
}
