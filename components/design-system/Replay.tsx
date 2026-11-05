"use client";

import { useRef } from "react";
import { Icon } from "@/components/icons/Icon";

/**
 * Wraps a live motion example and plays it again on demand: it clears `data-in` from every reveal
 * inside, lets the hidden state paint, then sets it back, exactly as MotionRuntime does on scroll.
 */
export function Replay({ children, label = "Play again" }: { children: React.ReactNode; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const play = () => {
    const els = ref.current?.querySelectorAll("[data-reveal], [data-reveal-media]");
    if (!els) return;
    els.forEach((el) => {
      const h = el as HTMLElement;
      h.style.transition = "none";
      h.querySelectorAll<HTMLElement>(":scope > *").forEach((c) => (c.style.transition = "none"));
      h.removeAttribute("data-in");
    });
    // Two frames: one to paint the hidden state without a transition, one to restore the transitions and reveal.
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        els.forEach((el) => {
          const h = el as HTMLElement;
          h.style.transition = "";
          h.querySelectorAll<HTMLElement>(":scope > *").forEach((c) => (c.style.transition = ""));
          h.setAttribute("data-in", "");
        }),
      ),
    );
  };

  return (
    <div>
      <div ref={ref}>{children}</div>
      <button type="button" onClick={play} className="t-nav link-line mt-5 inline-flex items-center gap-2.5">
        <Icon name="refresh" className="size-3.5" />
        {label}
      </button>
    </div>
  );
}
