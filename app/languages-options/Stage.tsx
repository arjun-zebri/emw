"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Media } from "@/components/media/Media";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { ease, type LangRow } from "./types";

/** Option 4: a quiet list beside a large photo stage for the chosen language. */
export function Stage({ rows }: { rows: LangRow[] }) {
  const [active, setActive] = useState(0);
  const current = rows[active];
  const lead = current.vendors.find((v) => v.cover);

  return (
    <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
      <ul className="md:col-span-4">
        {rows.map((row, i) => (
          <li key={row.name}>
            <Link
              href={`/vendors?lang=${row.name}`}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className="group flex items-baseline gap-4 py-1.5"
            >
              <span
                lang={row.lang}
                className={clsx(
                  "font-display text-[clamp(1.5rem,2.2vw,2.1rem)] leading-[1.2] tracking-[-0.01em] transition-colors duration-500",
                  i === active ? "text-ink" : "text-ink/35",
                )}
              >
                {row.native}
              </span>
              <span className={clsx("t-small transition-opacity duration-500", i === active ? "opacity-100" : "opacity-0")}>{row.count}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="md:col-span-7 md:col-start-6">
        <div className="relative aspect-[5/4] overflow-hidden bg-paper-soft">
          <AnimatePresence initial={false}>
            <motion.div
              key={current.name}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease }}
            >
              {lead && <Media src={lead.cover} alt={lead.name} brief="" sizes="58vw" className="size-full" />}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-4 flex items-baseline justify-between gap-6">
          <p className="t-small">
            {current.vendors
              .slice(0, 3)
              .map((v) => v.name)
              .join(", ")}
            {current.count > 3 && ` and ${current.count - 3} more`}
          </p>
          <ArrowLink href={`/vendors?lang=${current.name}`} className="shrink-0">
            {current.name === "English" ? "View" : current.name}
          </ArrowLink>
        </div>
      </div>
    </div>
  );
}
