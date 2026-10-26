"use client";

import { useEffect, useRef } from "react";

/**
 * A column that stays in view while its neighbour scrolls. Its `top` comes from the className; when
 * the column is taller than the viewport, it is pulled up so it scrolls through first and then holds
 * by its bottom edge instead of being cut off.
 */
export function StickyColumn({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      el.style.top = "";
      const top = parseFloat(getComputedStyle(el).top) || 0;
      const gap = 16;
      if (el.offsetHeight + top + gap > innerHeight) el.style.top = `${innerHeight - el.offsetHeight - gap}px`;
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    addEventListener("resize", update);
    return () => {
      ro.disconnect();
      removeEventListener("resize", update);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
