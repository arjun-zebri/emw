"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { states } from "@/data/taxonomy";
import { loadListedVendors, type ListedVendor } from "@/lib/admin/enquiries";
import { bucketDays, type Filters, MIN_BASE, type Range, rangeOf } from "@/lib/admin/enquiry-filters";
import { day, month, num, plural } from "@/lib/admin/format";
import { addMonths, useToday } from "@/lib/admin/time";
import { siteName } from "@/lib/enquiry-fields";
import { supabase } from "@/lib/supabase/browser";
import { BarList, type BarRow, Bone, Columns } from "../charts";
import { Delta, Empty, NotYet, PageHeader, Panel, Stat, Tabs } from "../ui";
import { PeriodControl } from "./Enquiries";

/*
 * Visitor numbers for the team, from the site's own counter (app/api/v, no third party, no
 * cookies). Each part answers something they act on:
 *   Visits                 is the site reaching couples?                  (push marketing if not)
 *   Where they come from   which channels work                            (where to post next)
 *   Listings               which vendors couples look at                  (the selling figure)
 *   Searches               what couples want, and what found no one       (who to sign up)
 *   Where they are         states and cities                              (events and outreach)
 * The database adds it all up (traffic_summary); only totals come back.
 */

type Totals = { views: number; visits: number; visitors: number };
type Day = { day: string; views: number; visits: number; visitors: number };
type Summary = {
  totals: Totals;
  before: Totals | null;
  days: Day[];
  days_before: Day[];
  pages: { path: string; views: number; visitors: number }[];
  vendors: { slug: string; name: string; views: number; visitors: number; before: number }[];
  sources: { referrer: string | null; campaign: string | null; visits: number }[];
  places: { country: string | null; region: string | null; city: string | null; visits: number }[];
  devices: Partial<Record<"phone" | "tablet" | "desktop", number>>;
  searches: { query: string; times: number; matches: number }[];
  unmatched: { query: string; times: number }[];
};

type Load = { status: "loading" } | { status: "error"; error: string } | { status: "ready"; key: string; data: Summary };

const CHART_H = 240;
const ROW = "h-[3.75rem]";
const TEN_ROWS = "h-[37.5rem]";
const LIST_H = "h-[22rem]";


const PAGE_NAMES: Record<string, string> = {
  "/": "Home",
  "/vendors": "Directory",
  "/list-your-business": "List your business",
  "/privacy-policy": "Privacy policy",
  "/terms-and-conditions": "Terms and conditions",
};

