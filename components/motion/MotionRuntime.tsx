"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getLenis, setLenis } from "@/lib/lenis";

// Revealed elements get a data-in attribute rather than a class: streamed-in HTML can be revealed
// before React hydrates it, and a class React also renders would then fail hydration.
const REVEAL = "[data-reveal]:not([data-in]), [data-reveal-media]:not([data-in])";

/** A link to another page was clicked: open it at the top. */
let toTop = false;

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

    // A link to another page opens it at the top (NT, 27 Nov 2026: the menu opened pages part way
    // down). Stop any glide still running, then go to the top once the new page is in (the effect on
    // pathname below): pages kept alive by <Activity> would otherwise come back where they were left.
    // A link to the page you're on goes back to its top. Back and forward, and links to a #section, are untouched.
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.hash) return;
      lenis?.stop();
      lenis?.start();
      if (url.pathname !== location.pathname) toTop = true;
      // Same page, other filters (the directory's): stay where you are.
      else if (url.search === location.search) {
        if (lenis) lenis.scrollTo(0);
        else scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      }
    };
    document.addEventListener("click", onClick, true);

    const t = setTimeout(() => (document.documentElement.dataset.intro = "seen"), 6200);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", onClick, true);
      lenis?.destroy();
      setLenis(null);
    };
  }, []);

  useEffect(() => {
    if (!toTop) return;
    toTop = false;
    getLenis()?.scrollTo(0, { immediate: true, force: true });
    scrollTo(0, 0);
  }, [pathname]);

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
