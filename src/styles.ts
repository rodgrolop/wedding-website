import type { CSSProperties } from "react";

export const style: Record<string, CSSProperties> = {
  mainContainer: {
    position: "relative",
    width: "100%",
    // Height is set in index.html (#inicio) as `100vh` then `100svh` so the
    // svh value (small viewport, toolbar shown) wins where supported, with a
    // vh fallback. That two-value fallback can't live in an inline style, and
    // an inline height would override the stylesheet anyway.
    backgroundColor: "black",
  },
  canvasLayer: {
    position: "absolute",
    inset: 0,
    zIndex: 0,
  },
  // countdown overlaid on the hero, pinned to its bottom, above the shader
  countdownOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    // clear the home-indicator / safe area on notched phones
    paddingBottom: "env(safe-area-inset-bottom)",
    zIndex: 2,
  },
  overlay: {
    position: "relative",
    inset: 0,
    zIndex: 1,
    boxSizing: "border-box", // keep padding inside the 100vh so R isn't clipped
    padding: "2vh 3vw",
    flexDirection: "column",
    display: "flex",
    alignItems: "flex-start",
  },
  overlayRow: {
    display: "flex",
    alignItems: "center",
    flexDirection: "row",
  },
  // Font sizes scale with viewport HEIGHT (vh) so the layout keeps roughly the
  // same proportions/positions as the screen gets shorter (mobile-first). The
  // clamp() bounds keep them sensible on very small and very large screens.
  whiteH1: {
    color: "white",
    fontSize: "clamp(54px, 8vw, 160px)",
    WebkitTextStroke: "1px white",
  },
  transH1: {
    color: "black",
    fontSize: "clamp(54px, 8vw, 160px)",
    // 1px white outline around the black glyphs
    WebkitTextStroke: "1px white",
  },
  whiteDate: {
    color: "white",
    padding: "4px 0",
    // Scale with height for proportions, but never wider than the viewport
    // allows (min with vw) so the long coordinate line can't overflow on narrow
    // phones and push fixed UI (menu button) off-screen.
    fontSize: "clamp(16px, min(6vh, 4.7vw), 36px)",
    fontWeight: 300,
    lineHeight: 1,
  },
  whiteLocation: {
    padding: "16px 0",
    color: "#7c7c7c",
    fontSize: "clamp(0.9rem, min(6vh, 4.5vw), 21px)",
    fontWeight: 300,
    lineHeight: 1,
  },
};
