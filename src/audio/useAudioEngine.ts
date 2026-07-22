import { useEffect, useMemo, useRef } from "react";
import { AudioEngine, type AudioMode } from "./audioEngine";

export type { AudioMode };

export interface UseAudioEngineOptions {
  /** Initial source mode. */
  mode?: AudioMode;
  /** Files to loop in "files" mode (served from /public, e.g. "/track.mp3"). */
  files?: string[];
}

export interface AudioEngineApi {
  /** Start a new render frame: re-samples the analyser once on the next read. */
  newFrame: () => void;
  /** Read the current 0..1 audio level (0 in "time" mode). Stable reference. */
  getLevel: () => number;
  /** Read the current 0..1 bass/mid/treble split (zeros in "time" mode). */
  getBands: () => { bass: number; mid: number; treble: number };
  /** Read the spectrum split into `bands` groups, each 0..1 (lows->highs). */
  getSpectrum: (bands: number) => number[];
  /** Switch the analysed source at runtime (wire this to a UI later). */
  setMode: (mode: AudioMode, options?: { files?: string[] }) => Promise<void>;
  /** Read the current source mode. */
  getMode: () => AudioMode;
  /** Mute/unmute the song output (visuals keep reacting). */
  setMuted: (muted: boolean) => void;
  /** Read whether the song output is muted. */
  getMuted: () => boolean;
  /** Number of tracks in the "files" playlist. */
  getTrackCount: () => number;
  /** Skip forward to the next track (wraps after the last). */
  next: () => Promise<void>;
  /** Resume audio; automatically called on the first user gesture too. */
  resume: () => Promise<void>;
}

/**
 * Owns a single AudioEngine for the component's lifetime. Autoplay policies
 * require a user gesture, so we resume on the first pointer/key interaction.
 */
export function useAudioEngine(
  options: UseAudioEngineOptions = {},
): AudioEngineApi {
  const { mode = "files", files = ["/track.mp3"] } = options;

  const engine = useMemo(
    () => new AudioEngine({ files }),
    // engine is created once; files/mode changes are applied via effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Set up the initial source graph once, WITHOUT starting playback. The song
  // only ever starts from an explicit resume() on the entry click, so nothing
  // plays automatically when loading finishes.
  useEffect(() => {
    void engine.setMode(mode, { files });
    return () => engine.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  const apiRef = useRef<AudioEngineApi>({
    newFrame: () => engine.newFrame(),
    getLevel: () => engine.getLevel(),
    getBands: () => engine.getBands(),
    getSpectrum: (bands) => engine.getSpectrum(bands),
    setMode: (m, o) => engine.setMode(m, o),
    getMode: () => engine.getMode(),
    setMuted: (m) => engine.setMuted(m),
    getMuted: () => engine.getMuted(),
    getTrackCount: () => engine.getTrackCount(),
    next: () => engine.next(),
    resume: () => engine.resume(),
  });

  return apiRef.current;
}
