import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useBreakpoint } from "../../hooks/useBreakpoint";

// vertical word pinned to the RIGHT (mirrors MapSection's left word). change
// freely -> section height and reserved-space offset are measured from it.
const SIDE_WORD = "GALERÍA";
const SIDE_WORD_RIGHT = 24; // word distance from the screen's right edge
const CONTENT_GAP = 24; // gap between the word and the reserved content area

// Gallery section: reserved content area on the left, the vertical word on the
// right. The section height matches the word's own height exactly, plus a
// 60px top/bottom margin.
const GallerySection = () => {
  const isMobile = useBreakpoint() === "mobile";
  const sideRef = useRef<HTMLSpanElement>(null);
  // measure the vertical word so (a) the section is never shorter than it and
  // (b) the content can reserve space to its left. it scales with vw -> re-measure.
  const [wordSize, setWordSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = sideRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setWordSize({ width: r.width, height: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const minHeight = wordSize.height;
  const contentRight = SIDE_WORD_RIGHT + wordSize.width + CONTENT_GAP;

  return (
    // full-width wrapper -> pins the side word to the screen edge and clips it
    // to this section's height so it can't bleed into neighbouring sections
    <section
      style={isMobile ? styles.wrapper : { ...styles.wrapper, minHeight }}
    >
      {/* On mobile the label becomes a horizontal, LEFT-aligned header above the
          gallery instead of the rotated side word. */}
      {isMobile && <span style={styles.header}>{SIDE_WORD}</span>}
      {/* content area: fills the section height, from the screen's left edge up
          to just left of the vertical word (desktop); full width below the
          header (mobile) */}
      <div
        style={
          isMobile
            ? styles.contentMobile
            : { ...styles.content, right: contentRight }
        }
      >
        <iframe
          src="https://guest.gallery/en/upload/Ksm4/photowall?qr=true&position=left-bottom"
          title="Galería"
          style={styles.iframe}
        />
      </div>
      {!isMobile && (
        <span ref={sideRef} style={styles.sideText}>
          {SIDE_WORD}
        </span>
      )}
    </section>
  );
};

const styles: Record<string, CSSProperties> = {
  wrapper: {
    position: "relative",
    width: "100%",
    // clip the vertical side word to this section (no bleed into neighbours)
    overflow: "hidden",
    backgroundColor: "black",
  },
  content: {
    // content area: full section height, from the screen's left edge to just
    // left of the word (`right` is set inline to clear the word).
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden",
  },
  // Mobile: gallery is a normal block below the header, full width with a fixed
  // height (the desktop layout's height depends on the rotated word).
  contentMobile: {
    position: "relative",
    width: "100%",
    height: "60vh",
    marginTop: "1rem",
    overflow: "hidden",
  },
  // Mobile header: horizontal, centred, non-rotated.
  header: {
    display: "block",
    boxSizing: "border-box",
    width: "80%",
    maxWidth: "1280px",
    margin: "0 auto",
    padding: 0,
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
  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
    display: "block",
  },
  sideText: {
    // same styling as MapSection's side word, but pinned to the screen's RIGHT
    // edge. wrapper is full-width so 24px is measured from the screen edge.
    position: "absolute",
    right: "24px",
    // vertically centred within the section
    top: "50%",
    writingMode: "vertical-rl",
    transform: "translateY(-50%) rotate(180deg)",
    fontFamily: "Roboto Mono, monospace",
    fontWeight: 700,
    textTransform: "uppercase",
    lineHeight: 1,
    // same size as the countdown numbers
    fontSize: "clamp(2rem, 12vw, 8rem)",
    // black fill + 2px white outline (matching the other non-mobile headers)
    color: "black",
    WebkitTextStroke: "2px white",
    whiteSpace: "nowrap",
    pointerEvents: "none",
  },
};

export default GallerySection;
