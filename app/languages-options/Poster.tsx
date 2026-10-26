"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Media } from "@/components/media/Media";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { ease, type LangRow } from "./types";

const CYCLE_MS = 4000;

/*
 * Option 3: every language set together like a printed poster, on a dark full-width stage. Behind
 * it, a photograph by one of the chosen language's vendors fills the stage, darkened and drifting
 * slowly, crossfading as the language changes; the chosen word comes forward in cream. Until
 * someone interacts it moves through the languages on its own (only while on screen, never with
 * reduced motion). With a mouse, hovering previews and clicking opens the directory. Without hover
 * (phones), the first tap selects and a second tap, or the link beneath, opens it.
 */
export function Poster({ rows, heading }: { rows: LangRow[]; heading: string }) {
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const current = rows[active];
  const lead = current.vendors.find((v) => v.cover);
  const names = current.vendors.slice(0, 3).map((v) => v.name);
  const more = current.count - names.length;

  const choose = (i: number) => {
    setTouched(true);
    setActive(i);
  };

  useEffect(() => {
    if (touched || matchMedia("(prefers-reduced-motion: reduce)").matches || !root.current) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const io = new IntersectionObserver(([e]) => {
      clearInterval(timer);
      if (e.isIntersecting) timer = setInterval(() => setActive((a) => (a + 1) % rows.length), CYCLE_MS);
    });
    io.observe(root.current);
    return () => {
      io.disconnect();
      clearInterval(timer);
    };
  }, [touched, rows.length]);

  const onClick = (e: React.MouseEvent, i: number) => {
    if (i !== active && !matchMedia("(hover: hover)").matches) {
      e.preventDefault();
      choose(i);
    }
  };

  return (
    <div ref={root} className="relative flex min-h-[100svh] items-center overflow-hidden bg-night text-paper">
      <div className="absolute inset-0" aria-hidden>
        <AnimatePresence initial={false}>
          {lead && (
            <motion.div
              key={lead.cover}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, ease: [0.25, 1, 0.5, 1] }}
            >
              <motion.div className="size-full" initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: 9, ease: [0.16, 1, 0.3, 1] }}>
                <Media src={lead.cover} alt="" brief="" sizes="100vw" className="size-full" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <span className="absolute inset-0 bg-night/72" />
      </div>

      <div className="shell relative py-[clamp(6rem,12vw,10rem)] text-center">
        <h2 className="t-small mb-[clamp(2.5rem,5vw,4rem)] text-paper/60">{heading}</h2>
        <p className="mx-auto max-w-[22ch] font-display text-[clamp(2.5rem,6vw,6.25rem)] leading-[1.15] tracking-[-0.02em] text-balance">
          {rows.map((row, i) => (
            <span key={row.name}>
              <Link
                href={`/vendors?lang=${row.name}`}
                lang={row.lang}
                aria-current={i === active ? "true" : undefined}
                onPointerEnter={(e) => e.pointerType === "mouse" && choose(i)}
                // Keyboard focus previews; a tap's focus must not, or the tap would select and navigate at once.
                onFocus={(e) => e.currentTarget.matches(":focus-visible") && choose(i)}
                onClick={(e) => onClick(e, i)}
                className={clsx(
                  "inline-block whitespace-nowrap transition-colors duration-700",
                  i === active ? "text-paper" : "text-paper/25 [@media(hover:hover)]:hover:text-paper/60",
                )}
              >
                {row.native}
              </Link>
              {i < rows.length - 1 && " "}
            </span>
          ))}
        </p>

        <div className="mt-12 min-h-[5.5rem]" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease }}
            >
              <p className="t-small text-paper/70">
                <span className="text-paper">{current.name}</span>
                <span className="mx-3">·</span>
                {names.join(", ")}
                {more > 0 && ` and ${more} more`}
              </p>
              <ArrowLink href={`/vendors?lang=${current.name}`} className="mt-5">
                View {current.count} {current.count === 1 ? "vendor" : "vendors"}
              </ArrowLink>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
