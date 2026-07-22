import { useState, type CSSProperties } from "react";
import type { AudioEngineApi, AudioMode } from "../../audio/useAudioEngine";
import {
  readMode,
  readMuted,
  writeMode,
  writeMuted,
} from "../../audio/preferences";

interface ControlsProps {
  audio: AudioEngineApi;
}

// Three hero controls:
//  - mic:    animate from the computer's microphone (toggles mic <-> song)
//  - mute:   silence/enable the song's audio (visuals keep reacting)
//  - static: turn off all audio + reactivity, leaving only the u_time flow
// Initial visual state comes from the persisted prefs; the actual engine state
// is applied at the entry click (in App), so both stay in sync.
const Controls = ({ audio }: ControlsProps) => {
  const [mode, setMode] = useState<AudioMode>(() => readMode());
  const [muted, setMuted] = useState<boolean>(() => readMuted());

  const persistMode = (m: AudioMode) => {
    setMode(m);
    writeMode(m);
  };

  const persistMuted = (m: boolean) => {
    setMuted(m);
    writeMuted(m);
  };

  const toggleMic = async () => {
    if (mode === "mic") {
      await audio.setMode("files");
      persistMode("files");
    } else {
      try {
        await audio.setMode("mic");
        persistMode("mic");
      } catch {
        /* permission denied: keep current mode */
      }
    }
  };

  const toggleStatic = async () => {
    if (mode === "time") {
      await audio.setMode("files");
      persistMode("files");
    } else {
      await audio.setMode("time");
      persistMode("time");
    }
  };

  const toggleMute = () => {
    const next = !muted;
    persistMuted(next);
    audio.setMuted(next);
  };

  const micActive = mode === "mic";
  const staticActive = mode === "time";
  // Show "next track" whenever the song is playing. With several tracks it
  // advances (wrapping after the last); with a single track it restarts it.
  const showNext = mode === "files";
  const nextLabel =
    audio.getTrackCount() > 1 ? "Siguiente canción" : "Reiniciar canción";

  return (
    <div style={styles.row}>
      <button
        type="button"
        onClick={toggleMic}
        aria-pressed={micActive}
        aria-label={micActive ? "Desactivar micrófono" : "Activar micrófono"}
        title={micActive ? "Micrófono activo" : "Reaccionar al micrófono"}
        style={styles.btn}
      >
        {micActive ? <IconMic /> : <IconMicOff />}
      </button>

      <button
        type="button"
        onClick={toggleMute}
        aria-pressed={muted}
        aria-label={muted ? "Activar sonido" : "Silenciar"}
        title={muted ? "Sonido silenciado" : "Silenciar canción"}
        style={styles.btn}
      >
        {muted ? <IconVolumeOff /> : <IconVolumeOn />}
      </button>

      <button
        type="button"
        onClick={toggleStatic}
        aria-pressed={staticActive}
        aria-label={staticActive ? "Reactivar animación" : "Modo estático"}
        title={
          staticActive
            ? "Reproducir animación y música"
            : "Detener animación y música"
        }
        style={styles.btn}
      >
        {staticActive ? <IconPlay /> : <IconStop />}
      </button>

      {showNext && (
        <button
          type="button"
          onClick={() => void audio.next()}
          aria-label={nextLabel}
          title={nextLabel}
          style={styles.btn}
        >
          <IconNext />
        </button>
      )}
    </div>
  );
};

const svgProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const IconMic = () => (
  <svg {...svgProps}>
    <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
    <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

const IconMicOff = () => (
  <svg {...svgProps}>
    <line x1="2" y1="2" x2="22" y2="22" />
    <path d="M9 9v2a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-1M12 19v3" />
  </svg>
);

const IconVolumeOn = () => (
  <svg {...svgProps}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const IconVolumeOff = () => (
  <svg {...svgProps}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

const IconNext = () => (
  <svg {...svgProps}>
    <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" />
    <line x1="19" y1="5" x2="19" y2="19" />
  </svg>
);

const IconStop = () => (
  <svg {...svgProps}>
    <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" />
  </svg>
);

const IconPlay = () => (
  <svg {...svgProps}>
    <polygon points="7 5 19 12 7 19 7 5" fill="currentColor" />
  </svg>
);

const styles: Record<string, CSSProperties> = {
  row: {
    display: "flex",
    flexDirection: "row",
    gap: "12px",
    marginTop: "24px",
    pointerEvents: "auto",
  },
  btn: {
    width: "44px",
    height: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.35)",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    padding: 0,
    transition: "opacity 0.2s ease",
  },
};

export default Controls;
