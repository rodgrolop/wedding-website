import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useBreakpoint } from "../../hooks/useBreakpoint";

// Target: 1 August 2026 at 20:00 peninsular Spain time. August is summer, so
// Spain is on CEST (UTC+2) -> 20:00 CEST == 18:00 UTC. Using a fixed UTC instant
// makes the countdown identical for every visitor regardless of their timezone.
const TARGET = new Date(Date.UTC(2026, 7, 1, 18, 0, 0));

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(): TimeLeft {
  const diff = Math.max(0, TARGET.getTime() - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

// Shared so the number's line-height is exactly equal to its font-size, making
// the rendered box match the number's real height (used by the labels too).
const NUMBER_FONT_SIZE = "clamp(2rem, 12vw, 120px)";

const Countdown = () => {
  // initialise on mount, then tick every second
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft);
  const isMobile = useBreakpoint() === "mobile";

  // On mobile, shrink digits + gap and forbid wrapping so all four units
  // (DD HH MM SS) fit on a single line. Tablet/desktop keep the larger sizing.
  const numberSize = isMobile ? "clamp(1.4rem, 9.5vw, 64px)" : NUMBER_FONT_SIZE;
  const gap = isMobile ? "clamp(0.4rem, 3vw, 24px)" : "clamp(1rem, 6vw, 4rem)";

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const units: { label: string; value: number }[] = [
    { label: "D", value: timeLeft.days },
    { label: "H", value: timeLeft.hours },
    { label: "M", value: timeLeft.minutes },
    { label: "S", value: timeLeft.seconds },
  ];

  return (
    <div
      style={{
        ...styles.container,
        // centre the countdown on mobile; keep it right-aligned elsewhere
        justifyContent: isMobile ? "center" : "flex-end",
      }}
    >
      <div
        style={{
          ...styles.row,
          gap,
          flexWrap: isMobile ? "nowrap" : "wrap",
        }}
      >
        {units.map((u) => (
          <span key={u.label} style={{ ...styles.unit, fontSize: numberSize }}>
            <span style={styles.number}>
              {String(u.value).padStart(2, "0")}
            </span>
            <span
              style={{
                ...styles.label,
                WebkitTextStroke: isMobile ? "1px white" : "2px white",
              }}
            >
              {u.label}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  container: {
    width: "100%",
    // black at the bottom fading to transparent at the top, so the ribbon
    // behind appears to fade out under the numbers
    background: "linear-gradient(to top, #000 0%, #000 30%, transparent 100%)",
    color: "white",
    padding: "30px 30px 30px 30px",
    fontFamily: "Roboto Mono, monospace",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  row: {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  unit: {
    lineHeight: 1,
    fontWeight: 900,
  },
  number: {
    // plain white digits, no outline
    color: "white",
  },
  label: {
    // unit letter keeps the black fill + white outline look (stroke width is
    // set per-breakpoint at the call site)
    color: "black",
  },
};

export default Countdown;
