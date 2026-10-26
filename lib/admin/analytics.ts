import { vendors } from "@/lib/vendors";
import type { Vendor } from "@/data/types";
import { hash, jitter, rng } from "./random";
import { TODAY_N, dayNumber, isoDay, lastMonths, weekStart } from "./time";

/*
 * Simulated analytics for the demo. Two years of daily traffic are generated from a seeded random
 * stream (growth, wedding-season peaks, a weekly rhythm and a couple of spikes), and every vendor's
 * views, clicks and enquiries are drawn from that same traffic, so the numbers agree on every page.
 * In the full build these come from the analytics provider and the database.
 */

const HISTORY = 760;
const START = TODAY_N - HISTORY + 1;

// Mon … Sun. Couples plan on Sunday nights.
const weekday = [1.08, 1.02, 1, 0.97, 0.84, 0.82, 1.2];
// Jan … Dec. Engagements at Christmas, planning through summer.
const season = [1.32, 1.24, 1.12, 0.98, 0.9, 0.84, 0.88, 0.92, 1, 1.04, 1.02, 0.86];
// Moments that moved traffic: a reel that travelled, a story that was shared.
const spikes: Record<string, { size: number; decay: number; source: SourceId }> = {
  "2026-10-11": { size: 1.15, decay: 0.72, source: "instagram" },
  "2026-09-03": { size: 0.55, decay: 0.6, source: "pinterest" },
  "2026-03-08": { size: 0.7, decay: 0.65, source: "tiktok" },
  "2025-11-19": { size: 0.45, decay: 0.6, source: "instagram" },
};

export type DayRow = {
  day: string;
  visits: number;
  visitors: number;
  pageviews: number;
  couples: number;
  vendorSignups: number;
  spike: SourceId | null;
};

export const days: DayRow[] = (() => {
  const r = rng("traffic");
  const rows: DayRow[] = [];
  let boost = 0;
  let decay = 0;
  let boostSource: SourceId | null = null;
  for (let n = START; n <= TODAY_N; n++) {
    const day = isoDay(n);
    const date = new Date(n * 86_400_000);
    const age = (TODAY_N - n) / 365;
    const spike = spikes[day];
    if (spike) {
      boost = spike.size;
      decay = spike.decay;
      boostSource = spike.source;
    }
    const base = 372 * Math.pow(1.48, -age) * weekday[(date.getUTCDay() + 6) % 7] * season[date.getUTCMonth()];
    const visits = Math.round(base * (1 + boost) * jitter(r, 0.09));
    const visitors = Math.round(visits * (0.76 + r() * 0.05));
    rows.push({
      day,
      visits,
      visitors,
      pageviews: Math.round(visits * (2.7 + r() * 0.5)),
      couples: Math.round(visits * 0.0048 * jitter(r, 0.6)),
      vendorSignups: r() < 0.13 * (1 - age * 0.3) ? 1 : 0,
      spike: boost > 0.05 ? boostSource : null,
    });
    boost *= decay;
    if (boost < 0.03) boostSource = null;
  }
  return rows;
})();


// ── Periods ──────────────────────────────────────────────────────────────

export type Interval = "day" | "week" | "month";

export const intervals: Record<Interval, { label: string; range: string; count: number; previous: string }> = {
  day: { label: "Daily", range: "Last 30 days", count: 30, previous: "previous 30 days" },
  week: { label: "Weekly", range: "Last 12 weeks", count: 12, previous: "previous 12 weeks" },
  month: { label: "Monthly", range: "Last 12 months", count: 12, previous: "previous 12 months" },
};

export type Bucket = { key: string; from: number; to: number };

/** The buckets for an interval, oldest first, plus the same number of buckets before them. */
export function buckets(interval: Interval): { current: Bucket[]; previous: Bucket[] } {
  const count = intervals[interval].count;
  const all: Bucket[] = [];
  if (interval === "day") {
    for (let i = count * 2 - 1; i >= 0; i--) all.push({ key: isoDay(TODAY_N - i), from: TODAY_N - i, to: TODAY_N - i });
  } else if (interval === "week") {
    const thisWeek = dayNumber(weekStart(isoDay(TODAY_N)));
    for (let i = count * 2 - 1; i >= 0; i--) {
      const from = thisWeek - i * 7;
      all.push({ key: isoDay(from), from, to: Math.min(from + 6, TODAY_N) });
    }
  } else {
    for (const key of lastMonths(count * 2)) {
      const from = dayNumber(`${key}-01`);
      const next = new Date(from * 86_400_000);
      next.setUTCMonth(next.getUTCMonth() + 1);
      all.push({ key, from, to: Math.min(next.getTime() / 86_400_000 - 1, TODAY_N) });
    }
  }
  return { previous: all.slice(0, count), current: all.slice(count) };
}

