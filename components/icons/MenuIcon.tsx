"use client";

import { motion } from "motion/react";

const ease = [0.76, 0, 0.24, 1] as const;

// Two hairlines of unequal length, right-aligned; open, they swing into a cross.
const lines = [
  { closed: "M3 9 L21 9", open: "M5.5 5.5 L18.5 18.5" },
  { closed: "M10 15 L21 15", open: "M5.5 18.5 L18.5 5.5" },
];

/** Menu toggle glyph, in the Icon set's style (24px grid, 1.25 stroke, round caps). */
export function MenuIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" className={className} aria-hidden>
      {lines.map((l, i) => (
        <motion.path key={i} initial={false} animate={{ d: open ? l.open : l.closed }} transition={{ duration: 0.6, ease }} />
      ))}
    </svg>
  );
}
