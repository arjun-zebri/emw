"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { sectionTitle } from "@/components/ui/SectionHeading";

export type LanguageRow = {
  name: string;
  native: string;
  lang: string;
  count: number;
  vendors: { name: string; slug: string; cover?: string; discipline: string }[];
};

const ease = [0.16, 1, 0.3, 1] as const;
const item = {
  hidden: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
  gone: { opacity: 0, transition: { duration: 0.2 } },
};

/**
 * A two-column spread: the title over the languages, set as running type in their own scripts;
 * beside it, the vendors who speak the chosen language. Choosing is by click or
 * tap, never hover.
 */
export function LanguageIndex({
  rows,
  title,
}: {
  rows: LanguageRow[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const row = rows[active];
  const shown = row.vendors.slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
      <div className="md:col-span-6">
        <h2 data-reveal className={sectionTitle}>
          {title}
        </h2>
        <p className="mt-[clamp(2rem,4vw,3.5rem)] font-display text-[clamp(1.9rem,3.2vw,3.25rem)] leading-[1.35] tracking-[-0.015em]">
          {rows.map((r, i) => (
            <span key={r.name}>
              <button
                type="button"
                lang={r.lang}
                aria-pressed={i === active}
                onClick={() => setActive(i)}
                className={clsx(
                  "inline-block cursor-pointer whitespace-nowrap transition-colors duration-500",
                  i === active ? "text-ink" : "text-ink/25 hover:text-ink/55",
                )}
              >
                <span
                  className={clsx(
                    "underline decoration-1 underline-offset-[0.22em] transition-[text-decoration-color] duration-500",
                    i === active
                      ? "decoration-ink/50"
                      : "decoration-transparent",
                  )}
                >
                  {r.native}
                </span>
              </button>
              {i < rows.length - 1 && " "}
            </span>
          ))}
        </p>
      </div>

      {/* Tall enough for five vendors and "View all", so choosing a language never shifts the page. */}
      <div
        className="min-h-[35rem] md:col-span-5 md:col-start-8"
        aria-live="polite"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={row.name}
            initial="hidden"
            animate="shown"
            exit="gone"
            variants={{ shown: { transition: { staggerChildren: 0.05 } } }}
          >
            <motion.p variants={item} className="t-small mb-4">
              Speaking{" "}
              <span lang={row.lang} className="text-ink">
                {row.native}
              </span>
              {row.native !== row.name && ` · ${row.name}`}
            </motion.p>
            <ul>
              {shown.map((v) => (
                <motion.li
                  key={v.slug}
                  variants={item}
                  className="border-t hairline last:border-b"
                >
                  <Link
                    href={`/vendors/${v.slug}`}
                    transitionTypes={["nav-forward"]}
                    className="group flex items-center gap-4 py-3"
                  >
                    <span className="w-14 shrink-0 overflow-hidden">
                      <Media
                        src={v.cover}
                        alt=""
                        brief=""
                        sizes="56px"
                        quiet
                        className="aspect-[4/5] w-full transition-transform duration-700 ease-out-expo group-hover:scale-105"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="t-title block truncate">{v.name}</span>
                      <span className="t-small block">{v.discipline}</span>
                    </span>
                    <Icon
                      name="arrow"
                      className="size-3.5 shrink-0 -translate-x-1 opacity-0 transition duration-500 ease-out-expo group-hover:translate-x-0 group-hover:opacity-100"
                    />
                  </Link>
                </motion.li>
              ))}
            </ul>
            {row.count > shown.length && (
              <motion.div variants={item}>
                <ArrowLink
                  href={`/vendors?lang=${row.name}`}
                  transitionTypes={["nav-forward"]}
                  className="mt-6"
                >
                  View all {row.count}
                </ArrowLink>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
