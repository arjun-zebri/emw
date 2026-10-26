"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Monogram } from "@/components/brand/Logo";
import { MenuIcon } from "@/components/icons/MenuIcon";
import { lockScroll } from "@/lib/lenis";
import { SITE } from "@/lib/config";
import { primaryNav, vendorCta } from "./nav";

const ease = [0.76, 0, 0.24, 1] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [heroUnderHeader, setHeroUnderHeader] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let last = scrollY;
    const onScroll = () => {
      const y = scrollY;
      setScrolled(y > 24);
      setHidden(y > 240 && y > last + 2 ? true : y < last - 2 ? false : (h) => h);
      last = y;
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  // Over the home hero the header is light and transparent.
  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) return;
    // Watch a thin band at header height: light while the hero is behind the header.
    const io = new IntersectionObserver(([e]) => setHeroUnderHeader(e.isIntersecting), {
      rootMargin: `-36px 0px -${Math.max(0, innerHeight - 38)}px 0px`,
    });
    io.observe(hero);
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => {
    lockScroll(open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);

  const light = pathname === "/" && heroUnderHeader && !open;

  // TEMPORARY: /heroes renders its own header inside each option. Remove with that route.
  if (pathname.startsWith("/heroes")) return null;

  return (
    <>
      <header
        data-site-header
        className={clsx(
          "fixed inset-x-0 top-0 transition-[translate,background-color,color] duration-700 ease-out-expo",
          open ? "z-[60]" : "z-50",
          light ? "text-paper" : "text-ink",
          !light && scrolled && !open && "bg-paper/90 backdrop-blur-xl",
          hidden && !open && "-translate-y-full",
        )}
      >
        <div className="shell flex h-[var(--header-h)] items-center justify-between">
          <Link href="/" aria-label={`${SITE.name}, home`} className="relative z-[60]">
            {/* From lg the home hero puts the logo over the cream panel, so it stays ink. */}
            <Monogram className={clsx("w-[4.5rem] transition-[opacity,color] duration-500 hover:opacity-60", light && "lg:text-ink")} />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-10 md:flex">
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className="t-nav link-line"
              >
                {item.label}
              </Link>
            ))}
            <Link href={vendorCta.href} className="t-nav link-line">
              {vendorCta.label}
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="relative z-[60] -mr-2 p-2 md:hidden"
          >
            <MenuIcon open={open} className="size-7" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="site-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-[55] flex flex-col bg-paper md:hidden"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ opacity: 0, transition: { duration: 0.45, ease: [0.25, 1, 0.5, 1] } }}
            transition={{ duration: 0.7, ease }}
          >
            <nav aria-label="Mobile" className="shell mt-auto mb-12 flex flex-col gap-1">
              {[{ href: "/", label: "Home" }, ...primaryNav, vendorCta].map((item, i) => (
                <div key={item.href} className="overflow-hidden">
                  <motion.div
                    initial={{ y: "110%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link href={item.href} onClick={() => setOpen(false)} className="block font-display text-[2.75rem] leading-[1.15] tracking-[-0.02em]">
                      {item.label}
                    </Link>
                  </motion.div>
                </div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
