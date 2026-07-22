import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type TransitionEvent,
} from "react";

// Full-screen entry gate. It stays up (covering the heavy WebGL scene) until
// BOTH the ribbon and the audio are ready. It never fades out on its own: once
// ready it shows a "toca para entrar" prompt and only the user's click starts
// the music + reveals the animation (the click also satisfies the browser's
// autoplay gesture requirement).
interface PreloaderProps {
  /** True once the ribbon has drawn its first frame AND the track can play. */
  ready: boolean;
  /** Called synchronously on the entering click (inside the user gesture). */
  onEnter: () => void;
  /** Called after the fade-out transition finishes, so the parent can unmount. */
  onExited: () => void;
}

const Preloader = ({ ready, onEnter, onExited }: PreloaderProps) => {
  const [leaving, setLeaving] = useState(false);
  // onExited must fire exactly once. iOS Safari doesn't always deliver
  // transitionend, so a timeout fallback guarantees the scene is revealed.
  const exited = useRef(false);
  const finishExit = () => {
    if (exited.current) return;
    exited.current = true;
    onExited();
  };

  // On a fresh load: reset scroll to the top (don't let the browser restore a
  // previous position) and lock background scrolling until the user enters.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyTouch = body.style.touchAction;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.touchAction = "none";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.touchAction = prevBodyTouch;
      history.scrollRestoration = prevRestoration;
    };
  }, []);

  const handleClick = () => {
    if (!ready || leaving) return;
    // start audio within the gesture, then begin the fade. Never let a start
    // error abort the reveal -> the fade/animation must always proceed.
    try {
      onEnter();
    } catch {
      /* audio failed to start; still enter the experience */
    }
    setLeaving(true);
    // Fallback in case transitionend never fires (iOS Safari). The fade is
    // 0.9s; give it a little margin.
    window.setTimeout(finishExit, 1200);
  };

  const handleTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (leaving && e.propertyName === "opacity") finishExit();
  };

  return (
    <div
      style={{
        ...styles.overlay,
        opacity: leaving ? 0 : 1,
        cursor: ready ? "pointer" : "default",
        pointerEvents: leaving ? "none" : "auto",
      }}
      onClick={handleClick}
      onTransitionEnd={handleTransitionEnd}
    >
      <style>{keyframes}</style>

      {ready ? (
        <div style={styles.enter}>
          <div
            className="preloader-brand"
            data-text="BODAMJRODRIGO"
            style={styles.brand}
          >
            <span style={styles.brandGrey}>BODA</span>
            <span style={styles.brandWhite}>MJ</span>
            <span style={styles.brandOutline}>RODRIGO</span>
          </div>
          <div style={styles.cta}>Pulsa para entrar</div>
        </div>
      ) : (
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <div style={styles.loadingText}>Cargando</div>
        </div>
      )}
    </div>
  );
};

// CSS take on the ribbon's glitch (the welcome screen is a plain DOM overlay).
// Two red/cyan text ghosts are screen-blended over the real title. They stay
// fully hidden for most of the ~1.9s loop (~1.5s of stillness) and then fire a
// single short, chaotic RGB-split + slice burst near the end.
const keyframes = `
@keyframes preloader-spin { to { transform: rotate(360deg); } }
@keyframes preloader-pulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }

.preloader-brand {
  position: relative;
  display: inline-block;
}
.preloader-brand::before,
.preloader-brand::after {
  content: attr(data-text);
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  mix-blend-mode: screen;
}
.preloader-brand::before {
  color: #ff0033;
  animation: preloader-glitch-r 1.9s infinite;
}
.preloader-brand::after {
  color: #00e5ff;
  animation: preloader-glitch-c 1.9s infinite;
}

@keyframes preloader-glitch-r {
  0%, 79%, 100% { transform: translate(0, 0); clip-path: inset(0 0 0 0); opacity: 0; }
  80% { transform: translate(-4px, -2px); clip-path: inset(12% 0 62% 0); opacity: 0.9; }
  84% { transform: translate(3px, 1px);   clip-path: inset(66% 0 10% 0); opacity: 0.9; }
  88% { transform: translate(-5px, 1px);  clip-path: inset(50% 0 22% 0); opacity: 0.95; }
  92% { transform: translate(2px, -2px);  clip-path: inset(18% 0 60% 0); opacity: 0.95; }
  96% { transform: translate(-3px, 0);    clip-path: inset(35% 0 40% 0); opacity: 0.9; }
  99% { opacity: 0; }
}
@keyframes preloader-glitch-c {
  0%, 79%, 100% { transform: translate(0, 0); clip-path: inset(0 0 0 0); opacity: 0; }
  80% { transform: translate(4px, 2px);   clip-path: inset(55% 0 15% 0); opacity: 0.9; }
  84% { transform: translate(-3px, -1px); clip-path: inset(14% 0 64% 0); opacity: 0.9; }
  88% { transform: translate(5px, -1px);  clip-path: inset(20% 0 58% 0); opacity: 0.95; }
  92% { transform: translate(-2px, 2px);  clip-path: inset(52% 0 18% 0); opacity: 0.95; }
  96% { transform: translate(3px, 0);     clip-path: inset(40% 0 35% 0); opacity: 0.9; }
  99% { opacity: 0; }
}
`;

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "black",
    color: "white",
    fontFamily: "Roboto Mono, monospace",
    // slow, deliberate fade once the user enters
    transition: "opacity 0.9s ease",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "18px",
  },
  spinner: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.2)",
    borderTopColor: "#fff",
    animation: "preloader-spin 0.9s linear infinite",
  },
  loadingText: {
    fontSize: "0.85rem",
    fontWeight: 300,
    letterSpacing: "0.3em",
    textTransform: "uppercase",
    color: "#7c7c7c",
  },
  enter: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px",
    padding: "0 6vw",
    textAlign: "center",
  },
  brand: {
    fontSize: "clamp(1.6rem, 7vw, 3.2rem)",
    fontWeight: 700,
    lineHeight: 1,
    whiteSpace: "nowrap",
  },
  brandGrey: {
    color: "#383838",
    WebkitTextStroke: "1px #383838",
    paintOrder: "stroke fill",
  },
  brandWhite: {
    color: "white",
    WebkitTextStroke: "1px #fff",
    paintOrder: "stroke fill",
  },
  brandOutline: {
    color: "black",
    WebkitTextStroke: "1px #fff",
    paintOrder: "stroke fill",
  } as CSSProperties,
  cta: {
    fontSize: "0.9rem",
    fontWeight: 400,
    letterSpacing: "0.3em",
    textTransform: "uppercase",
    animation: "preloader-pulse 1.8s ease-in-out infinite",
  },
};

export default Preloader;
