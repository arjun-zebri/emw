"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { areas, craftById, languages, serviceLabels, states } from "@/data/taxonomy";
import type { AreaCode, CraftId, Language, Service } from "@/data/types";
import { loadListedVendors, type ListedVendor } from "@/lib/admin/enquiries";
import { bucketDays, craftOfVendor, type Filters, MIN_BASE, type Range, rangeOf } from "@/lib/admin/enquiry-filters";
import { day, month, num, plural } from "@/lib/admin/format";
import { addMonths, useToday } from "@/lib/admin/time";
import { siteName } from "@/lib/enquiry-fields";
import { supabase } from "@/lib/supabase/browser";
import { BarList, type BarRow, Bone, Trend } from "../charts";
import { Drawer } from "../Drawer";
import { Dropdown } from "../shared/Dropdown";
import { Delta, Empty, NotYet, PageHeader, Panel, Tabs } from "../ui";
import { PeriodControl } from "./Enquiries";
import { type MapCity, share, TrafficMap } from "./TrafficMap";

/*
 * Visitor numbers for the team, from the site's own counter (app/api/v; no third party, no
 * cookies). Each part answers something they act on:
 *   Visits, listing views, pages viewed              is the site reaching couples, and sending them to vendors?
 *   Where couples come from                          which channels to put effort into
 *   Where they are                                   events and outreach
 *   Listings                                         who gets seen (renewals), who needs help
 *   Where they land                                  what Google and social links send people to
 *   What they look for                               demand: filters, searches, searches that found no one
 * Clicking a source, a place, a listing or a landing page narrows the whole page to it, as on
 * Enquiries. The database adds it all up (traffic_summary); only totals come back.
 */

// ── Data ────────────────────────────────────────────────────────────────

type Counts = { visits: number; views: number; listing_views: number };
type DayRow = Counts & { day: string };
type Summary = {
  totals: Counts;
  before: Counts | null;
  days: DayRow[];
  days_before: DayRow[];
  channels: { channel: Channel; visits: number }[];
  sites: { host: string; visits: number }[];
  campaigns: { campaign: string; visits: number }[];
  landings: { path: string; visits: number }[];
  vendors: { slug: string; name: string; views: number; visitors: number; channel: Channel | null; before: number }[];
  places: { country: string | null; region: string | null; city: string | null; visits: number; lat: number | null; lon: number | null }[];
  searches: { query: string; times: number; matches: number }[];
  filters: { kind: "category" | "language" | "location" | "service"; value: string; times: number }[];
};

type Channel = "search" | "social" | "email" | "referral" | "direct";
const CHANNELS: Record<Channel, string> = {
  search: "Search engines",
  social: "Social media",
  email: "Email",
  referral: "Other websites",
  direct: "Typed in or bookmarked",
};

type Facet = "channel" | "site" | "campaign" | "place" | "vendor";
type Facets = Partial<Record<Facet, string>>;
const FACET_LABEL: Record<Facet, string> = { channel: "Source", site: "Site", campaign: "Campaign", place: "Place", vendor: "Listing" };

type Load = { status: "loading" } | { status: "error"; error: string } | { status: "ready"; key: string; data: Summary };

/** Rows a list shows before "See all". */
const SHOWN = 8;
const CHART_H = 240;

