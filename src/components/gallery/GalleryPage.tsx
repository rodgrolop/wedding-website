import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import PhotoGrid from "./PhotoGrid";
import BackToHome from "../nav/BackToHome";

const IconEnterFullscreen = () => (
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
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M16 3h3a2 2 0 0 1 2 2v3" />
    <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);

const IconExitFullscreen = () => (
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
    <path d="M5 8h3a2 2 0 0 0 2-2V3" />
    <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
    <path d="M5 16h3a2 2 0 0 1 2 2v3" />
    <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
  </svg>
);

// Standalone gallery served at /galeria. Fills the viewport with the live photo
// grid and offers a browser-fullscreen toggle so it can be projected on a big
// screen. More "projection" modes will be added later.
const GalleryPage = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // fullscreen may be blocked (e.g. permissions); ignore silently
    }
  }, []);

  return (
    <main style={styles.page}>
      <button
        type="button"
        onClick={toggleFullscreen}
        style={styles.fsButton}
        aria-label={
          isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"
        }
        title={
          isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"
        }
      >
        {isFullscreen ? <IconExitFullscreen /> : <IconEnterFullscreen />}
      </button>
      <div style={styles.gridArea}>
        <PhotoGrid />
      </div>
      <BackToHome />
    </main>
  );
};

const styles: Record<string, CSSProperties> = {
  page: {
    position: "relative",
    width: "100vw",
    height: "100vh",
    backgroundColor: "black",
    overflow: "hidden",
  },
  fsButton: {
    position: "fixed",
    right: "16px",
    bottom: "16px",
    zIndex: 50,
    width: "48px",
    height: "48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.35)",
    backgroundColor: "rgba(0,0,0,0.5)",
    color: "white",
    cursor: "pointer",
    padding: 0,
    backdropFilter: "blur(4px)",
  },
  gridArea: {
    width: "100%",
    height: "100%",
  },
};

export default GalleryPage;
