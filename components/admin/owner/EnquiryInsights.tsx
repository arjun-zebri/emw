"use client";

import clsx from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { crafts } from "@/data/taxonomy";
import type { Enquiry, ListedVendor } from "@/lib/admin/enquiries";
import { buckets, craftOfVendor, culturesOf, type Facet, type Facets, melDay, MIN_BASE, type Range } from "@/lib/admin/enquiry-filters";
import { day, month, num, plural } from "@/lib/admin/format";
import { dayNumber } from "@/lib/admin/time";
import { BarList, Bone, Columns } from "../charts";
import { Drawer } from "../Drawer";
import { Delta, Panel, Stat } from "../ui";

/*
 * What the enquiries add up to, for the team. Each part answers something they act on:
 *   Enquiries               is the site producing leads?                  (push marketing if not)
 *   Average per listing     what a listing can expect; the selling figure (sales and renewals)
 *   Listings with none      who to call this week                         (before they cancel)
 *   Most and fewest         who's doing well, who to help next
 *   Demand                  categories and cultures couples ask for       (who to recruit)
 * Clicking a vendor, category or culture filters the page to it.
 *
 * Nothing moves as it loads: until `ready`, every part draws at its final size with grey blocks,
 * and the lists sit in fixed boxes that scroll.
 */

type Props = {
  ready: boolean;
  /** In the period, matching the facets. */
  list: Enquiry[];
  /** In the period before, matching the facets; undefined for all time. */
  before?: Enquiry[];
  /** Every enquiry ever, newest first, for each listing's last enquiry. */
  every: Enquiry[];
  range: Range;
  prev?: Range;
  /** Today in Melbourne. */
  today: string;
  /** The listings the vendor, category and location facets cover. */
  candidates: ListedVendor[];
  facets: Facets;
  pick: (facet: Facet, value: string) => void;
  zoom: (r: Range) => void;
};

const CHART_H = 240;
const ROW = "h-[3.75rem]";
const TEN_ROWS = "h-[37.5rem]";
const DEMAND_H = "h-[22rem]";

function Heading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mt-14 mb-4 flex min-h-7 flex-wrap items-end justify-between gap-x-6 gap-y-1">
      <h2 className="font-display text-[1.75rem] leading-none tracking-[-0.02em]">{title}</h2>
      {children}
    </div>
  );
}