const PAGE_NAMES: Record<string, string> = {
  "/": "Home",
  "/vendors": "Directory",
  "/blog": "Blog",
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
const stateName = (code: string) => states[code as keyof typeof states] ?? code;
/** A place facet: "AU-VIC" for a state, "NZ" for a country, "city:AU|VIC|Melbourne" for a city. */
const cityId = (country: string, region: string, city: string) => `city:${country}|${region}|${city}`;
const placeLabel = (p: string) => (p.startsWith("city:") ? p.split("|")[2] : p.startsWith("AU-") ? stateName(p.slice(3)) : countryName(p));
/** The place facet as the database's filters. */
function placeArgs(p: string) {
  if (p.startsWith("city:")) {
    const [country, region, city] = p.slice(5).split("|");
    return { p_country: country, ...(region && { p_region: region }), p_city: city };
  }
  return p.startsWith("AU-") ? { p_country: "AU", p_region: p.slice(3) } : { p_country: p };
}

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

// ── Page ────────────────────────────────────────────────────────────────

export function Traffic() {
  const today = useToday();
  const [filters, setFilters] = useState<Filters>({ period: "30d", facets: {}, q: "" });
  const [facets, setFacets] = useState<Facets>({});
  const [siteHosts, setSiteHosts] = useState<string[]>([]);
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [last, setLast] = useState<Summary | null>(null);
  const [vendors, setVendors] = useState<ListedVendor[] | null>(null);
  const [about, setAbout] = useState(false);
  const live = useLive();
  const update = (change: Partial<Filters>) => setFilters((f) => ({ ...f, ...change }));

  useEffect(() => {
    loadListedVendors().then(setVendors, () => setVendors([]));
  }, []);

  // "All time" asks for everything the database keeps, then starts the chart at the first day counted.
  const asked = useMemo(() => {
    if (!today) return undefined;
    if (filters.period === "all") return { range: { start: addDays(addMonths(today, -25), 1), end: today } as Range, prev: undefined };
    return rangeOf(filters, today);
  }, [filters, today]);
  const key = asked ? JSON.stringify([asked.range, asked.prev, facets, siteHosts]) : "";

  useEffect(() => {
    if (!asked) return;
    let current = true;
    const place = facets.place;
    supabase()
      .rpc("traffic_summary", {
        first_day: asked.range.start,
        last_day: asked.range.end,
        ...(asked.prev && { prev_first: asked.prev.start, prev_last: asked.prev.end }),
        ...(facets.channel && { p_channel: facets.channel }),
        ...(facets.site && { p_sites: siteHosts }),
        ...(facets.campaign && { p_campaign: facets.campaign }),
        ...(place && placeArgs(place)),
        ...(facets.vendor && { p_vendor: facets.vendor }),
      })
      .then(({ data, error }) => {
        if (!current) return;
        if (error) return setLoad({ status: "error", error: error.message });
        setLoad({ status: "ready", key, data: data as unknown as Summary });
        setLast(data as unknown as Summary);
      });
    return () => {
      current = false;
    };
    // `key` stands for everything the request is made from.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const fresh = load.status === "ready" && load.key === key;
  // While a new slice loads, the last one stays, dimmed, so nothing jumps.
  const data = fresh ? load.data : (last ?? undefined);
  const ready = !!data && !!asked && !!vendors;
  const range: Range = useMemo(() => {
    if (!asked) return { start: "", end: "" };
    if (filters.period !== "all" || !data?.days.length) return asked.range;
    return { start: data.days[0].day, end: asked.range.end };
  }, [asked, data, filters.period]);
  const prev = asked?.prev;

  const pick = (facet: Facet, value: string, hosts?: string[]) => {
    setFacets((f) => ({ ...f, [facet]: f[facet] === value ? undefined : value }));
    if (facet === "site") setSiteHosts(hosts ?? []);
  };
  const vendorName = useMemo(() => new Map((vendors ?? []).map((v) => [v.slug, v.name])), [vendors]);
  const chips = (Object.entries(facets) as [Facet, string | undefined][])
    .filter((c): c is [Facet, string] => !!c[1])
    .map(([facet, value]) => ({
      facet,
      value,
      label: facet === "channel" ? CHANNELS[value as Channel] : facet === "place" ? placeLabel(value) : facet === "vendor" ? (vendorName.get(value) ?? value) : value,
    }));

  // Where visitors are: every state, then the countries visits came from (and a city, if one is picked on the map).
  const locationOptions = useMemo(() => {
    const abroad = [...new Set((data?.places ?? []).map((p) => p.country).filter((c): c is string => !!c && c !== "AU"))]
      .map((c) => ({ value: c, label: countryName(c) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const city = facets.place?.startsWith("city:") ? [{ value: facets.place, label: placeLabel(facets.place) }] : [];
    return [
      { value: "all", label: "All locations" },
      ...Object.keys(states).map((code) => ({ value: `AU-${code}`, label: stateName(code) })),
      ...abroad,
      ...city,
    ];
  }, [data, facets.place]);

  const header = (
    <PageHeader
      title="Traffic"
      description={
        <>
          Who visits, where they come from and what they look for.{" "}
          <button type="button" onClick={() => setAbout(true)} className="text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
            How visits are counted
          </button>
        </>
      }
      actions={
        <div className="flex flex-wrap items-center gap-3">
          {live !== null && (
            <span className="flex items-center gap-2 text-[0.875rem] text-ink-soft">
              <span className={clsx("size-2 rounded-full", live ? "bg-good" : "bg-ink/20")} aria-hidden />
              {live ? `${plural(live, "person", "people")} on the site now` : "No one on the site right now"}
            </span>
          )}
          <div className="w-52 border border-ink/15 bg-surface px-3 py-2 transition-colors hover:border-ink/40">
            <Dropdown
              single
              options={locationOptions}
              value={facets.place ?? "all"}
              onChange={(place: string) => setFacets((f) => ({ ...f, place: place === "all" ? undefined : place }))}
              placeholder="All locations"
            />
          </div>
          <PeriodControl filters={filters} range={range} update={update} />
        </div>
      }
    />
  );

  const aboutDrawer = (
    <Drawer open={about} onClose={() => setAbout(false)} title="How visits are counted">
      <div className="space-y-4 px-6 py-6 text-[0.9375rem] leading-relaxed text-ink-soft">
        <p>The site counts each page a couple sees, itself. Nothing is sent to Google or anyone else, no cookies are used, and no one can be identified from these figures.</p>
        <p>
          <span className="text-ink">A visit</span> starts when someone arrives, or comes back after 30 minutes away. Where a visit came from (Google, Instagram, a link with a
          campaign tag) stays with every page they see on it, so you can follow them to the vendors they open.
        </p>
        <p>
          <span className="text-ink">Listing views</span> are views of vendor pages: the same number each vendor sees on their own dashboard.
        </p>
        <p>Search engines and other automated visitors are left out, and so are the team and vendors while they&rsquo;re signed in, so your own checking doesn&rsquo;t count.</p>
        <p>Locations come from the visitor&rsquo;s internet connection and are close, not exact. Figures are kept for 25 months.</p>
      </div>
    </Drawer>
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

  if (ready && fresh && filters.period === "all" && !chips.length && data.totals.views === 0)
    return (
      <>
        {header}
        <NotYet
          title="No visits counted yet"
          items={[
            { icon: "trend", title: "Is it working", detail: "Visits, listing views and pages viewed, against the period before." },
            { icon: "globe", title: "Where couples come from", detail: "Search engines, social media and the sites that link to you." },
            { icon: "store", title: "Who gets seen", detail: "Views and visitors for every listing, and who no one looked at." },
            { icon: "search", title: "What couples look for", detail: "The languages and categories they choose, what they search for, and what found no one." },
          ]}
        >
          The site counts each page a couple sees. Figures appear here as soon as the first visits come in.
        </NotYet>
        {aboutDrawer}
      </>
    );

  return (
    <>
      {header}

      {chips.length > 0 && (
        <div className="-mt-2 mb-6 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              key={c.facet}
              type="button"
              onClick={() => pick(c.facet, c.value)}
              className="group inline-flex items-center gap-2 border border-ink bg-ink py-1.5 pr-2.5 pl-3 text-[0.8125rem] text-paper"
              aria-label={`Remove ${FACET_LABEL[c.facet]}: ${c.label}`}
            >
              <span className="text-paper/60">{FACET_LABEL[c.facet]}</span>
              {c.label}
              <Icon name="close" className="size-3.5 opacity-60 group-hover:opacity-100" strokeWidth={1.6} />
            </button>
          ))}
          <button type="button" onClick={() => setFacets({})} className="px-2 text-[0.8125rem] text-ink-soft underline decoration-ink/20 underline-offset-4 hover:text-ink">
            Clear all
          </button>
        </div>
      )}

      <div className={clsx("transition-opacity duration-300", ready && !fresh && "pointer-events-none opacity-50")}>
        <Headline ready={ready} data={data} range={range} prev={prev} zoom={(r) => update({ period: "custom", from: r.start, to: r.end })} />
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Sources ready={ready} data={data} facets={facets} pick={pick} />
          <Places ready={ready} data={data} facets={facets} pick={pick} />
        </div>
        <Listings ready={ready} data={data} vendors={vendors ?? []} facets={facets} pick={pick} narrowed={chips.length > 0} />
        <Demand ready={ready} data={data} names={vendorName} facets={facets} pick={pick} />
      </div>
      {aboutDrawer}
    </>
  );
}

/** People with the site open in the last five minutes, checked every 30 seconds while this tab is in view. */
function useLive() {
  const [live, setLive] = useState<number | null>(null);
  useEffect(() => {
    let stop = false;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      supabase()
        .rpc("traffic_live")
        .then(({ data, error }) => !stop && !error && setLive(data ?? 0));
    };
    check();
    const t = setInterval(check, 30_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      stop = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  return live;
}

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
  return src ? <img src={src} alt="" className="size-10 shrink-0 bg-ink/[0.06] object-cover" /> : <span className="size-10 shrink-0 bg-ink/[0.06]" aria-hidden />;
}

const listBones = (rows = 6) => (
  <div className="space-y-1">
    {Array.from({ length: rows }, (_, i) => (
      <Bone key={i} className="h-10" />
    ))}
  </div>
);

/** Each row's share of the whole, beside its count. */
const withShare = (rows: BarRow[], total: number) => rows.map((r) => ({ ...r, note: share(r.value, total) }));

/** The first rows of a list, with the rest a click away in a drawer. Only as tall as what's in it. */
function ShortList({
  rows,
  empty,
  title,
  onPick,
  picked,
  shown = SHOWN,
}: {
  rows: BarRow[];
  empty: string;
  title: string;
  onPick?: (id: string) => void;
  picked?: string;
  shown?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <BarList rows={rows.slice(0, shown)} empty={empty} onPick={onPick} picked={picked} />
      {rows.length > shown && (
        <button type="button" onClick={() => setOpen(true)} className="mt-3 px-3 text-[0.8125rem] text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
          See all {num(rows.length)}
        </button>
      )}
      <Drawer open={open} onClose={() => setOpen(false)} title={title}>
        <div className="px-6 py-5">
          <BarList
            rows={rows}
            onPick={
              onPick &&
              ((id) => {
                onPick(id);
                setOpen(false);
              })
            }
            picked={picked}
          />
        </div>
      </Drawer>
    </>
  );
}

type Part = { ready: boolean; data?: Summary; facets: Facets; pick: (facet: Facet, value: string, hosts?: string[]) => void };

// ── Headline: three figures over one chart ─────────────────────────────

type Metric = keyof Counts;
const METRICS: { id: Metric; label: string; unit: [string, string] }[] = [
  { id: "visits", label: "Visits", unit: ["visit", "visits"] },
  { id: "listing_views", label: "Listing views", unit: ["view", "views"] },
  { id: "views", label: "Pages viewed", unit: ["page", "pages"] },
];

function Headline({ ready, data, range, prev, zoom }: { ready: boolean; data?: Summary; range: Range; prev?: Range; zoom: (r: Range) => void }) {
  const [metric, setMetric] = useState<Metric>("visits");

  const { unit, cols } = useMemo(
    () =>
      ready && data
        ? bucketDays(
            data.days.map((d) => ({ day: d.day, value: d[metric] })),
            data.days_before.map((d) => ({ day: d.day, value: d[metric] })),
            range,
            prev,
          )
        : { unit: "day" as const, cols: [] as { key: string; value: number; prev: number; range: Range }[] },
    [ready, data, range, prev, metric],
  );
  const xLabel = (k: string, long?: boolean) =>
    unit === "month" ? month(k, long) : unit === "week" ? (long ? `Week of ${day(k, { year: true })}` : day(k)) : long ? day(k, { weekday: true, year: true }) : day(k);

  const t = data?.totals;
  const b = data?.before ?? undefined;
  const notes: Record<Metric, string> = {
    visits: "Arrivals, or returns after 30 minutes away",
    listing_views: "Views of vendor pages",
    views: t?.visits ? `${(t.views / t.visits).toFixed(1)} a visit` : "Every page seen",
  };
  const m = METRICS.find((x) => x.id === metric)!;

  return (
    <section className="min-w-0 border border-ink/[0.09] bg-surface">
      <div role="tablist" className="grid grid-cols-1 border-b hairline sm:grid-cols-3">
        {METRICS.map((f, i) => {
          const on = metric === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={on}
              disabled={!ready}
              onClick={() => setMetric(f.id)}
              className={clsx(
                "relative min-w-0 px-5 py-5 text-left transition-colors sm:px-6",
                i > 0 && "border-t hairline sm:border-t-0 sm:border-l",
                on ? "bg-surface" : "bg-paper/50 hover:bg-paper/20",
              )}
            >
              {ready && t ? (
                <>
                  <span className={clsx("block text-[0.8125rem]", on ? "text-ink" : "text-ink-soft")}>{f.label}</span>
                  <span className="mt-2 block text-[1.875rem] leading-none font-medium tracking-[-0.025em] text-ink tabular-nums">{num(t[f.id])}</span>
                  <span className="mt-2.5 flex min-h-4 flex-wrap items-center gap-x-2 gap-y-1">
                    {change(t[f.id], b?.[f.id])}
                    <span className="t-small text-[0.75rem]">{before(b?.[f.id]) ?? notes[f.id]}</span>
                  </span>
                </>
              ) : (
                <>
                  <Bone className="h-4 w-20" />
                  <Bone className="mt-2 h-[1.875rem] w-16" />
                  <Bone className="mt-2.5 h-4 w-32" />
                </>
              )}
              <span className={clsx("absolute inset-x-0 top-0 h-0.5 bg-ink transition-transform duration-500 ease-out-expo", on && ready ? "scale-x-100" : "scale-x-0")} aria-hidden />
            </button>
          );
        })}
      </div>
      <div className="px-5 pt-5 pb-5 sm:px-6 sm:pb-6">
        {ready ? (
          <>
            <p className="mb-3 text-[0.8125rem] text-ink-soft">
              {m.label} each {unit}, {day(range.start, { year: true })} to {day(range.end, { year: true })}
            </p>
            <Trend
              data={cols.map((c) => ({ key: c.key, value: c.value, prev: prev ? c.prev : undefined }))}
              label={`${m.label} each ${unit}`}
              unit={m.unit}
              xLabel={xLabel}
              height={CHART_H}
              onPick={unit === "day" ? undefined : (i) => zoom(cols[i].range)}
            />
          </>
        ) : (
          <div className="flex flex-col" style={{ height: CHART_H + 52 }}>
            <Bone className="mb-3 h-4 w-72" />
            <Bone className="mb-3 h-5 w-64" />
            <Bone className="flex-1" />
          </div>
        )}
      </div>
    </section>
  );
}

function change(now: number, then?: number) {
  return then !== undefined && then >= MIN_BASE ? <Delta value={now / then - 1} /> : undefined;
}
const before = (then?: number) => (then !== undefined ? `${num(then)} the period before` : undefined);

// ── Sources ─────────────────────────────────────────────────────────────

function Sources({ ready, data, facets, pick }: Part) {
  const total = data?.totals.visits ?? 0;
  const { channels, sites, hostsOf, campaigns } = useMemo(() => {
    const byName = new Map<string, { row: BarRow; hosts: string[] }>();
    for (const s of data?.sites ?? []) {
      const name = siteName(s.host);
      const e = byName.get(name) ?? { row: { id: name, label: name, value: 0 }, hosts: [] };
      e.row.value += s.visits;
      e.hosts.push(s.host);
      byName.set(name, e);
    }
    return {
      channels: withShare((data?.channels ?? []).map((c): BarRow => ({ id: c.channel, label: CHANNELS[c.channel] ?? c.channel, value: c.visits })), total),
      sites: withShare([...byName.values()].map((e) => e.row).sort((a, b) => b.value - a.value), total),
      hostsOf: new Map([...byName].map(([name, e]) => [name, e.hosts])),
      campaigns: withShare((data?.campaigns ?? []).map((c): BarRow => ({ id: c.campaign, label: c.campaign, value: c.visits })), total),
    };
  }, [data, total]);

  const part = (title: string, rows: BarRow[], empty: string, facet: Facet, shown: number) => (
    <div className="border-t hairline pt-4 first:border-0 first:pt-0">
      <p className="mb-2 px-3 text-[0.8125rem] text-ink-soft">{title}</p>
      {ready ? (
        <ShortList rows={rows} shown={shown} empty={empty} title={`Where couples come from: ${title.toLowerCase()}`} onPick={(id) => pick(facet, id, facet === "site" ? hostsOf.get(id) : undefined)} picked={facets[facet]} />
      ) : (
        listBones(Math.min(shown, 3))
      )}
    </div>
  );

  return (
    <Panel title="Where couples come from" meta="Share of visits from each. Click one to see only those." flush>
      <div className="space-y-5 px-2 pb-5 sm:px-3">
        {part("Channels", channels, "No visits in this period", "channel", 5)}
        {part("Sites", sites, "No visits from other sites in this period", "site", 5)}
        {part("Campaigns", campaigns, "No links tagged with utm_source in this period", "campaign", 3)}
      </div>
    </Panel>
  );
}

// ── Places ──────────────────────────────────────────────────────────────

type PlaceView = "states" | "cities" | "countries";

function Places({ ready, data, facets, pick }: Part) {
  const [all, setAll] = useState(false);
  const [view, setView] = useState<PlaceView>("states");
  const places = useMemo(() => data?.places ?? [], [data]);
  const total = places.reduce((a, p) => a + p.visits, 0);

  const byState = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of places) if (p.country === "AU" && p.region) m.set(p.region, (m.get(p.region) ?? 0) + p.visits);
    return m;
  }, [places]);
  const cities = useMemo(
    () =>
      places
        .filter((p) => p.country === "AU" && p.city && p.lat !== null && p.lon !== null)
        .map((p): MapCity => ({ id: cityId("AU", p.region ?? "", p.city!), name: p.city!, region: p.region ?? "", visits: p.visits, lat: p.lat!, lon: p.lon! })),
    [places],
  );
  const abroad = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of places) if (p.country && p.country !== "AU") m.set(p.country, (m.get(p.country) ?? 0) + p.visits);
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [places]);
  const overseas = abroad.reduce((a, [, n]) => a + n, 0);

  const rows = useMemo(() => {
    const m = new Map<string, BarRow>();
    const add = (id: string, label: string, n: number, detail?: string) => {
      const row = m.get(id) ?? { id, label, value: 0, detail };
      row.value += n;
      m.set(id, row);
    };
    for (const p of places) {
      if (view === "countries") {
        if (p.country) add(p.country, countryName(p.country), p.visits);
      } else if (view === "states") {
        if (p.country === "AU" && p.region) add(`AU-${p.region}`, stateName(p.region), p.visits);
      } else if (p.city && p.country) {
        add(cityId(p.country, p.region ?? "", p.city), p.city, p.visits, p.country === "AU" ? (p.region ?? undefined) : countryName(p.country));
      }
    }
    return withShare(
      [...m.values()].sort((a, b) => b.value - a.value),
      total,
    );
  }, [places, view, total]);

  return (
    <Panel
      title="Where they are"
      meta="Share of visits from each state. Click a state or city to see only those."
      actions={
        ready && total > 0 ? (
          <button type="button" onClick={() => setAll(true)} className="text-[0.8125rem] text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
            All places
          </button>
        ) : undefined
      }
      flush
    >
      <div className="px-5 pb-5 sm:px-6">
        {ready ? (
          <>
            <TrafficMap
              byState={byState}
              total={total}
              cities={cities}
              picked={facets.place}
              onPickState={(code) => pick("place", `AU-${code}`)}
              onPickCity={(id) => pick("place", id)}
            />
            {cities.length > 0 && (
              <p className="mt-3 border-t hairline pt-3 text-[0.8125rem] text-ink-soft">
                <span className="text-ink">Top cities</span>
                {" · "}
                {[...cities]
                  .sort((x, y) => y.visits - x.visits)
                  .slice(0, 6)
                  .map((c, i) => (
                    <span key={c.id}>
                      {i > 0 && ", "}
                      <button type="button" onClick={() => pick("place", c.id)} className={clsx("hover:text-ink hover:underline hover:underline-offset-4", facets.place === c.id && "text-ink underline underline-offset-4")}>
                        {c.name} {share(c.visits, total)}
                      </button>
                    </span>
                  ))}
              </p>
            )}
            {overseas > 0 && (
              <p className="mt-3 border-t hairline pt-3 text-[0.8125rem] text-ink-soft">
                <span className="text-ink">Overseas {share(overseas, total)}</span>
                {" · "}
                {abroad.slice(0, 4).map(([c, n], i) => (
                  <span key={c}>
                    {i > 0 && ", "}
                    <button type="button" onClick={() => pick("place", c)} className="hover:text-ink hover:underline hover:underline-offset-4">
                      {countryName(c)} {share(n, total)}
                    </button>
                  </span>
                ))}
                {abroad.length > 4 && ` and ${plural(abroad.length - 4, "more country", "more countries")}`}
              </p>
            )}
          </>
        ) : (
          <Bone className="aspect-[412/382] w-full" />
        )}
      </div>
      <Drawer open={all} onClose={() => setAll(false)} title="Where they are">
        <div className="px-6 pt-2">
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
        <div className="px-3 py-4">
          <BarList
            rows={rows}
            empty={view === "states" ? "No visits from Australia in this period" : "No visits in this period"}
            onPick={(id) => {
              pick("place", id);
              setAll(false);
            }}
            picked={facets.place}
          />
        </div>
      </Drawer>
    </Panel>
  );
}

