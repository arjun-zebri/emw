"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { Media } from "@/components/media/Media";
import { Icon } from "@/components/icons/Icon";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ease, type LangRow, type LangVendor } from "../languages-options/types";
import { type PosterState, usePoster } from "./usePoster";

type Props = { rows: LangRow[]; heading: string };

const posterType = "font-display text-[clamp(2.25rem,5.4vw,5.5rem)] leading-[1.15] tracking-[-0.02em]";

/** The languages, set as running type; each is a button that chooses it. `on`/`off` style the chosen and resting words. */
function Words({
  rows,
  poster,
  on,
  off,
  className,
  type = posterType,
  counts,
  after,
}: {
  rows: LangRow[];
  poster: PosterState;
  on: string;
  off: string;
  className?: string;
  type?: string;
  /** Show each language's vendor count as a superscript. */
  counts?: boolean;
  after?: (row: LangRow, active: boolean) => React.ReactNode;
}) {
  return (
    <p className={clsx(type, className)}>
      {rows.map((row, i) => (
        <span key={row.name}>
          <button
            lang={row.lang}
            {...poster.bind(i)}
            className={clsx("inline-block cursor-pointer whitespace-nowrap transition-colors duration-500", i === poster.active ? on : off)}
          >
            {row.native}
            {counts && <sup className="ml-[0.15em] align-[0.9em] font-sans text-[0.8125rem] tracking-normal tabular-nums">{row.count}</sup>}
          </button>
          {after?.(row, i === poster.active)}
          {i < rows.length - 1 && " "}
        </span>
      ))}
    </p>
  );
}

function ViewAll({ row, className }: { row: LangRow; className?: string }) {
  return (
    <ArrowLink href={`/vendors?lang=${row.name}`} className={className}>
      View all {row.count}
    </ArrowLink>
  );
}

/** Crossfades its children whenever `k` changes. */
function Swap({ k, children, className }: { k: string; children: React.ReactNode; className?: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={k}
        className={className}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.55, ease }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function VendorCard({ v, sizes }: { v: LangVendor; sizes: string }) {
  return (
    <Link href={`/vendors/${v.slug}`} className="group block">
      <div className="overflow-hidden">
        <div className="transition-transform duration-[1200ms] ease-out-expo group-hover:scale-[1.03]">
          <Media src={v.cover} alt={v.name} brief="" sizes={sizes} className="aspect-[4/5] w-full" />
        </div>
      </div>
      <h3 className="t-title mt-3">{v.name}</h3>
      <p className="t-small mt-0.5">{v.discipline}</p>
    </Link>
  );
}

/* ── 1 · Framed stage ─────────────────────────────────────────────────── */

export function FramedStage({ rows, heading }: Props) {
  const [root, poster] = usePoster(rows);
  const lead = poster.withPhotos[0];
  return (
    <div ref={root} className="relative overflow-hidden bg-night text-paper">
      <div className="absolute inset-0" aria-hidden>
        <AnimatePresence initial={false}>
          {lead && (
            <motion.div key={lead.cover} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.4 }}>
              <motion.div className="size-full" initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 9, ease }}>
                <Media src={lead.cover} alt="" brief="" sizes="100vw" className="size-full" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <span className="absolute inset-0 bg-night/72" />
      </div>
      <div className="relative px-[clamp(1.25rem,5vw,5rem)] py-[clamp(4rem,8vw,7rem)] text-center">
        <h2 className="t-small mb-[clamp(2rem,4vw,3.5rem)] text-paper/60">{heading}</h2>
        <Words rows={rows} poster={poster} on="text-paper" off="text-paper/25 hover:text-paper/60" className="mx-auto max-w-[22ch] text-balance" />
        <Swap k={poster.current.name} className="mt-[clamp(2.5rem,5vw,4rem)] flex flex-wrap items-end justify-center gap-x-8 gap-y-6">
          {poster.withPhotos.slice(0, 3).map((v) => (
            <Link key={v.slug} href={`/vendors/${v.slug}`} className="group flex items-center gap-3 text-left">
              <Media src={v.cover} alt="" brief="" sizes="56px" className="size-14 shrink-0" />
              <span>
                <span className="t-title block transition-opacity group-hover:opacity-70">{v.name}</span>
                <span className="t-small block text-paper/60">{v.discipline}</span>
              </span>
            </Link>
          ))}
        </Swap>
        <ViewAll row={poster.current} className="mt-10" />
      </div>
    </div>
  );
}

/* ── 2 · Poster and vendor row ────────────────────────────────────────── */

export function PosterRow({ rows, heading }: Props) {
  const [root, poster] = usePoster(rows);
  return (
    <div ref={root}>
      <h2 className="t-small mb-[clamp(2rem,4vw,3.5rem)] text-center">{heading}</h2>
      <Words rows={rows} poster={poster} on="text-ink" off="text-ink/20 hover:text-ink/45" className="mx-auto max-w-[22ch] text-center text-balance" />
      <div className="mt-[clamp(3rem,6vw,5rem)] border-t hairline pt-8">
        <div className="mb-6 flex items-baseline justify-between gap-6">
          <Swap k={poster.current.name}>
            <p className="t-title">
              Speaking {poster.current.name === "English" ? "English" : <span lang={poster.current.lang}>{poster.current.native}</span>}
            </p>
          </Swap>
          <ViewAll row={poster.current} className="shrink-0" />
        </div>
        <Swap k={poster.current.name} className="-mx-[var(--gutter)] flex snap-x gap-[clamp(0.75rem,1.5vw,1.5rem)] overflow-x-auto px-[var(--gutter)] [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
          {poster.withPhotos.slice(0, 4).map((v) => (
            <div key={v.slug} className="w-[60vw] shrink-0 snap-start md:w-auto">
              <VendorCard v={v} sizes="(min-width: 768px) 25vw, 60vw" />
            </div>
          ))}
        </Swap>
      </div>
    </div>
  );
}

