"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Media } from "@/components/media/Media";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { ease, type LangRow } from "./types";

/** Option 1: full-width index; the active row opens to show the people who speak it. */
export function ExpandIndex({ rows }: { rows: LangRow[] }) {
  const [active, setActive] = useState(0);

  return (
    <ul>
      {rows.map((row, i) => {
        const open = i === active;
        const shown = row.vendors.filter((v) => v.cover).slice(0, 4);
        return (
          <li key={row.name} className="border-t hairline last:border-b" onPointerEnter={() => setActive(i)}>
            <Link
              href={`/vendors?lang=${row.name}`}
              onFocus={() => setActive(i)}
              className="flex items-baseline justify-between gap-6 py-5 md:py-6"
            >
              <span
                lang={row.lang}
                className={clsx(
                  "font-display text-[clamp(2rem,4.4vw,4.25rem)] leading-[1] tracking-[-0.02em] transition-colors duration-700",
                  open ? "text-ink" : "text-ink/35",
                )}
              >
                {row.native}
              </span>
              <span className="t-small shrink-0">
                {row.native !== row.name && <span className="mr-4">{row.name}</span>}
                <span className="tabular-nums">{row.count}</span>
              </span>
            </Link>
            <AnimatePresence initial={false}>
              {open && shown.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.8, ease }}
                  className="overflow-hidden"
                >
                  <div className="flex items-end gap-[clamp(0.5rem,1vw,1rem)] pb-8">
                    {shown.map((v) => (
                      <Link key={v.slug} href={`/vendors/${v.slug}`} className="group w-[clamp(7rem,13vw,12rem)] shrink-0">
                        <Media src={v.cover} alt={v.name} brief="" sizes="13vw" className="aspect-[4/5] w-full" />
                        <p className="t-small mt-2 truncate transition-colors group-hover:text-ink">{v.name}</p>
                      </Link>
                    ))}
                    <ArrowLink href={`/vendors?lang=${row.name}`} className="mb-7 ml-auto hidden shrink-0 md:inline-flex">
                      All {row.count}
                    </ArrowLink>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
