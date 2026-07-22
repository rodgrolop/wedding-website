import type { AudioMode } from "./audioEngine";

// Persisted audio preferences (survive reloads on the same browser). Shared by
// the entry gate (App) and the hero Controls so both agree on a single source.
const STORAGE_MODE = "wedding.audio.mode";
const STORAGE_MUTED = "wedding.audio.muted";

export const readMode = (): AudioMode => {
  const v =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(STORAGE_MODE)
      : null;
  return v === "mic" || v === "time" || v === "files" ? v : "files";
};

export const writeMode = (mode: AudioMode) => {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_MODE, mode);
  }
};

export const readMuted = (): boolean =>
  typeof localStorage !== "undefined" &&
  localStorage.getItem(STORAGE_MUTED) === "1";

export const writeMuted = (muted: boolean) => {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_MUTED, muted ? "1" : "0");
  }
};
