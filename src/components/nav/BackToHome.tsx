import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

// Discreet floating button shown on the standalone routes (/subir, /galeria,
// /admin) to return to the home page. It hides itself whenever the browser is
// in fullscreen (e.g. the projected gallery) so it never overlays the screen.
const BackToHome = () => {
  const navigate = useNavigate();
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    onChange();
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (fullscreen) return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/")}
      style={styles.fab}
      aria-label="Volver al inicio"
      title="Volver al inicio"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
      </svg>
    </button>
  );
};

const styles: Record<string, CSSProperties> = {
  fab: {
    position: "fixed",
    left: "16px",
    bottom: "16px",
    zIndex: 50,
    width: "48px",
    height: "48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.35)",
    background: "rgba(0,0,0,0.5)",
    color: "white",
    cursor: "pointer",
    padding: 0,
    backdropFilter: "blur(4px)",
  },
};

export default BackToHome;
