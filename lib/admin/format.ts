import { TODAY } from "./time";

const tz = { timeZone: "Australia/Melbourne" } as const;
const utc = { timeZone: "UTC" } as const;

const compactFmt = new Intl.NumberFormat("en-AU", { notation: "compact", maximumFractionDigits: 1 });
const intFmt = new Intl.NumberFormat("en-AU");
const audFmt = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const audCents = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2 });

export const num = (n: number) => intFmt.format(Math.round(n));
/** 1,284 below ten thousand, 12.9K above. */
export const compact = (n: number) => (Math.abs(n) < 10_000 ? num(n) : compactFmt.format(n));
export const aud = (n: number, cents = false) => (cents ? audCents : audFmt).format(n);
export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;
export const signedPct = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n * 100).toFixed(Math.abs(n) < 0.1 ? 1 : 0)}%`;

/** "26 Oct", or "26 Oct 2025" outside the current year. */
export function day(iso: string, opts: { weekday?: boolean; year?: boolean } = {}) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  const showYear = opts.year ?? iso.slice(0, 4) !== TODAY.slice(0, 4);
  return d.toLocaleDateString("en-AU", { ...utc, day: "numeric", month: "short", ...(showYear && { year: "numeric" }), ...(opts.weekday && { weekday: "short" }) });
}

export const longDay = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-AU", { ...utc, weekday: "long", day: "numeric", month: "long" });

export const month = (key: string, long = false) =>
  new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-AU", { ...utc, month: long ? "long" : "short", ...(long && { year: "numeric" }) });

export const time = (iso: string) => new Date(iso).toLocaleTimeString("en-AU", { ...tz, hour: "numeric", minute: "2-digit" }).replace(" ", " ");

/** "2h ago", "3d ago", relative to the demo's fixed clock. */
export function ago(iso: string, now = Date.parse(`${TODAY}T09:40:00+11:00`)) {
  const mins = Math.max(0, (now - Date.parse(iso)) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${Math.round(mins)}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  if (mins < 60 * 24 * 14) return `${Math.round(mins / 1440)}d ago`;
  return day(iso);
}

export const plural = (n: number, one: string, many = `${one}s`) => `${num(n)} ${n === 1 ? one : many}`;
