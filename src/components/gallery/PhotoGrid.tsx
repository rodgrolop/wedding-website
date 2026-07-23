import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { API_BASE } from "./api";
import type { Photo } from "./api";
import { useBreakpoint } from "../../hooks/useBreakpoint";

const POLL_MS = 10000;

// Persisted rotation memory (localStorage, per browser). `seen` = shown in any
// slot; `featured` = shown in the big 2x2 slot. Used to prioritise photos that
// haven't appeared yet so, with many uploads, (almost) everyone gets airtime.
const SEEN_KEY = "gallery_seen_keys";
const FEATURED_KEY = "gallery_featured_keys";

// Fixed, no-scroll mosaic dimensions. The featured tile spans 2x2, so the
// number of photos shown at once is cols*rows - 3.
const GRID = {
  mobile: { cols: 3, rows: 4 },
  other: { cols: 6, rows: 3 },
} as const;

type Selection = { featured: Photo | null; smalls: Photo[] };

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveSet(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    // storage full / unavailable: rotation just won't persist
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Clears the persisted rotation memory. Exposed so the /admin panel can reset
// the projected gallery (same browser). An open /galeria tab reacts live via
// the window 'storage' event below.
export function resetGalleryRotation() {
  try {
    localStorage.removeItem(SEEN_KEY);
    localStorage.removeItem(FEATURED_KEY);
  } catch {
    /* storage unavailable */
  }
}

// Shimmer animation for the initial-load skeleton tiles. Injected once via a
// <style> tag since inline styles can't declare @keyframes.
const SKELETON_CSS = `
@keyframes gallery-skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.gallery-skeleton-cell {
  background: linear-gradient(
    90deg,
    #111 25%,
    #1d1d1d 37%,
    #111 63%
  );
  background-size: 200% 100%;
  animation: gallery-skeleton-shimmer 1.4s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .gallery-skeleton-cell { animation: none; }
}
`;

const PhotoGrid = () => {
  const bp = useBreakpoint();
  const { cols, rows } = bp === "mobile" ? GRID.mobile : GRID.other;
  const capacity = cols * rows - 3; // total photos (featured + smalls)
  const smallCount = capacity - 1;

  const [selection, setSelection] = useState<Selection>({
    featured: null,
    smalls: [],
  });
  const [loaded, setLoaded] = useState(false);
  const [hasPhotos, setHasPhotos] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const seenRef = useRef<Set<string>>(loadSet(SEEN_KEY));
  const featuredRef = useRef<Set<string>>(loadSet(FEATURED_KEY));
  const lastPhotos = useRef<Photo[]>([]);

  // Pick the display set from `photos`, prioritising unfeatured (big) and
  // unseen (smalls), then record what we showed so next cycle rotates on.
  const select = useCallback(
    (photos: Photo[]) => {
      if (!photos.length) {
        setSelection({ featured: null, smalls: [] });
        return;
      }
      const unfeatured = photos.filter((p) => !featuredRef.current.has(p.key));
      const featuredPool = unfeatured.length ? unfeatured : photos;
      const featured = shuffle(featuredPool)[0] ?? null;

      const rest = photos.filter((p) => !featured || p.key !== featured.key);
      const unseen = rest.filter((p) => !seenRef.current.has(p.key));
      const seen = rest.filter((p) => seenRef.current.has(p.key));
      const smalls = [...shuffle(unseen), ...shuffle(seen)].slice(
        0,
        smallCount,
      );

      // record and persist
      if (featured) {
        featuredRef.current.add(featured.key);
        seenRef.current.add(featured.key);
      }
      smalls.forEach((p) => seenRef.current.add(p.key));
      saveSet(FEATURED_KEY, featuredRef.current);
      saveSet(SEEN_KEY, seenRef.current);

      setSelection({ featured, smalls });
    },
    [smallCount],
  );

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/gallery/photos`);
      const data = await res.json();
      if (mounted.current && Array.isArray(data.photos)) {
        lastPhotos.current = data.photos;
        setHasPhotos(data.photos.length > 0);
        select(data.photos);
      }
    } catch {
      // keep whatever we have on transient errors
    } finally {
      if (mounted.current) setLoaded(true);
    }
  }, [select]);

  // Only poll while the mosaic is on screen: an IntersectionObserver flips
  // `active`, so scrolling the gallery out of view stops network requests.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (!active) return () => undefined;
    fetchPhotos();
    const id = window.setInterval(fetchPhotos, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchPhotos();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, fetchPhotos]);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  // React to a reset triggered from another tab (e.g. /admin) in the same
  // browser: reload the (now-cleared) sets and re-pick from the current photos.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === SEEN_KEY || e.key === FEATURED_KEY) {
        seenRef.current = loadSet(SEEN_KEY);
        featuredRef.current = loadSet(FEATURED_KEY);
        select(lastPhotos.current);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [select]);

  const gridStyle: CSSProperties = {
    ...styles.grid,
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
  };

  return (
    <div ref={rootRef} style={styles.root}>
      <style>{SKELETON_CSS}</style>
      {/* Skeleton mosaic: shown ONLY during the very first fetch (!loaded).
          Poll refreshes keep `loaded` true, so they just swap the content. */}
      {!loaded && (
        <div style={gridStyle} aria-hidden>
          <div
            className="gallery-skeleton-cell"
            style={{ ...styles.cell, ...styles.featured }}
          />
          {Array.from({ length: smallCount }).map((_, i) => (
            <div
              key={i}
              className="gallery-skeleton-cell"
              style={styles.cell}
            />
          ))}
        </div>
      )}

      {loaded && !hasPhotos && (
        <div style={styles.empty}>Aún no hay fotos. ¡Sé el primero!</div>
      )}

      {hasPhotos && (
        <div style={gridStyle}>
          {selection.featured && (
            <button
              key={selection.featured.key}
              type="button"
              style={{ ...styles.cell, ...styles.featured }}
              onClick={() => setLightbox(selection.featured?.url ?? null)}
            >
              <img src={selection.featured.url} alt="" style={styles.img} />
            </button>
          )}
          {selection.smalls.map((p) => (
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
      )}

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
  root: {
    position: "relative",
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    padding: "8px",
    overflow: "hidden",
  },
  grid: {
    display: "grid",
    gridAutoFlow: "row dense",
    gap: "8px",
    width: "100%",
    height: "100%",
  },
  cell: {
    padding: 0,
    border: "none",
    background: "#111",
    borderRadius: "6px",
    overflow: "hidden",
    cursor: "pointer",
    minWidth: 0,
    minHeight: 0,
  },
  featured: {
    gridColumn: "span 2",
    gridRow: "span 2",
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
