import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { API_BASE } from "../gallery/api";
import type { Photo, PhotoState } from "../gallery/api";
import BackToHome from "../nav/BackToHome";
import { resetGalleryRotation } from "../gallery/PhotoGrid";

const TOKEN_KEY = "wedding_admin_token";

const STATE_LABEL: Record<PhotoState, string> = {
  pending: "Pendiente",
  rejected: "Rechazada por IA",
  approved: "Publicada",
};

const STATE_COLOR: Record<PhotoState, string> = {
  pending: "#e0b341",
  rejected: "#e05a5a",
  approved: "#5fbf6b",
};

const stateOf = (p: Photo): PhotoState => p.state ?? "pending";

const AdminPage = () => {
  const [token, setToken] = useState<string>(
    () => localStorage.getItem(TOKEN_KEY) || "",
  );
  const [input, setInput] = useState("");
  const [items, setItems] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const fetchPending = useCallback(async (tok: string) => {
    setLoading(true);
    setAuthError(false);
    try {
      const res = await fetch(`${API_BASE}/gallery/admin-pending`, {
        headers: { "x-admin-token": tok },
      });
      if (res.status === 401) {
        setAuthError(true);
        setItems([]);
        return false;
      }
      const data = await res.json();
      const list = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.pending)
          ? data.pending
          : [];
      setItems(list);
      return true;
    } catch {
      setAuthError(true);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) void fetchPending(token);
  }, [token, fetchPending]);

  const submitToken = async () => {
    const ok = await fetchPending(input.trim());
    if (ok) {
      localStorage.setItem(TOKEN_KEY, input.trim());
      setToken(input.trim());
    }
  };

  const resolve = async (key: string, action: "approve" | "reject") => {
    setBusy((b) => ({ ...b, [key]: true }));
    try {
      const res = await fetch(`${API_BASE}/gallery/admin-${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({ key }),
      });
      if (res.ok) {
        // refetch so the item reappears in its new state (e.g. approved)
        void fetchPending(token);
      }
    } catch {
      // leave it in the list on failure
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setInput("");
    setItems([]);
  };

  // --- token gate ---
  if (!token || authError) {
    return (
      <div style={styles.gateWrapper}>
        <div style={styles.gate}>
          <h1 style={styles.gateTitle}>Moderación</h1>
          {authError && (
            <p style={styles.error}>Token incorrecto. Inténtalo de nuevo.</p>
          )}
          <input
            type="password"
            placeholder="Admin token"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submitToken();
            }}
            style={styles.tokenInput}
          />
          <button type="button" style={styles.primaryBtn} onClick={submitToken}>
            Entrar
          </button>
        </div>
        <BackToHome />
      </div>
    );
  }

  // --- moderation queue ---
  const counts = items.reduce(
    (acc, p) => {
      acc[stateOf(p)] += 1;
      return acc;
    },
    { pending: 0, rejected: 0, approved: 0 } as Record<PhotoState, number>,
  );

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h1 style={styles.title}>
          Moderación ({items.length}) · {counts.pending} pendientes ·{" "}
          {counts.rejected} rechazadas · {counts.approved} publicadas
        </h1>
        <div style={styles.topActions}>
          <button
            type="button"
            style={styles.ghostBtn}
            onClick={() => fetchPending(token)}
          >
            Actualizar
          </button>
          <button
            type="button"
            style={styles.ghostBtn}
            onClick={() => {
              if (
                window.confirm(
                  "¿Reiniciar la rotación de la galería? Solo afecta a este navegador.",
                )
              )
                resetGalleryRotation();
            }}
          >
            Reiniciar galería
          </button>
          <button type="button" style={styles.ghostBtn} onClick={logout}>
            Salir
          </button>
        </div>
      </div>

      {loading && <p style={styles.muted}>Cargando…</p>}
      {!loading && items.length === 0 && (
        <p style={styles.muted}>No hay fotos todavía.</p>
      )}

      <div style={styles.grid}>
        {items.map((p) => {
          const st = stateOf(p);
          return (
            <div key={p.key} style={styles.card}>
              <div style={styles.imgWrap}>
                <img src={p.url} alt="" style={styles.cardImg} />
                <span
                  style={{ ...styles.badge, backgroundColor: STATE_COLOR[st] }}
                >
                  {STATE_LABEL[st]}
                </span>
              </div>
              <div style={styles.cardActions}>
                {st !== "approved" && (
                  <button
                    type="button"
                    disabled={busy[p.key]}
                    style={{
                      ...styles.approveBtn,
                      opacity: busy[p.key] ? 0.5 : 1,
                    }}
                    onClick={() => resolve(p.key, "approve")}
                  >
                    {st === "rejected" ? "Aprobar igualmente" : "Aprobar"}
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy[p.key]}
                  style={{
                    ...styles.rejectBtn,
                    opacity: busy[p.key] ? 0.5 : 1,
                  }}
                  onClick={() => resolve(p.key, "reject")}
                >
                  {st === "approved"
                    ? "Retirar"
                    : st === "rejected"
                      ? "Eliminar"
                      : "Rechazar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <BackToHome />
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0b0b0b",
    color: "white",
    fontFamily: "Roboto Mono, monospace",
    padding: "24px",
    boxSizing: "border-box",
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "24px",
  },
  title: { fontSize: "1.1rem", fontWeight: 700, margin: 0 },
  topActions: { display: "flex", gap: "8px" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "16px",
  },
  card: {
    background: "#161616",
    borderRadius: "10px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  imgWrap: {
    position: "relative",
  },
  cardImg: {
    width: "100%",
    aspectRatio: "1 / 1",
    objectFit: "cover",
    display: "block",
  },
  badge: {
    position: "absolute",
    top: "8px",
    left: "8px",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "0.65rem",
    fontWeight: 700,
    color: "black",
    letterSpacing: "0.02em",
  },
  cardActions: { display: "flex" },
  approveBtn: {
    flex: 1,
    padding: "10px",
    border: "none",
    background: "#2e7d32",
    color: "white",
    fontFamily: "Roboto Mono, monospace",
    fontWeight: 500,
    cursor: "pointer",
  },
  rejectBtn: {
    flex: 1,
    padding: "10px",
    border: "none",
    background: "#7d2e2e",
    color: "white",
    fontFamily: "Roboto Mono, monospace",
    fontWeight: 500,
    cursor: "pointer",
  },
  muted: { color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" },
  gateWrapper: {
    minHeight: "100vh",
    background: "#0b0b0b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  gate: {
    width: "100%",
    maxWidth: "340px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    color: "white",
    fontFamily: "Roboto Mono, monospace",
  },
  gateTitle: { fontSize: "1.2rem", fontWeight: 700, margin: 0 },
  tokenInput: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.25)",
    background: "#161616",
    color: "white",
    fontFamily: "Roboto Mono, monospace",
    fontSize: "0.9rem",
  },
  primaryBtn: {
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    background: "white",
    color: "black",
    fontFamily: "Roboto Mono, monospace",
    fontWeight: 700,
    cursor: "pointer",
  },
  ghostBtn: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.25)",
    background: "transparent",
    color: "white",
    fontFamily: "Roboto Mono, monospace",
    fontSize: "0.8rem",
    cursor: "pointer",
  },
  error: { color: "#e05a5a", fontSize: "0.8rem", margin: 0 },
};

export default AdminPage;
