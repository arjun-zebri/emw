"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { setLenis } from "@/lib/lenis";

// Revealed elements get a data-in attribute rather than a class: streamed-in HTML can be revealed
// before React hydrates it, and a class React also renders would then fail hydration.
const REVEAL = "[data-reveal]:not([data-in]), [data-reveal-media]:not([data-in])";

/*
 * One client island for site-wide motion: Lenis smooth scrolling, scroll-triggered reveals for
 * anything marked with data-reveal / data-reveal-media, and marking the intro as seen.
 */
export function MotionRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = reduce ? null : new Lenis({ autoRaf: true, lerp: 0.085, wheelMultiplier: 0.9 });
    setLenis(lenis);

    const t = setTimeout(() => (document.documentElement.dataset.intro = "seen"), 6200);
    return () => {
      clearTimeout(t);
      lenis?.destroy();
      setLenis(null);
    };
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute("data-in", "");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    let raf = 0;
    const scan = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => document.querySelectorAll(REVEAL).forEach((el) => io.observe(el)));
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      io.disconnect();
    };
  }, [pathname]);

  return null;
}