const countries = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["en-AU"], { type: "region" }) : undefined;
const countryName = (code: string) => {
  try {
    return countries?.of(code) ?? code;
  } catch {
    return code;
  }
};

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

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export function Traffic() {
  const today = useToday();
  const [filters, setFilters] = useState<Filters>({ period: "30d", facets: {}, q: "" });
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [vendors, setVendors] = useState<ListedVendor[]>([]);
  const update = (change: Partial<Filters>) => setFilters((f) => ({ ...f, ...change }));

  useEffect(() => {
    loadListedVendors().then(setVendors, () => {});
  }, []);

  // "All time" asks for the longest period the database keeps, then starts at the first day counted.
  const asked = useMemo(() => {
    if (!today) return undefined;
    if (filters.period === "all") return { range: { start: addDays(addMonths(today, -25), 1), end: today } as Range, prev: undefined };
    return rangeOf(filters, today);
  }, [filters, today]);
  const key = asked ? `${asked.range.start}:${asked.range.end}:${asked.prev?.start ?? ""}` : "";

  useEffect(() => {
    if (!asked) return;
    let live = true;
    supabase()
      .rpc("traffic_summary", { first_day: asked.range.start, last_day: asked.range.end, ...(asked.prev && { prev_first: asked.prev.start, prev_last: asked.prev.end }) })
      .then(({ data, error }) => {
        if (!live) return;
        if (error) setLoad({ status: "error", error: error.message });
        else setLoad({ status: "ready", key, data: data as unknown as Summary });
      });
    return () => {
      live = false;
    };
    // `key` stands for `asked`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const data = load.status === "ready" && load.key === key ? load.data : undefined;
  const ready = !!data && !!asked;
  const range: Range = useMemo(() => {
    if (!asked) return { start: "", end: "" };
    if (filters.period !== "all" || !data?.days.length) return asked.range;
    return { start: data.days[0].day, end: asked.range.end };
  }, [asked, data, filters.period]);
  const prev = asked?.prev;

  const header = (
    <PageHeader
      title="Traffic"
      description="Who visits, where they come from and what they look for. Counted by the site itself, without cookies."
      actions={<PeriodControl filters={filters} range={range} update={update} />}
    />
  );

  if (load.status === "error")
    return (
      <>
        {header}
        <Panel>
          <Empty title="Couldn't load the figures">{load.error}</Empty>
        </Panel>
      </>
    );

  if (ready && filters.period === "all" && data.totals.views === 0)
    return (
      <>
        {header}
        <NotYet
          title="No visits counted yet"
          items={[
            { icon: "overview", title: "Visits and visitors", detail: "Day by day, week by week, compared with the period before." },
            { icon: "globe", title: "Where couples come from", detail: "Google, Instagram, Pinterest and the sites that link to you." },
            { icon: "search", title: "What they search for", detail: "Including searches that found no one, so you know who to sign up." },
            { icon: "pin", title: "Where they are", detail: "States and cities, for planning events and outreach." },
          ]}
        >
          The site counts each page a couple sees. Figures appear here as soon as the first visits come in.
        </NotYet>
      </>
    );

  return (
    <>
      {header}
      <Figures ready={ready} data={data} range={range} prev={prev} zoom={(r) => update({ period: "custom", from: r.start, to: r.end })} />
      <Sources ready={ready} data={data} />
      <Listings ready={ready} data={data} vendors={vendors} />
      <Searches ready={ready} data={data} />
      <Places ready={ready} data={data} />
      <p className="mt-10 max-w-[70ch] text-[0.8125rem] leading-relaxed text-ink-soft">
        A visit is someone arriving after 30 minutes away. A visitor is counted once a day, so the same person on two days counts twice. Crawlers, automated browsers and signed-in team
        members and vendors are left out. No cookies are used and no one can be identified from these figures.
      </p>
    </>
  );
}

// ── Figures ─────────────────────────────────────────────────────────────

function Figures({ ready, data, range, prev, zoom }: { ready: boolean; data?: Summary; range: Range; prev?: Range; zoom: (r: Range) => void }) {
  const { unit, cols } = useMemo(
    () =>
      ready && data
        ? bucketDays(
            data.days.map((d) => ({ day: d.day, value: d.visits })),
            data.days_before.map((d) => ({ day: d.day, value: d.visits })),
            range,
            prev,
          )
        : { unit: "day" as const, cols: [] },
    [ready, data, range, prev],
  );
  const xLabel = (k: string, long?: boolean) =>
    unit === "month" ? month(k, long) : unit === "week" ? (long ? `Week of ${day(k, { year: true })}` : day(k)) : long ? day(k, { weekday: true, year: true }) : day(k);

  const t = data?.totals;
  const b = data?.before ?? undefined;
  const change = (now: number, then?: number) => (then !== undefined && then >= MIN_BASE ? now / then - 1 : undefined);
  const before = (then?: number) => (then !== undefined ? `${num(then)} the period before` : undefined);
  const visits = data ? Object.values(data.devices).reduce((a, n) => a + (n ?? 0), 0) : 0;
  const phones = data && visits ? (data.devices.phone ?? 0) / visits : 0;

  const valueBone = <Bone className="h-[1.875rem] w-14" />;
  const noteBone = <Bone className="h-4 w-32" />;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Visits" value={ready && t ? num(t.visits) : valueBone} delta={t && change(t.visits, b?.visits)} note={!ready ? noteBone : (before(b?.visits) ?? "Since counting began")} />
        <Stat label="Visitors" value={ready && t ? num(t.visitors) : valueBone} delta={t && change(t.visitors, b?.visitors)} note={!ready ? noteBone : (before(b?.visitors) ?? "Each counted once a day")} />
        <Stat label="Pages viewed" value={ready && t ? num(t.views) : valueBone} delta={t && change(t.views, b?.views)} note={!ready ? noteBone : t?.visits ? `${(t.views / t.visits).toFixed(1)} a visit` : "None yet"} />
        <Stat label="On a phone" value={ready ? (visits ? `${Math.round(phones * 100)}%` : "–") : valueBone} note={!ready ? noteBone : visits ? `Of ${plural(visits, "visit")}` : "No visits in this period"} />
      </div>

      <Panel title={ready ? `Visits each ${unit}` : "Visits"} meta={ready ? `${day(range.start, { year: true })} to ${day(range.end, { year: true })}` : <Bone className="mt-1 h-4 w-48" />} className="mt-4">
        {ready ? (
          <Columns
            data={cols.map((c) => ({ key: c.key, value: c.value, prev: prev ? c.prev : undefined }))}
            label={`Visits each ${unit}`}
            unit={["visit", "visits"]}
            xLabel={xLabel}
            height={CHART_H}
            onPick={unit === "day" ? undefined : (i) => zoom(cols[i].range)}
          />
        ) : (
          <div className="flex flex-col" style={{ height: CHART_H + 32 }}>
            <Bone className="mb-3 h-5 w-64" />
            <Bone className="flex-1" />
          </div>
        )}
      </Panel>
    </>
  );
}

// ── Sources ─────────────────────────────────────────────────────────────

const listBones = (
  <div className="space-y-1">
    {Array.from({ length: 7 }, (_, i) => (
      <Bone key={i} className="h-10" />
    ))}
  </div>
);
const box = (children: React.ReactNode) => <div className={clsx("overflow-y-auto px-5 pb-5 sm:px-6", LIST_H)}>{children}</div>;

function Sources({ ready, data }: { ready: boolean; data?: Summary }) {
  const { channels, campaigns } = useMemo(() => {
    const byName = new Map<string, BarRow>();
    const tags = new Map<string, number>();
    for (const s of data?.sources ?? []) {
      const name = s.referrer ? siteName(s.referrer) : "Typed in or bookmarked";
      const row = byName.get(name) ?? { id: name, label: name, value: 0 };
      row.value += s.visits;
      byName.set(name, row);
      if (s.campaign) tags.set(s.campaign, (tags.get(s.campaign) ?? 0) + s.visits);
    }
    return {
      channels: [...byName.values()].sort((a, b) => b.value - a.value),
      campaigns: [...tags].map(([id, value]): BarRow => ({ id, label: id, value })).sort((a, b) => b.value - a.value),
    };
  }, [data]);

  return (
    <>
      <Heading title="Where couples come from" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Sites" meta="Visits from each, by the site that sent them" flush>
          {box(ready ? <BarList rows={channels} empty="No visits in this period" /> : listBones)}
        </Panel>
        <Panel title="Campaigns" meta="Links tagged with utm_source, like a newsletter or a post" flush>
          {box(ready ? <BarList rows={campaigns} empty="No tagged links in this period" /> : listBones)}
        </Panel>
      </div>
    </>
  );
}

// ── Listings ────────────────────────────────────────────────────────────

function Listings({ ready, data, vendors }: { ready: boolean; data?: Summary; vendors: ListedVendor[] }) {
  const covers = useMemo(() => new Map(vendors.map((v) => [v.slug, v.cover])), [vendors]);
  const top = (data?.vendors ?? []).slice(0, 10);
  const pages = (data?.pages ?? []).map((p): BarRow => ({ id: p.path, label: PAGE_NAMES[p.path] ?? p.path, value: p.views }));
  const viewed = data?.vendors.length ?? 0;

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

  return (
    <>
      <Heading title="What they look at">
        {ready ? <p className="text-[0.875rem] text-ink-soft">{plural(viewed, "listing")} viewed in this period</p> : <Bone className="h-4 w-48" />}
      </Heading>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Most viewed listings" meta="Views of each vendor's page" flush>
          <ol className={clsx("overflow-y-auto", TEN_ROWS)}>
            {!ready
              ? bones
              : top.length
                ? top.map((v, i) => (
                    <li key={v.slug} className="border-t border-ink/[0.06] first:border-0">
                      <Link href={`/vendors/${v.slug}`} target="_blank" className={clsx("group flex items-center gap-3 px-5 transition-colors hover:bg-paper/60 sm:px-6", ROW)}>
                        <span className="w-5 shrink-0 text-right text-[0.8125rem] text-ink-soft tabular-nums">{i + 1}</span>
                        <Cover src={covers.get(v.slug)} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.875rem] text-ink group-hover:underline group-hover:decoration-ink/30 group-hover:underline-offset-4">{v.name}</span>
                          <span className="block truncate text-[0.8125rem] text-ink-soft">{plural(v.visitors, "visitor")}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-[0.875rem] tabular-nums">
                          {data?.before && (v.before >= MIN_BASE ? <Delta value={v.views / v.before - 1} /> : <span className="text-[0.8125rem] text-ink-soft">{num(v.before)} before</span>)}
                          <span className="min-w-6 text-right text-ink">{num(v.views)}</span>
                        </span>
                        <Icon name="arrow-up-right" className="size-3.5 shrink-0 text-ink-mute transition-colors group-hover:text-ink" strokeWidth={1.5} />
                      </Link>
                    </li>
                  ))
                : <li className="px-5 py-4 text-[0.875rem] text-ink-soft sm:px-6">No listings viewed in this period</li>}
          </ol>
        </Panel>
        <Panel title="Other pages" meta="Views of each" flush>
          <div className={clsx("overflow-y-auto px-5 pb-5 sm:px-6", TEN_ROWS)}>{ready ? <BarList rows={pages} empty="No pages viewed in this period" /> : listBones}</div>
        </Panel>
      </div>
    </>
  );
}

