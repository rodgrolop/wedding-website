import type { AudioMode } from "./audioEngine";

// Persisted audio preferences (survive reloads on the same browser). Shared by
// the entry gate (App) and the hero Controls so both agree on a single source.
const STORAGE_MODE = "wedding.audio.mode";
const STORAGE_MUTED = "wedding.audio.muted";

// NOTE: `typeof localStorage !== "undefined"` is NOT enough. In iOS Safari
// private mode (and when storage is blocked) `localStorage` exists but every
// get/set THROWS. An unguarded throw here would propagate out of the entry
// click handler and abort the whole start sequence (no fade, no audio, no
// animation). So every access is wrapped in try/catch and degrades silently.
const safeGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode / blocked): ignore */
  }
};

export const readMode = (): AudioMode => {
  const v = safeGet(STORAGE_MODE);
  return v === "mic" || v === "time" || v === "files" ? v : "files";
};

export const writeMode = (mode: AudioMode) => {
  safeSet(STORAGE_MODE, mode);
};

export const readMuted = (): boolean => safeGet(STORAGE_MUTED) === "1";

export const writeMuted = (muted: boolean) => {
  safeSet(STORAGE_MUTED, muted ? "1" : "0");
};