// ── Listings ────────────────────────────────────────────────────────────

type VendorRow = Summary["vendors"][number];

function Listings({ ready, data, vendors, facets, pick, narrowed }: Part & { vendors: ListedVendor[]; narrowed: boolean }) {
  const [all, setAll] = useState(false);
  const [unseen, setUnseen] = useState(false);
  const bySlug = useMemo(() => new Map(vendors.map((v) => [v.slug, v])), [vendors]);
  const rows = data?.vendors ?? [];
  const seen = new Set(rows.filter((r) => r.views > 0).map((r) => r.slug));
  const none = vendors.filter((v) => !seen.has(v.slug));

  const row = (r: VendorRow, i: number, inDrawer = false) => {
    const v = bySlug.get(r.slug);
    const craft = craftOfVendor(v)?.name;
    const on = facets.vendor === r.slug;
    return (
      <li key={r.slug} className={clsx("border-t border-ink/[0.06] first:border-0", on && "bg-paper")}>
        <div className="group flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-paper/60 sm:px-6">
          <span className="hidden w-5 shrink-0 text-right text-[0.8125rem] text-ink-soft tabular-nums sm:block">{i + 1}</span>
          <button
            type="button"
            onClick={() => {
              pick("vendor", r.slug);
              if (inDrawer) setAll(false);
            }}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-pressed={on}
          >
            <Cover src={v?.cover} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.875rem] text-ink group-hover:underline group-hover:decoration-ink/30 group-hover:underline-offset-4">{r.name}</span>
              <span className="block truncate text-[0.8125rem] text-ink-soft">{[craft, r.channel && `Mostly ${CHANNELS[r.channel].toLowerCase()}`].filter(Boolean).join(" · ")}</span>
            </span>
          </button>
          <span className="grid shrink-0 grid-cols-[3rem_3.5rem] items-center gap-x-2 text-right text-[0.875rem] tabular-nums sm:grid-cols-[6.5rem_5rem] sm:gap-x-3">
            <span className="flex flex-col items-end">
              <span className="text-ink">{num(r.views)}</span>
              {data?.before && r.before > 0 && (r.before >= MIN_BASE ? <Delta value={r.views / r.before - 1} /> : <span className="text-[0.75rem] text-ink-soft">{num(r.before)} before</span>)}
            </span>
            <span className="text-ink-soft">{num(r.visitors)}</span>
          </span>
          <Link href={`/vendors/${r.slug}`} target="_blank" aria-label={`Open ${r.name}'s page`} className="hidden shrink-0 p-1 sm:block text-ink-mute transition-colors hover:text-ink">
            <Icon name="arrow-up-right" className="size-3.5" strokeWidth={1.5} />
          </Link>
        </div>
      </li>
    );
  };

  const columns = (
    <div className="flex items-center gap-3 border-b hairline px-5 pb-2 text-[0.75rem] text-ink-soft sm:px-6">
      <span className="hidden w-5 sm:block" />
      <span className="flex-1">Listing</span>
      <span className="grid shrink-0 grid-cols-[3rem_3.5rem] gap-x-2 text-right sm:grid-cols-[6.5rem_5rem] sm:gap-x-3">
        <span>Views</span>
        <span>Visitors</span>
      </span>
      <span className="hidden w-5.5 shrink-0 sm:block" />
    </div>
  );

  const bones = Array.from({ length: 6 }, (_, i) => (
    <li key={i} className="flex items-center gap-3 border-t border-ink/[0.06] px-5 py-2.5 first:border-0 sm:px-6">
      <Bone className="size-10" />
      <span className="flex-1 space-y-1.5">
        <Bone className="h-3.5 w-2/5" />
        <Bone className="h-3 w-1/4" />
      </span>
      <Bone className="h-4 w-24" />
    </li>
  ));

  return (
    <>
      <Heading title="Listings">
        {ready ? (
          none.length > 0 && !narrowed ? (
            <button type="button" onClick={() => setUnseen(true)} className="text-[0.875rem] text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
              {plural(none.length, "listing")} no one looked at in this period
            </button>
          ) : (
            <p className="text-[0.875rem] text-ink-soft">{plural(seen.size, "listing")} viewed</p>
          )
        ) : (
          <Bone className="h-4 w-56" />
        )}
      </Heading>
      <Panel flush className="pt-4">
        {columns}
        <ol>{!ready ? bones : rows.length ? rows.slice(0, SHOWN).map((r, i) => row(r, i)) : <li className="px-5 py-5 text-[0.875rem] text-ink-soft sm:px-6">No listings viewed in this period</li>}</ol>
        {ready && rows.length > SHOWN && (
          <div className="border-t hairline px-5 py-3 sm:px-6">
            <button type="button" onClick={() => setAll(true)} className="text-[0.8125rem] text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
              See all {num(rows.length)}
            </button>
          </div>
        )}
      </Panel>

      <Drawer open={all} onClose={() => setAll(false)} title={`${plural(rows.length, "listing")}`} width="max-w-2xl">
        <div className="pt-4">
          {columns}
          <ol>{rows.map((r, i) => row(r, i, true))}</ol>
        </div>
      </Drawer>
      <Drawer open={unseen} onClose={() => setUnseen(false)} title={`${plural(none.length, "listing")} no one looked at`}>
        <p className="px-6 pt-5 pb-3 text-[0.875rem] text-ink-soft">No views in this period. With how many photos each has: listings with fewer photos are usually the ones to help first.</p>
        <ul>
          {none
            .slice()
            .sort((a, b) => a.photos - b.photos || a.name.localeCompare(b.name))
            .map((v) => (
              <li key={v.slug} className="border-t border-ink/[0.06]">
                <Link href={`/vendors/${v.slug}`} target="_blank" className="group flex items-center gap-3 px-6 py-3 transition-colors hover:bg-surface">
                  <Cover src={v.cover} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] text-ink">{v.name}</span>
                    <span className="block truncate text-[0.8125rem] text-ink-soft">
                      {craftOfVendor(v)?.name} · {v.photos ? plural(v.photos, "photo") : "No photos"}
                    </span>
                  </span>
                  <Icon name="arrow-up-right" className="size-3.5 shrink-0 text-ink-mute transition-colors group-hover:text-ink" strokeWidth={1.5} />
                </Link>
              </li>
            ))}
        </ul>
      </Drawer>
    </>
  );
}

