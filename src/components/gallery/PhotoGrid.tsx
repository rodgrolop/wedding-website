import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { API_BASE } from "./api";
import type { Photo } from "./api";

const POLL_MS = 15000;

const PhotoGrid = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const mounted = useRef(true);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/gallery/photos`);
      const data = await res.json();
      if (mounted.current && Array.isArray(data.photos)) {
        setPhotos(data.photos);
      }
    } catch {
      // keep whatever we have on transient errors
    } finally {
      if (mounted.current) setLoaded(true);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    fetchPhotos();
    const id = window.setInterval(fetchPhotos, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchPhotos();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mounted.current = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchPhotos]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  return (
    <div style={styles.scroll}>
      {loaded && photos.length === 0 && (
        <div style={styles.empty}>Aún no hay fotos. ¡Sé el primero!</div>
      )}
      <div style={styles.grid}>
        {photos.map((p) => (
          <button
            key={p.key}
            type="button"
            style={styles.cell}
            onClick={() => setLightbox(p.url)}
          >
            <img src={p.url} alt="" loading="lazy" style={styles.img} />
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          style={styles.lightbox}
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <img src={lightbox} alt="" style={styles.lightboxImg} />
        </div>
      )}
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  scroll: {
    width: "100%",
    height: "100%",
    overflowY: "auto",
    boxSizing: "border-box",
    padding: "8px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: "8px",
  },
  cell: {
    padding: 0,
    border: "none",
    background: "#111",
    borderRadius: "6px",
    overflow: "hidden",
    aspectRatio: "1 / 1",
    cursor: "pointer",
  },
  img: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  empty: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Roboto Mono, monospace",
    fontSize: "0.85rem",
    textAlign: "center",
    padding: "40px 16px",
  },
  lightbox: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background: "rgba(0,0,0,0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    cursor: "zoom-out",
  },
  lightboxImg: {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    borderRadius: "6px",
  },
};

export default PhotoGrid;
