import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { API_BASE } from "../gallery/api";
import type { Photo } from "../gallery/api";

const TOKEN_KEY = "wedding_admin_token";

const AdminPage = () => {
  const [token, setToken] = useState<string>(
    () => localStorage.getItem(TOKEN_KEY) || "",
  );
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Photo[]>([]);
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
        setPending([]);
        return false;
      }
      const data = await res.json();
      setPending(Array.isArray(data.pending) ? data.pending : []);
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
        setPending((prev) => prev.filter((p) => p.key !== key));
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
    setPending([]);
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
      </div>
    );
  }

  // --- moderation queue ---
  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h1 style={styles.title}>
          Pendientes de revisión ({pending.length})
        </h1>
        <div style={styles.topActions}>
          <button
            type="button"
            style={styles.ghostBtn}
            onClick={() => fetchPending(token)}
          >
            Actualizar
          </button>
          <button type="button" style={styles.ghostBtn} onClick={logout}>
            Salir
          </button>
        </div>
      </div>

      {loading && <p style={styles.muted}>Cargando…</p>}
      {!loading && pending.length === 0 && (
        <p style={styles.muted}>No hay fotos pendientes. Todo revisado.</p>
      )}

      <div style={styles.grid}>
        {pending.map((p) => (
          <div key={p.key} style={styles.card}>
            <img src={p.url} alt="" style={styles.cardImg} />
            <div style={styles.cardActions}>
              <button
                type="button"
                disabled={busy[p.key]}
                style={{ ...styles.approveBtn, opacity: busy[p.key] ? 0.5 : 1 }}
                onClick={() => resolve(p.key, "approve")}
              >
                Aprobar
              </button>
              <button
                type="button"
                disabled={busy[p.key]}
                style={{ ...styles.rejectBtn, opacity: busy[p.key] ? 0.5 : 1 }}
                onClick={() => resolve(p.key, "reject")}
              >
                Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
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
  cardImg: {
    width: "100%",
    aspectRatio: "1 / 1",
    objectFit: "cover",
    display: "block",
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