// ── Searches ────────────────────────────────────────────────────────────

function Searches({ ready, data }: { ready: boolean; data?: Summary }) {
  const all = (data?.searches ?? []).map((s): BarRow => ({ id: s.query, label: s.query, value: s.times, note: s.matches ? plural(s.matches, "match", "matches") : "No match" }));
  const none = (data?.unmatched ?? []).map((s): BarRow => ({ id: s.query, label: s.query, value: s.times }));
  return (
    <>
      <Heading title="What they search for">
        <p className="text-[0.875rem] text-ink-soft">The directory search, each visitor counted once a day</p>
      </Heading>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Searches" meta="How often, and how many listings match the words" flush>
          {box(ready ? <BarList rows={all} empty="No searches in this period" /> : listBones)}
        </Panel>
        <Panel title="Found no one" meta="Vendors couples looked for that aren't listed yet" flush>
          {box(ready ? <BarList rows={none} empty="Every search found someone" /> : listBones)}
        </Panel>
      </div>
    </>
  );
}

// ── Places ──────────────────────────────────────────────────────────────

type PlaceView = "states" | "cities" | "countries";

function Places({ ready, data }: { ready: boolean; data?: Summary }) {
  const [view, setView] = useState<PlaceView>("states");
  const rows = useMemo(() => {
    const add = (m: Map<string, BarRow>, id: string, label: string, n: number, detail?: string) => {
      const row = m.get(id) ?? { id, label, value: 0, detail };
      row.value += n;
      m.set(id, row);
    };
    const m = new Map<string, BarRow>();
    for (const p of data?.places ?? []) {
      if (view === "countries") add(m, p.country ?? "?", p.country ? countryName(p.country) : "Unknown", p.visits);
      else if (p.country === "AU") {
        const state = p.region && p.region in states ? states[p.region as keyof typeof states] : undefined;
        if (view === "states") add(m, p.region ?? "?", state ?? "Unknown", p.visits);
        else if (p.city) add(m, `${p.city}|${p.region}`, p.city, p.visits, p.region ?? undefined);
      }
    }
    return [...m.values()].sort((a, b) => b.value - a.value);
  }, [data, view]);
  const abroad = (data?.places ?? []).filter((p) => p.country && p.country !== "AU").reduce((a, p) => a + p.visits, 0);
  const known = (data?.places ?? []).some((p) => p.country);

  return (
    <>
      <Heading title="Where they are">
        {!ready ? <Bone className="h-4 w-40" /> : known && <p className="text-[0.875rem] text-ink-soft">{abroad ? `${plural(abroad, "visit")} from overseas` : "All from Australia"}</p>}
      </Heading>
      <Panel flush>
        <div className="px-5 sm:px-6">
          <Tabs<PlaceView>
            tabs={[
              { id: "states", label: "States" },
              { id: "cities", label: "Cities" },
              { id: "countries", label: "Countries" },
            ]}
            value={view}
            onChange={setView}
          />
        </div>
        <div className={clsx("overflow-y-auto px-5 py-5 sm:px-6", LIST_H)}>
          {ready ? <BarList rows={rows} empty={view === "countries" ? "No visits in this period" : "No visits from Australia in this period"} /> : listBones}
        </div>
      </Panel>
    </>
  );
}
