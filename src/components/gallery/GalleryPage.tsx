import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import PhotoGrid from "./PhotoGrid";

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
      >
        {isFullscreen ? "Salir" : "Pantalla completa"}
      </button>
      <div style={styles.gridArea}>
        <PhotoGrid />
      </div>
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
    position: "absolute",
    top: "16px",
    right: "16px",
    zIndex: 10,
    padding: "10px 16px",
    border: "1px solid white",
    borderRadius: "8px",
    backgroundColor: "rgba(0,0,0,0.5)",
    color: "white",
    fontFamily: "Roboto Mono, monospace",
    fontSize: "0.8rem",
    fontWeight: 500,
    cursor: "pointer",
  },
  gridArea: {
    width: "100%",
    height: "100%",
  },
};

export default GalleryPage;