function sumDays(from: number, to: number, pick: (i: number) => number) {
  let total = 0;
  for (let n = Math.max(from, START); n <= to; n++) total += pick(n - START);
  return total;
}

export type Point = { key: string; value: number; prev: number };
export type Total = { value: number; prev: number; delta: number };

const total = (value: number, prev: number): Total => ({ value, prev, delta: prev ? value / prev - 1 : 0 });

/** Any per-day measure, bucketed by interval and paired with the previous period. */
export function series(pick: (i: number) => number, interval: Interval): Point[] {
  const { current, previous } = buckets(interval);
  return current.map((b, i) => ({ key: b.key, value: sumDays(b.from, b.to, pick), prev: sumDays(previous[i].from, previous[i].to, pick) }));
}

export function sum(points: Point[]): Total {
  return total(
    points.reduce((s, p) => s + p.value, 0),
    points.reduce((s, p) => s + p.prev, 0),
  );
}

export type TrafficMetric = "visits" | "visitors" | "pageviews";
export const trafficMetrics: Record<TrafficMetric, string> = { visits: "Visits", visitors: "Unique visitors", pageviews: "Page views" };

export const traffic = (metric: TrafficMetric | "couples" | "vendorSignups", interval: Interval) => series((i) => days[i][metric], interval);

// ── Where visitors come from ─────────────────────────────────────────────

export type SourceId = "google" | "instagram" | "direct" | "pinterest" | "tiktok" | "facebook" | "referral";

export const sources: { id: SourceId; label: string; share: number }[] = [
  { id: "google", label: "Google", share: 0.39 },
  { id: "instagram", label: "Instagram", share: 0.21 },
  { id: "direct", label: "Direct", share: 0.15 },
  { id: "pinterest", label: "Pinterest", share: 0.09 },
  { id: "tiktok", label: "TikTok", share: 0.07 },
  { id: "facebook", label: "Facebook", share: 0.05 },
  { id: "referral", label: "Other sites", share: 0.04 },
];

export const referrers = [
  { label: "easyweddings.com.au", share: 0.34 },
  { label: "reddit.com", share: 0.22 },
  { label: "polkadotbride.com", share: 0.18 },
  { label: "chatgpt.com", share: 0.15 },
  { label: "linktr.ee", share: 0.11 },
];

export type Row = { label: string; value: number; prev?: number; detail?: string; href?: string };

/** Split a period's visits by source. Spike days credit their extra traffic to the source that caused them. */
export function sourceBreakdown(interval: Interval): Row[] {
  const { current, previous } = buckets(interval);
  const split = (from: number, to: number) => {
    const out = Object.fromEntries(sources.map((s) => [s.id, 0])) as Record<SourceId, number>;
    for (let n = Math.max(from, START); n <= to; n++) {
      const d = days[n - START];
      const r = rng(n);
      let rest = d.visits;
      if (d.spike) {
        const extra = Math.round(d.visits * 0.35);
        out[d.spike] += extra;
        rest -= extra;
      }
      for (const s of sources) out[s.id] += rest * s.share * jitter(r, 0.12);
    }
    return out;
  };
  const now = split(current[0].from, current.at(-1)!.to);
  const before = split(previous[0].from, previous.at(-1)!.to);
  return sources
    .map((s) => ({ label: s.label, value: Math.round(now[s.id]), prev: Math.round(before[s.id]), id: s.id }))
    .sort((a, b) => b.value - a.value);
}

const locationShares: [string, string, number][] = [
  ["Melbourne", "VIC", 0.44],
  ["Sydney", "NSW", 0.2],
  ["Brisbane", "QLD", 0.08],
  ["Perth", "WA", 0.05],
  ["Adelaide", "SA", 0.042],
  ["Geelong", "VIC", 0.031],
  ["Canberra", "ACT", 0.024],
  ["Gold Coast", "QLD", 0.02],
  ["Parramatta", "NSW", 0.018],
  ["Hobart", "TAS", 0.011],
  ["Auckland", "NZ", 0.017],
  ["Singapore", "SG", 0.012],
];

