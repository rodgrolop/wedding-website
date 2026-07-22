import { useEffect, useRef, useState, type ReactNode } from "react";

// Defers mounting heavy children (iframes, maps) until they scroll near the
// viewport. Until then it renders an empty spacer of `minHeight` so the page
// layout/scroll position stays stable; once revealed it stays mounted.
const LazyMount = ({
  children,
  rootMargin = "300px",
  minHeight = "60vh",
}: {
  children: ReactNode;
  /** How early to mount before entering the viewport. */
  rootMargin?: string;
  /** Placeholder height reserved before the children mount. */
  minHeight?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} style={visible ? undefined : { minHeight }}>
      {visible ? children : null}
    </div>
  );
};

export default LazyMount;