// ── What couples look for ───────────────────────────────────────────────

type FilterView = "language" | "category" | "location" | "service";

function Demand({ ready, data, names, facets, pick }: Part & { names: Map<string, string> }) {
  const [view, setView] = useState<FilterView>("language");
  const visits = data?.totals.visits ?? 0;
  const landings = withShare(
    (data?.landings ?? []).map((l): BarRow => {
      const slug = l.path.startsWith("/vendors/") ? l.path.slice(9) : undefined;
      return { id: l.path, label: slug ? (names.get(slug) ?? slug) : (PAGE_NAMES[l.path] ?? l.path), detail: slug ? "Listing" : undefined, value: l.visits };
    }),
    visits,
  );
  const filterRows = useMemo(() => {
    const rows = (data?.filters ?? [])
      .filter((f) => f.kind === view)
      .map((f): BarRow => {
        const native = f.kind === "language" ? languages[f.value as Language]?.native : undefined;
        const label =
          f.kind === "language"
            ? f.value === "Other"
              ? "Other languages"
              : (native ?? f.value)
            : f.kind === "category"
              ? (craftById[f.value as CraftId]?.name ?? f.value)
              : f.kind === "location"
                ? f.value === "AUS"
                  ? "Australia"
                  : (areas[f.value as AreaCode] ?? f.value)
                : (serviceLabels[f.value as Service] ?? f.value);
        return { id: f.value, label, detail: native && native !== f.value ? f.value : undefined, value: f.times };
      })
      .sort((a, b) => b.value - a.value);
    return withShare(rows, rows.reduce((a, r) => a + r.value, 0));
  }, [data, view]);
  const searchTotal = (data?.searches ?? []).reduce((a, s) => a + s.times, 0);
  const searches = (data?.searches ?? []).map((s): BarRow => ({ id: s.query, label: s.query, detail: s.matches ? plural(s.matches, "match", "matches") : "No match", value: s.times, note: share(s.times, searchTotal) }));
  const unmatched = (data?.searches ?? []).filter((s) => s.matches === 0).map((s): BarRow => ({ id: s.query, label: s.query, value: s.times, note: share(s.times, searchTotal) }));

  return (
    <>
      <Heading title="What couples look for">
        <p className="text-[0.875rem] text-ink-soft">Where they land, and what they choose and type in the directory</p>
      </Heading>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Where they land" meta="The first page of each visit, as a share of visits" flush>
          <div className="px-2 pb-5 sm:px-3">
            {ready ? (
              <ShortList
                rows={landings}
                empty="No visits in this period"
                title="Where they land"
                onPick={(id) => id.startsWith("/vendors/") && pick("vendor", id.slice(9))}
                picked={facets.vendor && `/vendors/${facets.vendor}`}
              />
            ) : (
              listBones()
            )}
          </div>
        </Panel>
        <Panel title="What they filter by" meta="Directory choices, as a share of each kind" flush>
          <div className="px-5 sm:px-6">
            <Tabs<FilterView>
              tabs={[
                { id: "language", label: "Languages" },
                { id: "category", label: "Categories" },
                { id: "location", label: "Locations" },
                { id: "service", label: "Services" },
              ]}
              value={view}
              onChange={setView}
            />
          </div>
          <div className="px-2 pt-4 pb-5 sm:px-3">{ready ? <ShortList rows={filterRows} empty="No one chose these in this period" title="What they filter by" /> : listBones()}</div>
        </Panel>
        <Panel title="Searches" meta="The words couples type, as a share of searches" flush>
          <div className="px-2 pb-5 sm:px-3">{ready ? <ShortList rows={searches} empty="No searches in this period" title="Searches" /> : listBones()}</div>
        </Panel>
        <Panel title="Found no one" meta="Vendors couples looked for that aren't listed yet" flush>
          <div className="px-2 pb-5 sm:px-3">{ready ? <ShortList rows={unmatched} empty="Every search found someone" title="Searches that found no one" /> : listBones()}</div>
        </Panel>
      </div>
    </>
  );
}
