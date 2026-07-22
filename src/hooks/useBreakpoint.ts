import { useEffect, useState } from "react";

// Modern-device breakpoints: mobile <=640, tablet 641-1024, desktop >=1025.
export type Breakpoint = "mobile" | "tablet" | "desktop";

const at = (w: number): Breakpoint =>
  w <= 640 ? "mobile" : w <= 1024 ? "tablet" : "desktop";

/** Reactive breakpoint based on the viewport width. */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() =>
    typeof window !== "undefined" ? at(window.innerWidth) : "desktop",
  );

  useEffect(() => {
    const onResize = () => setBp(at(window.innerWidth));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return bp;
}
