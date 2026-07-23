import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { VENUES, directionsUrl } from "../../data/venues";
import { useBreakpoint } from "../../hooks/useBreakpoint";

// Scales a single-line word so it exactly fills the width of its parent block.
// Monospace scaling is linear, so one measurement (current font * available /
// natural width) lands on the right size; a ResizeObserver keeps it in sync.
const FitWord = ({ text }: { text: string }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [fontPx, setFontPx] = useState(16);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const el = textRef.current;
    if (!wrap || !el) return;
    const update = () => {
      const available = wrap.clientWidth;
      const natural = el.scrollWidth;
      const current = parseFloat(getComputedStyle(el).fontSize);
      if (available > 0 && natural > 0) {
        setFontPx((current * available) / natural);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div ref={wrapRef} style={styles.introBlock}>
      <span ref={textRef} style={{ ...styles.introWord, fontSize: fontPx }}>
        {text}
      </span>
    </div>
  );
};

// Support section for TRANSPORTE: a "Paradas" heading block followed by one
// block per venue, showing the same info as the map marker tooltips.
const TransportInfoSection = () => {
  const isMobile = useBreakpoint() === "mobile";
  return (
    // On mobile the shared wrapper padding is removed horizontally so each block
    // can own its own side padding (heading 12px, venue blocks 30px), and the
    // top padding is reduced.
    <section
      style={
        isMobile
          ? { ...styles.wrapper, padding: "30px 0 60px" }
          : styles.wrapper
      }
    >
      <div style={styles.grid}>
        {isMobile ? (
          // fixed-size, right-aligned header matching LINEUP / TRANSPORTE
          <div style={styles.headerMobile}>Paradas</div>
        ) : (
          <FitWord text="Paradas" />
        )}

        {VENUES.map((v) => (
          <div
            key={v.key}
            style={
              isMobile ? { ...styles.block, padding: "0 30px" } : styles.block
            }
          >
            {v.time && (
              <div style={styles.time}>
                <strong>Hora: </strong>
                {v.time}
              </div>
            )}
            <div style={styles.name}>{v.name}</div>
            <div style={styles.address}>{v.address}</div>
            {v.description && <p style={styles.text}>{v.description}</p>}
            {v.phone && (
              <a
                style={styles.link}
                href={`tel:${v.phone.replace(/\s+/g, "")}`}
              >
                {v.phone}
              </a>
            )}
            {v.website && (
              <a
                style={styles.link}
                href={v.website}
                target="_blank"
                rel="noreferrer"
              >
                Web
              </a>
            )}
            <a
              style={styles.link}
              href={directionsUrl(v.address)}
              target="_blank"
              rel="noreferrer"
            >
              Cómo llegar
            </a>
          </div>
        ))}
      </div>
    </section>
  );
};

const styles: Record<string, CSSProperties> = {
  wrapper: {
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "black",
    color: "white",
    fontFamily: "Roboto Mono, monospace",
    padding: "60px 30px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "24px",
    alignItems: "stretch",
  },
  // Mobile heading: same sizing as the LINEUP / TRANSPORTE headers, centred,
  // with its own 12px horizontal padding.
  headerMobile: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "0 12px",
    textAlign: "center",
    fontFamily: "Roboto Mono, monospace",
    fontWeight: 700,
    textTransform: "uppercase",
    lineHeight: 1,
    fontSize: "clamp(2.5rem, 13vw, 6rem)",
    color: "black",
    WebkitTextStroke: "1px white",
    whiteSpace: "nowrap",
  },
  introBlock: {
    // no horizontal padding so the word can span the full block width
    display: "flex",
    alignItems: "center",
    width: "100%",
  },
  introWord: {
    // natural (shrink-to-fit) width so scrollWidth measures the text, not the
    // block; FitWord scales fontSize until this equals the block width
    whiteSpace: "nowrap",
    fontWeight: 700,
    textTransform: "uppercase",
    lineHeight: 1,
    // black fill + 2px white outline (matching the other non-mobile headers)
    color: "black",
    WebkitTextStroke: "2px white",
  },
  block: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "0.9rem",
    lineHeight: 1.4,
  },
  time: {
    fontSize: "1rem",
  },
  name: {
    fontWeight: 700,
    fontSize: "1.05rem",
  },
  address: {
    color: "#7c7c7c",
  },
  text: {
    margin: 0,
    color: "#cfcfcf",
  },
  link: {
    color: "#4a90e2",
    textDecoration: "none",
    fontWeight: 700,
    width: "fit-content",
  },
};

export default TransportInfoSection;