function Cover({ src }: { src?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- plain <img> from Supabase Storage, no Vercel image optimisation
  return src ? <img src={src} alt="" className="size-8 shrink-0 bg-ink/[0.06] object-cover" /> : <span className="size-8 shrink-0 bg-ink/[0.06]" aria-hidden />;
}

type VendorRow = { v: ListedVendor; now: number; then?: number; last?: string };

export function EnquiryInsights(p: Props) {
  const { ready, list, before, every, range, prev, candidates, today } = p;
  const [quietOpen, setQuietOpen] = useState(false);

  const { unit, cols } = useMemo(() => (ready ? buckets(list, before ?? [], range, prev) : { unit: "day" as const, cols: [] }), [ready, list, before, range, prev]);
  const xLabel = (k: string, long?: boolean) =>
    unit === "month" ? month(k, long) : unit === "week" ? (long ? `Week of ${day(k, { year: true })}` : day(k)) : long ? day(k, { weekday: true, year: true }) : day(k);

  const rows = useMemo(() => {
    const count = (l: Enquiry[]) => {
      const m = new Map<string, number>();
      for (const e of l) m.set(e.vendorSlug, (m.get(e.vendorSlug) ?? 0) + 1);
      return m;
    };
    const now = count(list);
    const then = before ? count(before) : undefined;
    // `every` is newest first, so the first one seen is the latest.
    const last = new Map<string, string>();
    for (const e of every) if (!last.has(e.vendorSlug)) last.set(e.vendorSlug, melDay(e.sentAt));
    return candidates.map((v): VendorRow => ({ v, now: now.get(v.slug) ?? 0, then: then?.get(v.slug), last: last.get(v.slug) }));
  }, [list, before, every, candidates]);

  const listed = candidates.length;
  const quiet = rows.filter((r) => r.now === 0).sort((a, b) => (a.last ?? "").localeCompare(b.last ?? "") || a.v.name.localeCompare(b.v.name));
  const avg = listed ? list.length / listed : 0;
  const avgBefore = before && listed ? before.length / listed : undefined;
  const since = (r: VendorRow) => (!r.last ? "No enquiries yet" : `Last enquiry ${plural(dayNumber(today) - dayNumber(r.last), "day")} ago`);

  const valueBone = <Bone className="h-[1.875rem] w-14" />;
  const noteBone = <Bone className="h-4 w-32" />;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat
          label="Enquiries"
          value={ready ? num(list.length) : valueBone}
          delta={ready && before && before.length >= MIN_BASE ? list.length / before.length - 1 : undefined}
          note={!ready ? noteBone : before ? `${num(before.length)} the period before` : "Since the first enquiry"}
        />
        <Stat
          label="Average per listing"
          value={ready ? avg.toFixed(1) : valueBone}
          delta={ready && before && before.length >= MIN_BASE && avgBefore ? avg / avgBefore - 1 : undefined}
          note={!ready ? noteBone : avgBefore !== undefined ? `${avgBefore.toFixed(1)} the period before` : `Across ${plural(listed, "listing")}`}
        />
        <Stat
          label="Listings with none"
          value={ready ? num(quiet.length) : valueBone}
          note={
            !ready ? (
              noteBone
            ) : quiet.length ? (
              <button type="button" onClick={() => setQuietOpen(true)} className="text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
                Of {plural(listed, "listing")}, see them all
              </button>
            ) : (
              `Every one of ${plural(listed, "listing")} had one`
            )
          }
        />
      </div>

      <Panel title={ready ? `Enquiries each ${unit}` : "Enquiries"} meta={ready ? `${day(range.start, { year: true })} to ${day(range.end, { year: true })}` : <Bone className="mt-1 h-4 w-48" />} className="mt-4">
        {ready ? (
          <Columns
            data={cols.map((c) => ({ key: c.key, value: c.value, prev: prev ? c.prev : undefined }))}
            label={`Enquiries each ${unit}`}
            xLabel={xLabel}
            height={CHART_H}
            onPick={unit === "day" ? undefined : (i) => p.zoom(cols[i].range)}
          />
        ) : (
          <div className="flex flex-col" style={{ height: CHART_H + 32 }}>
            <Bone className="mb-3 h-5 w-64" />
            <Bone className="flex-1" />
          </div>
        )}
      </Panel>

      <MostAndFewest {...p} rows={rows} quietCount={quiet.length} openQuiet={() => setQuietOpen(true)} since={since} />
      <Demand {...p} />

      <Drawer open={quietOpen} onClose={() => setQuietOpen(false)} title={`${plural(quiet.length, "listing")} with no enquiry`}>
        <p className="px-6 pt-5 pb-3 text-[0.875rem] text-ink-soft">
          {day(range.start, { year: true })} to {day(range.end, { year: true })}. Quiet longest first, with how many photos each has.
        </p>
        <ul>
          {quiet.map((r) => (
            <li key={r.v.slug} className="border-t border-ink/[0.06]">
              <Link href={`/vendors/${r.v.slug}`} target="_blank" className="group flex items-center gap-3 px-6 py-3 transition-colors hover:bg-surface">
                <Cover src={r.v.cover} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.875rem] text-ink">{r.v.name}</span>
                  <span className="block truncate text-[0.8125rem] text-ink-soft">
                    {craftOfVendor(r.v)?.name} · {r.v.photos ? plural(r.v.photos, "photo") : "No photos"}
                  </span>
                </span>
                <span className="shrink-0 text-right text-[0.8125rem] text-ink-soft">{since(r)}</span>
                <Icon name="arrow-up-right" className="size-3.5 shrink-0 text-ink-mute transition-colors group-hover:text-ink" strokeWidth={1.5} />
              </Link>
            </li>
          ))}
        </ul>
      </Drawer>
    </>
  );
}

// ── Most and fewest ─────────────────────────────────────────────────────