const scale = (interval: Interval) => {
  const t = sum(traffic("visits", interval));
  return { now: t.value, before: t.prev };
};

function shareRows<T>(items: T[], interval: Interval, share: (t: T) => number, label: (t: T) => string, seed: string, extra?: (t: T) => Partial<Row>): Row[] {
  const { now, before } = scale(interval);
  const r = rng(`${seed}-${interval}`);
  return items
    .map((t) => ({ label: label(t), value: Math.round(now * share(t) * jitter(r, 0.08)), prev: Math.round(before * share(t) * jitter(r, 0.1)), ...extra?.(t) }))
    .sort((a, b) => b.value - a.value);
}

export const locations = (interval: Interval) =>
  shareRows(locationShares, interval, (l) => l[2], (l) => l[0], "loc", (l) => ({ detail: l[1] }));

export const states = (interval: Interval) => {
  const rows = new Map<string, Row>();
  for (const l of locations(interval)) {
    const key = l.detail!;
    const row = rows.get(key) ?? { label: key, value: 0, prev: 0 };
    row.value += l.value;
    row.prev! += l.prev ?? 0;
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.value - a.value);
};

// ── Pages ────────────────────────────────────────────────────────────────

export const journalReads: Record<string, number> = {
  "writing-a-ceremony-in-two-languages": 0.062,
  "all-weddings-are-not-the-same": 0.048,
  "eloping-by-the-sea": 0.041,
  "eight-trays-seven-trays": 0.033,
};

export function topPages(interval: Interval): Row[] {
  const pages: [string, string, number][] = [
    ["/", "Home", 0.31],
    ["/vendors", "Vendors", 0.24],
    ["/vendors?craft=photo-film", "Vendors · Photo & Film", 0.07],
    ["/vendors?craft=ceremony", "Vendors · Ceremony", 0.052],
    ["/vendors/katrina-lai", "Katrina Lai", 0.031],
    ["/vendors/folkstone-weddings", "Folkstone Weddings", 0.027],
    ["/vendors/invictus-quartet", "Invictus Quartet", 0.022],
    ["/vendors?lang=Vietnamese", "Vendors · Tiếng Việt", 0.019],
  ];
  return shareRows(pages, interval, (p) => p[2] * 2.9, (p) => p[1], "pages", (p) => ({ detail: p[0], href: p[0] }));
}

// ── Search ───────────────────────────────────────────────────────────────

const queries: [string, number][] = [
  ["photographer", 0.034],
  ["cantonese mc", 0.022],
  ["tea ceremony", 0.021],
  ["vietnamese celebrant", 0.018],
  ["makeup artist", 0.016],
  ["hanbok", 0.012],
  ["videographer", 0.012],
  ["ao dai", 0.011],
  ["lion dance", 0.0105],
  ["mandarin celebrant", 0.0098],
  ["florist", 0.009],
  ["henna", 0.0082],
  ["photobooth", 0.0078],
  ["dj", 0.0074],
  ["string quartet", 0.0061],
  ["calligraphy", 0.0052],
  ["venue", 0.0049],
  ["korean celebrant", 0.0041],
  ["cake", 0.0038],
  ["tea set hire", 0.0031],
];

function haystack(v: Vendor) {
  return [v.name, v.discipline, v.lede, v.based, ...v.services, ...(v.languages ?? []), ...v.story].join(" ").toLowerCase();
}

/** How many listed vendors a query finds: every word has to appear somewhere in the listing. */
export function searchResults(query: string, list: Vendor[] = vendors) {
  const words = query.toLowerCase().replace(/er$/, "").split(/\s+/);
  return list.filter((v) => {
    const text = haystack(v);
    return words.every((w) => text.includes(w.replace(/ist$/, "")));
  }).length;
}

export function searches(interval: Interval): (Row & { results: number })[] {
  return shareRows(queries, interval, (q) => q[1], (q) => q[0], "search").map((row) => ({ ...row, results: searchResults(row.label) }));
}

// ── Vendors ──────────────────────────────────────────────────────────────

/** How much of the directory's attention each vendor draws. Photography, being featured and the craft all count. */
function weight(v: Vendor) {
  const r = rng(`w-${v.slug}`);
  const photos = v.cover ? 1 + Math.min(v.gallery?.length ?? 0, 5) * 0.12 : 0.18;
  const craft = v.services.some((s) => s === "Photographer" || s === "Videographer") ? 1.25 : 1;
  const quiet = ["elusana", "rosie-haus", "silver-arrow-films"].includes(v.slug) ? 0.32 : 1;
  return (0.55 + r() * 0.9) * photos * craft * quiet * (v.featured ? 1.7 : 1);
}

