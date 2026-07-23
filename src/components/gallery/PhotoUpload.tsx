import { useCallback, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent, DragEvent } from "react";
import { API_BASE } from "./api";

// Downscale big phone photos in the browser before upload: lighter files,
// faster gallery, and no server-side image processing.
const MAX_DIM = 2000;
const JPEG_QUALITY = 0.85;

type ItemStatus =
  | "resizing"
  | "uploading"
  | "moderating"
  | "approved"
  | "manual"
  | "rejected"
  | "error";

type UploadItem = {
  id: string;
  preview: string;
  status: ItemStatus;
};

const STATUS_LABEL: Record<ItemStatus, string> = {
  resizing: "Preparando…",
  uploading: "Subiendo…",
  moderating: "Revisando…",
  approved: "Publicada",
  manual: "Pendiente de revisión",
  rejected: "No permitida",
  error: "Error al subir",
};

const STATUS_COLOR: Record<ItemStatus, string> = {
  resizing: "#cccccc",
  uploading: "#cccccc",
  moderating: "#cccccc",
  approved: "#5fbf6b",
  manual: "#e0b341",
  rejected: "#e05a5a",
  error: "#e05a5a",
};

// Draw the image to a canvas scaled so its largest side <= MAX_DIM, exported as
// JPEG. Falls back to the original file if anything goes wrong.
function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no-2d-context"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob-failed"))),
        "image/jpeg",
        JPEG_QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image-load-failed"));
    };
    img.src = url;
  });
}

// Touch devices (phones/tablets) benefit from a dedicated camera trigger: on
// modern Android the system Photo Picker opened by accept="image/*" has NO
// camera option, so we expose an explicit capture input instead.
const isTouch =
  typeof window !== "undefined" &&
  (navigator.maxTouchPoints > 0 || "ontouchstart" in window);

const IconCamera = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const PhotoUpload = () => {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const update = useCallback((id: string, status: ItemStatus) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status } : it)),
    );
  }, []);

  const processFile = useCallback(
    async (file: File, id: string) => {
      try {
        update(id, "resizing");
        const blob = await resizeImage(file).catch(() => file);
        const contentType = "image/jpeg";

        update(id, "uploading");
        const signRes = await fetch(`${API_BASE}/gallery/sign-upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType, ext: "jpg" }),
        });
        if (!signRes.ok) throw new Error("sign-upload");
        const { uploadUrl, key } = await signRes.json();

        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: blob,
        });
        if (!putRes.ok) throw new Error("put");

        update(id, "moderating");
        const modRes = await fetch(`${API_BASE}/gallery/moderate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        const mod = await modRes.json().catch(() => ({}));
        const decision = mod.decision;
        update(
          id,
          decision === "approved"
            ? "approved"
            : decision === "rejected"
              ? "rejected"
              : "manual",
        );
      } catch {
        update(id, "error");
      }
    },
    [update],
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const images = Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, 1);
      if (!images.length) return;
      const newItems = images.map((file) => ({
        file,
        item: {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          preview: URL.createObjectURL(file),
          status: "resizing" as ItemStatus,
        },
      }));
      setItems((prev) => [...newItems.map((n) => n.item), ...prev]);
      newItems.forEach(({ file, item }) => void processFile(file, item.id));
    },
    [processFile],
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  };

  return (
    <section style={styles.wrapper}>
      <div style={styles.inner}>
        {isTouch && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => cameraRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                cameraRef.current?.click();
            }}
            style={{ ...styles.dropzone, ...styles.cameraZone }}
          >
            <span style={styles.dropIcon}>
              <IconCamera />
            </span>
            <span style={styles.dropText}>Haz una foto</span>
            <span style={styles.dropHint}>
              Se revisan con IA de moderación antes de publicarse en la galería
            </span>
          </div>
        )}

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{
            ...styles.dropzone,
            ...(isTouch ? styles.galleryZone : null),
            ...(dragging ? styles.dropzoneActive : null),
          }}
        >
          <span style={styles.dropIcon}>+</span>
          <span style={styles.dropText}>
            {isTouch
              ? "Elige una foto de tu galería"
              : "Arrastra tu foto aquí o haz clic para subir"}
          </span>
          <span style={styles.dropHint}>
            Se revisan con IA de moderación antes de publicarse en la galería
          </span>
        </div>

        {/* Hidden inputs live OUTSIDE the clickable zones: a programmatic
            .click() dispatches a bubbling click event, and if the input were
            nested inside a zone it would re-trigger that zone's onClick and
            open a second file dialog. */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onInputChange}
          style={{ display: "none" }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onInputChange}
          style={{ display: "none" }}
        />

        {items.length > 0 && (
          <div style={styles.grid}>
            {items.map((it) => (
              <div key={it.id} style={styles.thumb}>
                <img src={it.preview} alt="" style={styles.thumbImg} />
                <div style={styles.thumbOverlay}>
                  <span
                    style={{ ...styles.badge, color: STATUS_COLOR[it.status] }}
                  >
                    {STATUS_LABEL[it.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const styles: Record<string, CSSProperties> = {
  wrapper: {
    width: "100%",
    backgroundColor: "black",
    boxSizing: "border-box",
    padding: "40px 24px 60px",
  },
  inner: {
    width: "100%",
    maxWidth: "820px",
    margin: "0 auto",
  },
  dropzone: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    minHeight: "200px",
    padding: "32px",
    boxSizing: "border-box",
    border: "2px dashed rgba(255,255,255,0.5)",
    borderRadius: "12px",
    cursor: "pointer",
    textAlign: "center",
    color: "white",
    fontFamily: "Roboto Mono, monospace",
    transition: "border-color 0.15s ease, background-color 0.15s ease",
  },
  dropzoneActive: {
    borderColor: "white",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  dropIcon: {
    fontSize: "2.5rem",
    lineHeight: 1,
    fontWeight: 300,
  },
  dropText: {
    fontSize: "1rem",
    fontWeight: 500,
  },
  dropHint: {
    fontSize: "0.75rem",
    opacity: 0.6,
  },
  cameraZone: {
    border: "2px solid white",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: "16px",
  },
  galleryZone: {
    minHeight: "150px",
    borderColor: "rgba(255,255,255,0.35)",
    opacity: 0.85,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: "12px",
    marginTop: "24px",
  },
  thumb: {
    position: "relative",
    aspectRatio: "1 / 1",
    borderRadius: "8px",
    overflow: "hidden",
    backgroundColor: "#111",
  },
  thumbImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  thumbOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: "6px 8px",
    background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
  },
  badge: {
    fontFamily: "Roboto Mono, monospace",
    fontSize: "0.7rem",
    fontWeight: 500,
  },
};

export default PhotoUpload;
