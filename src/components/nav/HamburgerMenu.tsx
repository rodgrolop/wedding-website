import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useBreakpoint } from "../../hooks/useBreakpoint";

// Approximate top offset (px) to sit the toggle around the top of "MJ RODRIGO".
// Using fixed px instead of measuring the row (whose line-height makes it
// taller than the glyphs) keeps the alignment simple and predictable.
const TOGGLE_TOP_PX = { mobile: 24, other: 40 } as const;

// Links either scroll to an in-page section (`id`, anchors added in App.tsx)
// or navigate to a standalone route (`to`). "+INFO" targets the footer.
type NavLink = { label: string; id?: string; to?: string };

const LINKS: NavLink[] = [
  { label: "INICIO", id: "inicio" },
  { label: "LINEUP", id: "lineup" },
  { label: "TRANSPORTE", id: "transporte" },
  { label: "PARADAS", id: "paradas" },
  { label: "GALERÍA", id: "galeria" },
  { label: "+INFO", id: "info" },
  { label: "GALERÍA DE FOTOS", to: "/galeria" },
];

const HamburgerMenu = () => {
  const [open, setOpen] = useState(false);
  const bp = useBreakpoint();
  const navigate = useNavigate();

  const toggleTop =
    bp === "mobile" ? TOGGLE_TOP_PX.mobile : TOGGLE_TOP_PX.other;

  // Close on Escape and lock body scroll while the overlay is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const go = (link: NavLink) => {
    setOpen(false);
    if (link.to) {
      navigate(link.to);
      return;
    }
    // Let the overlay start closing, then smooth-scroll to the section.
    requestAnimationFrame(() => {
      if (!link.id) return;
      document
        .getElementById(link.id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <>
      {/* Full-viewport fixed wrapper: positions the toggle via padding so it can
          never be pushed off-screen by horizontal document overflow (the 100vw
          decorative side words), which breaks `right` on some mobile browsers. */}
      <div style={{ ...styles.toggleWrap, paddingTop: `${toggleTop}px` }}>
        <button
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={styles.toggle}
        >
          {open ? <IconClose /> : <IconBurger />}
        </button>
      </div>

      <nav
        aria-hidden={!open}
        style={{
          ...styles.overlay,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <ul style={styles.list}>
          {LINKS.map((link) => (
            <li key={link.to ?? link.id}>
              <button
                type="button"
                onClick={() => go(link)}
                style={styles.link}
              >
                {link.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};

const IconBurger = () => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const IconClose = () => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
  >
    <line x1="5" y1="5" x2="19" y2="19" />
    <line x1="19" y1="5" x2="5" y2="19" />
  </svg>
);

const styles: Record<string, CSSProperties> = {
  toggleWrap: {
    position: "fixed",
    inset: 0,
    zIndex: 6001,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "flex-start",
    padding: "2vh 3vw",
    pointerEvents: "none",
  },
  toggle: {
    pointerEvents: "auto",
    zIndex: 6001,
    width: "48px",
    height: "48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.35)",
    background: "rgba(0,0,0,0.35)",
    color: "#fff",
    cursor: "pointer",
    padding: 0,
    backdropFilter: "blur(4px)",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 6000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.92)",
    transition: "opacity 0.3s ease",
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "clamp(18px, 4vh, 36px)",
  },
  link: {
    fontFamily: '"Roboto Mono", monospace',
    fontWeight: 700,
    letterSpacing: "0.15em",
    fontSize: "clamp(1.4rem, 6vw, 2.6rem)",
    color: "#fff",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "4px 8px",
  },
};

export default HamburgerMenu;
