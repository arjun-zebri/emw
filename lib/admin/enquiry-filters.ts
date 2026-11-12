import { craftOf, cultureNames } from "@/data/taxonomy";
import type { Service } from "@/data/types";
import type { Enquiry, ListedVendor } from "./enquiries";
import { addMonths, dayNumber, isoDay } from "./time";

/*
 * Slicing the team's enquiries. A period (with the one before it, to compare), and facets the team
 * adds by clicking the figures (a vendor, a category, a culture) or from the location menu (where
 * the vendor works: their service area, so an Australia-wide vendor is in every state). Days
 * are Melbourne days, like the rest of the admin. Pure functions, run in the browser.
 */

export type Period = "7d" | "30d" | "90d" | "12m" | "all" | "custom";

export const PERIODS: { id: Period; label: string }[] = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "12m", label: "Last 12 months" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom" },
];

export type Facet = "vendor" | "craft" | "culture" | "location";
export type Facets = Partial<Record<Facet, string>>;

export type Filters = {
  period: Period;
  /** YYYY-MM-DD, both included. Only for "custom". */
  from?: string;
  to?: string;
  facets: Facets;
  /** The inbox search. */
  q: string;
};

/** Days in Melbourne, inclusive at both ends. */
export type Range = { start: string; end: string };

/** Below this, a change on the period before is noise: show the two counts instead of a percentage. */
export const MIN_BASE = 10;

/** The Melbourne day a moment falls on. */
export const melDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });

const addDays = (day: string, n: number) => isoDay(dayNumber(day) + n);
export const daysIn = (r: Range) => dayNumber(r.end) - dayNumber(r.start) + 1;

/**
 * The period, ending today, and the one just before it of the same length. "All time" starts at the
 * first enquiry and has nothing before it.
 */
export function rangeOf(f: Filters, today: string, first?: string): { range: Range; prev?: Range } {
  // In the prerendered shell there's no today yet; the page shows "Loading" until there is.
  if (!today) return { range: { start: "", end: "" } };
  let range: Range;
  if (f.period === "custom" && f.from && f.to) range = f.from <= f.to ? { start: f.from, end: f.to } : { start: f.to, end: f.from };
  else if (f.period === "7d") range = { start: addDays(today, -6), end: today };
  else if (f.period === "30d") range = { start: addDays(today, -29), end: today };
  else if (f.period === "90d") range = { start: addDays(today, -89), end: today };
  else if (f.period === "12m") range = { start: addDays(addMonths(today, -12), 1), end: today };
  else return { range: { start: first ? melDay(first) : today, end: today } };
  const n = daysIn(range);
  return { range, prev: { start: addDays(range.start, -n), end: addDays(range.start, -1) } };
}

export const within = (e: Enquiry, r: Range) => {
  const d = melDay(e.sentAt);
  return d >= r.start && d <= r.end;
};

/** A listing's main category: the one its first service belongs to. */
export const craftOfVendor = (v?: ListedVendor) => (v?.services[0] ? craftOf(v.services[0] as Service) : undefined);

const cultureWords = cultureNames.map((c) => [c, new RegExp(`\\b${c}\\b`, "i")] as const);

/**
 * The cultures an enquiry names: those chosen from the list, and any of the same names written in
 * the couple's own words (the form asks in free text). Counted as written, never inferred.
 */
export const culturesOf = (e: Enquiry) => [...new Set([...e.cultures, ...cultureWords.filter(([, re]) => e.traditions && re.test(e.traditions)).map(([c]) => c)])];

/** Whether an enquiry fits the facets and the search. */
export function matches(e: Enquiry, f: Filters, vendors: Map<string, ListedVendor>) {
  const { vendor, craft, culture, location } = f.facets;
  if (vendor && e.vendorSlug !== vendor) return false;
  if (craft && craftOfVendor(vendors.get(e.vendorSlug))?.id !== craft) return false;
  if (culture && !culturesOf(e).includes(culture)) return false;
  if (location && !vendors.get(e.vendorSlug)?.areas.includes(location)) return false;
  const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length) {
    const text = [e.name, e.email, e.vendorName, e.message, e.venue, e.traditions, e.cultures.join(" "), e.sourceDetail].filter(Boolean).join(" ").toLowerCase();
    if (!words.every((w) => text.includes(w))) return false;
  }
  return true;
}

/** Whether a listing fits the facets that are about listings (vendor, category, location). */
export const listingMatches = (v: ListedVendor, f: Filters) =>
  (!f.facets.vendor || v.slug === f.facets.vendor) && (!f.facets.craft || craftOfVendor(v)?.id === f.facets.craft) && (!f.facets.location || v.areas.includes(f.facets.location));

export type Unit = "day" | "week" | "month";

/** Mondays, by Melbourne day. */
const weekStart = (day: string) => addDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));

/**
 * Points for the chart, each with the period before's count at the same place: days for up to
 * three months, weeks up to about a year, months beyond. A column covers `range`.
 */
export function buckets(list: Enquiry[], before: Enquiry[], r: Range, prev?: Range) {
  const n = daysIn(r);
  const unit: Unit = n <= 92 ? "day" : n <= 400 ? "week" : "month";
  const keyOf = (day: string) => (unit === "day" ? day : unit === "week" ? weekStart(day) : day.slice(0, 7));
  const cols: { key: string; value: number; prev: number; range: Range }[] = [];
  for (let d = r.start; d <= r.end; d = addDays(d, 1)) {
    const key = keyOf(d);
    if (cols.at(-1)?.key === key) cols.at(-1)!.range.end = d;
    else cols.push({ key, value: 0, prev: 0, range: { start: d, end: d } });
  }
  const at = new Map(cols.map((c, i) => [c.key, i]));
  for (const e of list) {
    const i = at.get(keyOf(melDay(e.sentAt)));
    if (i !== undefined) cols[i].value++;
  }
  // The period before, shifted forward by its length, lands in the matching column.
  if (prev)
    for (const e of before) {
      const i = at.get(keyOf(addDays(melDay(e.sentAt), n)));
      if (i !== undefined) cols[i].prev++;
    }
  return { unit, cols };
}

/** The same columns as `buckets`, from counts already added up per day (Admin → Traffic). */
export function bucketDays(days: { day: string; value: number }[], before: { day: string; value: number }[], r: Range, prev?: Range) {
  const n = daysIn(r);
  const unit: Unit = n <= 92 ? "day" : n <= 400 ? "week" : "month";
  const keyOf = (day: string) => (unit === "day" ? day : unit === "week" ? weekStart(day) : day.slice(0, 7));
  const cols: { key: string; value: number; prev: number; range: Range }[] = [];
  for (let d = r.start; d <= r.end; d = addDays(d, 1)) {
    const key = keyOf(d);
    if (cols.at(-1)?.key === key) cols.at(-1)!.range.end = d;
    else cols.push({ key, value: 0, prev: 0, range: { start: d, end: d } });
  }
  const at = new Map(cols.map((c, i) => [c.key, i]));
  for (const d of days) {
    const i = at.get(keyOf(d.day));
    if (i !== undefined) cols[i].value += d.value;
  }
  if (prev)
    for (const d of before) {
      const i = at.get(keyOf(addDays(d.day, n)));
      if (i !== undefined) cols[i].prev += d.value;
    }
  return { unit, cols };
}

export const facetLabel: Record<Facet, string> = { vendor: "Vendor", craft: "Category", culture: "Culture", location: "Location" };