function MostAndFewest({
  ready,
  rows,
  quietCount,
  openQuiet,
  since,
  facets,
  pick,
}: Props & { rows: VendorRow[]; quietCount: number; openQuiet: () => void; since: (r: VendorRow) => string }) {
  const byName = (a: VendorRow, b: VendorRow) => a.v.name.localeCompare(b.v.name);
  const top = rows
    .filter((r) => r.now > 0)
    .sort((a, b) => b.now - a.now || (b.last ?? "").localeCompare(a.last ?? "") || byName(a, b))
    .slice(0, 10);
  const inTop = new Set(top.map((r) => r.v.slug));
  // Fewest first; among equals, the one quiet longest.
  const bottom = rows
    .filter((r) => !inTop.has(r.v.slug))
    .sort((a, b) => a.now - b.now || (a.last ?? "").localeCompare(b.last ?? "") || byName(a, b))
    .slice(0, 10);

  const item = (r: VendorRow, i: number, fewest: boolean) => (
    <li key={r.v.slug} className={clsx("border-t border-ink/[0.06] first:border-0", facets.vendor === r.v.slug && "bg-paper")}>
      <button type="button" onClick={() => pick("vendor", r.v.slug)} className={clsx("group flex w-full items-center gap-3 px-5 text-left transition-colors hover:bg-paper/60 sm:px-6", ROW)}>
        <span className="w-5 shrink-0 text-right text-[0.8125rem] text-ink-soft tabular-nums">{i + 1}</span>
        <Cover src={r.v.cover} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.875rem] text-ink group-hover:underline group-hover:decoration-ink/30 group-hover:underline-offset-4">{r.v.name}</span>
          <span className="block truncate text-[0.8125rem] text-ink-soft">{fewest ? since(r) : craftOfVendor(r.v)?.name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-[0.875rem] tabular-nums">
          {r.then !== undefined && (r.then >= MIN_BASE ? <Delta value={r.now / r.then - 1} /> : <span className="text-[0.8125rem] text-ink-soft">{num(r.then)} before</span>)}
          <span className="min-w-6 text-right text-ink">{num(r.now)}</span>
        </span>
      </button>
    </li>
  );
  const bones = Array.from({ length: 10 }, (_, i) => (
    <li key={i} className={clsx("flex items-center gap-3 border-t border-ink/[0.06] px-5 first:border-0 sm:px-6", ROW)}>
      <Bone className="h-4 w-5" />
      <Bone className="size-8" />
      <span className="flex-1 space-y-1.5">
        <Bone className="h-3.5 w-2/5" />
        <Bone className="h-3 w-1/4" />
      </span>
      <Bone className="h-4 w-6" />
    </li>
  ));
  const box = (items: React.ReactNode, empty: string) => (
    <ol className={clsx("overflow-y-auto", TEN_ROWS)}>{items ?? <li className="px-5 py-4 text-[0.875rem] text-ink-soft sm:px-6">{empty}</li>}</ol>
  );

  return (
    <>
      <Heading title="Listings">
        {!ready ? (
          <Bone className="h-4 w-56" />
        ) : quietCount ? (
          <button type="button" onClick={openQuiet} className="text-[0.875rem] text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
            {plural(quietCount, "listing")} without an enquiry in this period
          </button>
        ) : (
          <p className="text-[0.875rem] text-ink-soft">Every listing had an enquiry in this period</p>
        )}
      </Heading>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Most enquiries" meta="The ten couples write to most" flush>
          {box(!ready ? bones : top.length ? top.map((r, i) => item(r, i, false)) : null, "None in this period")}
        </Panel>
        <Panel title="Fewest enquiries" meta="The ten to help next, quiet longest first" flush>
          {box(!ready ? bones : bottom.length ? bottom.map((r, i) => item(r, i, true)) : null, "Every listing is in the top ten")}
        </Panel>
      </div>
    </>
  );
}

// ── Demand ──────────────────────────────────────────────────────────────

function Demand({ ready, list, candidates, facets, pick }: Props) {
  const bySlug = useMemo(() => new Map(candidates.map((v) => [v.slug, v])), [candidates]);
  const categories = crafts
    .map((c) => ({
      id: c.id,
      label: c.name,
      value: list.filter((e) => craftOfVendor(bySlug.get(e.vendorSlug))?.id === c.id).length,
      listed: candidates.some((v) => craftOfVendor(v)?.id === c.id),
    }))
    .filter((r) => r.value || r.listed)
    .sort((a, b) => b.value - a.value);

  // Couples naming each culture, each couple counted once.
  const couplesBy = new Map<string, Set<string>>();
  let named = 0;
  for (const e of list) {
    const found = culturesOf(e);
    if (found.length) named++;
    for (const c of found) {
      if (!couplesBy.has(c)) couplesBy.set(c, new Set());
      couplesBy.get(c)!.add(e.email.toLowerCase());
    }
  }
  const cultureRows = [...couplesBy].map(([name, set]) => ({ id: name, label: name, value: set.size })).sort((a, b) => b.value - a.value);

  const bones = (
    <div className="space-y-1">
      {Array.from({ length: 7 }, (_, i) => (
        <Bone key={i} className="h-10" />
      ))}
    </div>
  );
  const box = (children: React.ReactNode) => <div className={clsx("overflow-y-auto px-5 pb-5 sm:px-6", DEMAND_H)}>{children}</div>;

  return (
    <>
      <Heading title="Demand">
        <p className="text-[0.875rem] text-ink-soft">Click a row to see only those enquiries</p>
      </Heading>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="By category" meta="Enquiries to vendors in each" flush>
          {box(ready ? <BarList rows={categories} empty="None in this period" onPick={(id) => pick("craft", id)} picked={facets.craft} /> : bones)}
        </Panel>
        <Panel title="Cultures" meta={ready && named ? `Named in ${plural(named, "enquiry", "enquiries")}, each couple counted once` : "From what couples write on the form"} flush>
          {box(ready ? <BarList rows={cultureRows} empty="None named in this period" onPick={(id) => pick("culture", id)} picked={facets.culture} /> : bones)}
        </Panel>
      </div>
    </>
  );
}