const weights = vendors.map(weight);
const weightTotal = weights.reduce((a, b) => a + b, 0);

export type VendorDay = { views: number; enquiries: number; website: number; instagram: number; facebook: number };

const vendorDaysCache = new Map<string, VendorDay[]>();

/** Per-day profile views, clicks out and enquiries for one vendor. */
export function vendorDays(slug: string): VendorDay[] {
  const cached = vendorDaysCache.get(slug);
  if (cached) return cached;
  const index = vendors.findIndex((v) => v.slug === slug);
  const v = vendors[index];
  if (!v) return [];
  const r = rng(`vd-${slug}`);
  const share = weights[index] / weightTotal;
  const conversion = 0.009 + ((hash(slug) % 100) / 100) * 0.016;
  const round = (x: number) => Math.floor(x) + (r() < x % 1 ? 1 : 0);
  const rows = days.map((d) => {
    const views = round(d.pageviews * 0.36 * share * jitter(r, 0.35));
    return {
      views,
      enquiries: round(views * conversion * jitter(r, 0.5)),
      website: v.contact?.website ? round(views * 0.075 * jitter(r, 0.4)) : 0,
      instagram: v.socials?.instagram ? round(views * 0.064 * jitter(r, 0.4)) : 0,
      facebook: v.socials?.facebook ? round(views * 0.018 * jitter(r, 0.5)) : 0,
    };
  });
  vendorDaysCache.set(slug, rows);
  return rows;
}

export type VendorMetric = keyof VendorDay;

export const vendorSeries = (slug: string, metric: VendorMetric, interval: Interval) => {
  const rows = vendorDays(slug);
  return series((i) => rows[i]?.[metric] ?? 0, interval);
};

export function vendorTotals(slug: string, interval: Interval) {
  return Object.fromEntries(
    (["views", "enquiries", "website", "instagram", "facebook"] as const).map((m) => [m, sum(vendorSeries(slug, m, interval))]),
  ) as Record<VendorMetric, Total>;
}

/** Enquiries across every vendor, per day. */
export const enquiriesPerDay = days.map((_, i) => vendors.reduce((s, v) => s + vendorDays(v.slug)[i].enquiries, 0));
export const enquiries = (interval: Interval) => series((i) => enquiriesPerDay[i], interval);
const vendorViewsPerDay = days.map((_, i) => vendors.reduce((s, v) => s + vendorDays(v.slug)[i].views, 0));
export const vendorViews = (interval: Interval) => series((i) => vendorViewsPerDay[i], interval);

export type VendorRank = { vendor: Vendor; views: Total; enquiries: Total; website: Total; instagram: Total; conversion: number };

export function vendorRanking(interval: Interval): VendorRank[] {
  return vendors.map((vendor) => {
    const t = vendorTotals(vendor.slug, interval);
    return { vendor, ...t, conversion: t.views.value ? t.enquiries.value / t.views.value : 0 };
  });
}

/** Where a vendor's profile views came from. */
export function vendorSources(slug: string, interval: Interval): Row[] {
  const views = vendorTotals(slug, interval).views;
  const r = rng(`vs-${slug}-${interval}`);
  return [
    ["The directory", 0.42],
    ["Google", 0.2],
    ["Instagram", 0.13],
    ["Search on the site", 0.1],
    ["Similar vendors", 0.08],
    ["Journal", 0.07],
  ]
    .map(([label, share]) => ({ label: label as string, value: Math.round(views.value * (share as number) * jitter(r, 0.2)) }))
    .sort((a, b) => b.value - a.value);
}

/** Searches on the site that showed this vendor in the results. */
export function vendorSearches(v: Vendor, interval: Interval): Row[] {
  return searches(interval)
    .filter((q) => q.results > 0 && searchResults(q.label, [v]) > 0)
    .map((q) => ({ label: q.label, value: Math.round(q.value / Math.max(1, q.results)) }))
    .slice(0, 5);
}

// ── Site health ──────────────────────────────────────────────────────────

export const uptime = {
  ratio: 0.9996,
  responseMs: 184,
  checkedAgo: "1 min ago",
  incidents: [{ id: "slow-1025", day: isoDay(TODAY_N - 1), at: "21:42", minutes: 14, detail: "Pages took 2.6s on average to respond (usually 0.2s)." }],
};