/* ── 3 · Poster and vendor list ───────────────────────────────────────── */

export function PosterList({ rows }: Props) {
  const [root, poster] = usePoster(rows);
  const row = poster.current;
  const shown = row.vendors.slice(0, 5);
  return (
    <div ref={root}>
      <SectionHeading>Find vendors by language</SectionHeading>
      <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
        <Words
          rows={rows}
          poster={poster}
          counts
          type="font-display text-[clamp(1.9rem,3.2vw,3.25rem)] leading-[1.3] tracking-[-0.015em]"
          on="text-ink"
          off="text-ink/25 hover:text-ink/55"
          className="md:col-span-6"
        />
        <div className="md:col-span-5 md:col-start-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={row.name} initial="hidden" animate="shown" exit="gone" variants={{ shown: { transition: { staggerChildren: 0.05 } } }}>
              <motion.p variants={item} className="t-small mb-4">
                Speaking{" "}
                <span lang={row.lang} className="text-ink">
                  {row.native}
                </span>
                {row.native !== row.name && ` · ${row.name}`}
              </motion.p>
              <ul>
                {shown.map((v) => (
                  <motion.li key={v.slug} variants={item} className="border-t hairline last:border-b">
                    <Link href={`/vendors/${v.slug}`} className="group flex items-center gap-4 py-3">
                      <span className="w-12 shrink-0 overflow-hidden">
                        <Media src={v.cover} alt="" brief="" sizes="48px" quiet className="aspect-[4/5] w-full transition-transform duration-700 ease-out-expo group-hover:scale-105" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="t-title block truncate">{v.name}</span>
                        <span className="t-small block">{v.discipline}</span>
                      </span>
                      <Icon name="arrow" className="size-3.5 shrink-0 -translate-x-1 opacity-0 transition duration-500 ease-out-expo group-hover:translate-x-0 group-hover:opacity-100" />
                    </Link>
                  </motion.li>
                ))}
              </ul>
              {row.count > shown.length && (
                <motion.div variants={item}>
                  <ViewAll row={row} className="mt-6" />
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const item = {
  hidden: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
  gone: { opacity: 0, transition: { duration: 0.2 } },
};

/* ── 4 · Window behind the type ───────────────────────────────────────── */

export function WindowBehind({ rows, heading }: Props) {
  const [root, poster] = usePoster(rows);
  const lead = poster.withPhotos[0];
  const names = poster.current.vendors.slice(0, 3).map((v) => v.name);
  return (
    <div ref={root} className="text-center">
      <h2 className="t-small mb-[clamp(2rem,4vw,3.5rem)]">{heading}</h2>
      <div className="relative isolate bg-paper">
        <div className="absolute top-1/2 left-1/2 -z-10 aspect-[3/4] w-[clamp(13rem,26vw,24rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-paper-soft">
          <AnimatePresence initial={false}>
            {lead && (
              <motion.div key={lead.cover} className="absolute inset-0" initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1, ease }}>
                <Media src={lead.cover} alt="" brief="" sizes="26vw" className="size-full" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <Words
          rows={rows}
          poster={poster}
          on="text-paper opacity-100"
          off="text-paper opacity-30 hover:opacity-60"
          className="mx-auto max-w-[22ch] py-[clamp(2rem,5vw,4rem)] text-balance mix-blend-difference"
        />
      </div>
      <Swap k={poster.current.name} className="mt-[clamp(2.5rem,5vw,4rem)]">
        <p className="t-heading mx-auto max-w-[30ch]">{names.join(", ")}</p>
        <ViewAll row={poster.current} className="mt-6" />
      </Swap>
    </div>
  );
}

/* ── 5 · Photos within the words ──────────────────────────────────────── */

export function InlinePhotos({ rows, heading }: Props) {
  const [root, poster] = usePoster(rows);
  const names = poster.current.vendors.slice(0, 3).map((v) => v.name);
  return (
    <div ref={root} className="text-center">
      <h2 className="t-small mb-[clamp(2rem,4vw,3.5rem)]">{heading}</h2>
      <Words
        rows={rows}
        poster={poster}
        on="text-ink"
        off="text-ink/20 hover:text-ink/45"
        className="mx-auto max-w-[24ch] text-balance"
        after={(row, active) => {
          const cover = row.vendors.find((v) => v.cover)?.cover;
          if (!cover) return null;
          return (
            <span
              aria-hidden
              className={clsx(
                "inline-block h-[0.78em] overflow-hidden align-[-0.06em] transition-[width,margin] duration-700 ease-out-expo",
                active ? "ml-[0.25em] w-[1.15em]" : "ml-0 w-0",
              )}
            >
              {active && <Media src={cover} alt="" brief="" sizes="120px" className="h-full w-[1.15em]" />}
            </span>
          );
        }}
      />
      <Swap k={poster.current.name} className="mt-[clamp(2.5rem,5vw,4rem)]">
        <p className="t-heading mx-auto max-w-[30ch]">{names.join(", ")}</p>
        <ViewAll row={poster.current} className="mt-6" />
      </Swap>
    </div>
  );
}
