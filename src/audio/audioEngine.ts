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

// On the very first playback (the entry click) the song fades in from a low
// level up to full over this many seconds, so it eases in rather than blasting.
const FADE_IN_SECONDS = 5;
const FADE_START_GAIN = 0.15;

// --- beat-driven reactivity (onset punch) -----------------------------------
// Per band we measure spectral flux (how much energy RISES this frame) and turn
// each onset into a short percussive "punch": it spikes instantly and decays
// fast, so repeated beats stay separate and each band fires on its own hits
// (bass -> waves, mid -> twist, treble -> brightness are wired in the shader).
const ONSET = {
  // per-band gain applied to the positive flux (higher = more sensitive)
  gain: { bass: 9, mid: 13, treble: 20 } as Record<string, number>,
  // ignore flux below this (kills the fizz between beats)
  floor: 0.003,
  // seconds for a punch to decay ~63% (shorter = tighter, more separated)
  decayTau: 0.13,
  // light pre-smoothing of the raw band before differencing (0..1)
  rawSmooth: 0.4,
};

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

  // Ensures the volume fade-in runs only on the first playback, not on every
  // subsequent resume() (e.g. returning from a backgrounded tab).
  private fadedIn = false;

  private smoothedLevel = 0;
  private smoothedBands = { bass: 0, mid: 0, treble: 0 };
  private smoothedSpectrum: number[] = [];

  // Onset-punch state: previous (smoothed) raw band energy for spectral flux,
  // and the current decaying punch envelope per band.
  private prevBand: Record<string, number> = { bass: 0, mid: 0, treble: 0 };
  private punch: Record<string, number> = { bass: 0, mid: 0, treble: 0 };

  // Real seconds since the previous frame (set in newFrame) so the punch decays
  // at the same rate regardless of frame rate.
  private dt = 1 / 60;
  private lastFrameTime = 0;

  // Per-frame caching so the FFT is copied out at most once per frame and each
  // metric is smoothed exactly once, no matter how many consumers read it.
  // newFrame() (called once at the top of the render loop) invalidates these.
  private freqDirty = true;
  private levelDone = false;
  private bandsDone = false;
  private spectrumDone = false;

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

  /**
   * Marks the start of a new render frame: the next getLevel/getBands/
   * getSpectrum will re-read the analyser and re-smooth once. Call this once
   * per frame before reading any metric.
   */
  newFrame() {
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    // clamp so a backgrounded tab / first frame can't produce a huge dt spike
    this.dt = this.lastFrameTime
      ? Math.min(0.1, (now - this.lastFrameTime) / 1000)
      : 1 / 60;
    this.lastFrameTime = now;
    this.freqDirty = true;
    this.levelDone = false;
    this.bandsDone = false;
    this.spectrumDone = false;
  }

  /**
   * Turn a raw band level into a percussive onset "punch": measure the positive
   * spectral flux (energy rising this frame), add it to a punch envelope, and
   * decay that envelope quickly so each beat spikes and separates.
   */
  private hit(band: string, raw: number): number {
    const s = this.prevBand[band];
    const smoothed = s * ONSET.rawSmooth + raw * (1 - ONSET.rawSmooth);
    const flux = Math.max(0, smoothed - s - ONSET.floor);
    this.prevBand[band] = smoothed;
    const decay = Math.exp(-this.dt / ONSET.decayTau);
    const p = Math.min(1, this.punch[band] * decay + flux * ONSET.gain[band]);
    this.punch[band] = p;
    return p;
  }

  /** Copy the current FFT out of the analyser at most once per frame. */
  private readFreq() {
    if (this.freqDirty && this.analyser) {
      this.analyser.getByteFrequencyData(this.freqData);
      this.freqDirty = false;
    }
  }

  /** Resume the AudioContext + (re)start file playback. Call from a user gesture. */
  async resume() {
    this.ensureContext();
    this.started = true;

    // iOS Safari only treats media playback as user-activated if play() is
    // called SYNCHRONOUSLY within the gesture. Awaiting ctx.resume() first
    // breaks that chain and the play() gets blocked (Android is lenient and
    // works either way). So kick off play() before any await, then resume the
    // context (which routes the element's audio through the graph once running).
    const playPromise =
      this.mode === "files" && this.audioEl && this.audioEl.paused
        ? this.audioEl.play()
        : null;

    if (this.ctx && this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    // First playback: ease the volume up from a low level to full over a few
    // seconds. Skipped when muted (fade would be inaudible) and only ever runs
    // once. Uses the audio clock so it's smooth regardless of frame rate.
    if (!this.fadedIn && !this.muted && this.songGain && this.ctx) {
      this.fadedIn = true;
      const g = this.songGain.gain;
      const now = this.ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(FADE_START_GAIN, now);
      g.linearRampToValueAtTime(1, now + FADE_IN_SECONDS);
    }

    if (playPromise) {
      try {
        await playPromise;
      } catch {
        // Blocked despite the gesture: retry once the context is running.
        try {
          await this.audioEl?.play();
        } catch {
          /* ignored: will retry on next gesture */
        }
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
    if (this.songGain) {
      // Cancel any in-flight fade ramp so it doesn't override this set, then
      // jump straight to the target level.
      if (this.ctx) {
        const now = this.ctx.currentTime;
        this.songGain.gain.cancelScheduledValues(now);
        this.songGain.gain.setValueAtTime(muted ? 0 : 1, now);
      } else {
        this.songGain.gain.value = muted ? 0 : 1;
      }
    }
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
    if (this.levelDone) return this.smoothedLevel;
    this.readFreq();
    let sum = 0;
    for (let i = 0; i < this.freqData.length; i++) sum += this.freqData[i];
    const avg = sum / this.freqData.length / 255; // 0..1
    // simple exponential smoothing across frames
    this.smoothedLevel =
      this.smoothedLevel * this.smoothing + avg * (1 - this.smoothing);
    this.levelDone = true;
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
      this.smoothedBands.bass = 0;
      this.smoothedBands.mid = 0;
      this.smoothedBands.treble = 0;
      return this.smoothedBands;
    }
    if (this.bandsDone) return this.smoothedBands;
    this.readFreq();
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

    const rawBass = avgRange(0, bassEnd);
    const rawMid = avgRange(bassEnd, midEnd);
    const rawTreble = Math.min(1, avgRange(midEnd, trebleEnd) * 2.5); // boost quiet highs

    // onset punch per band: spikes on each hit, decays fast (beat-driven)
    this.smoothedBands.bass = this.hit("bass", rawBass);
    this.smoothedBands.mid = this.hit("mid", rawMid);
    this.smoothedBands.treble = this.hit("treble", rawTreble);
    this.bandsDone = true;
    // stable reference (mutated in place) -> no per-frame allocation
    return this.smoothedBands;
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
    if (this.spectrumDone) return this.smoothedSpectrum;

    this.readFreq();
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
    this.spectrumDone = true;
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
