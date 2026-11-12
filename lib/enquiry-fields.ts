import { areas, crafts } from "@/data/taxonomy";
import type { AreaCode } from "@/data/types";

/*
 * What an enquiry's structured answers mean, in words: the wedding month, where it is, and how the
 * couple found the vendor. Shared by the Enquire form, the server action, the email and the admin.
 */

/** Must match the check on enquiries.guests. */
export const GUESTS = ["Under 80", "80–200", "200–400", "400+", "Not applicable"] as const;

export const NOT_DECIDED = "Not decided";
export const NOT_APPLICABLE = "Not applicable";

const monthFmt = new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric", timeZone: "UTC" });

/** "2027-03" → "March 2027"; "Not decided" and "Not applicable" read as themselves. */
export function weddingLabel(v?: string | null) {
  if (!v) return undefined;
  return /^\d{4}-\d{2}$/.test(v) ? monthFmt.format(new Date(`${v}-01T00:00:00Z`)) : v;
}

/** The months a couple can choose, from this one (YYYY-MM) for three years. */
export function weddingMonths(thisMonth: string) {
  const [y, m] = thisMonth.split("-").map(Number);
  return Array.from({ length: 36 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    return d.toISOString().slice(0, 7);
  });
}

export const isRegion = (v: string): v is AreaCode | typeof NOT_DECIDED => v === NOT_DECIDED || v in areas;
export const regionLabel = (v?: string | null) => (!v ? undefined : v in areas ? areas[v as AreaCode] : v);

// ── How the couple found the vendor ─────────────────────────────────────

export const SOURCES = {
  search: "Searched the directory",
  directory: "Browsed the directory",
  home: "Home page",
  blog: "Blog",
  listing: "Another listing",
  site: "Elsewhere on the site",
  elsewhere: "Another website",
  direct: "Came straight to the listing",
} as const;
export type Source = keyof typeof SOURCES;

const craftNames: Record<string, string> = Object.fromEntries(crafts.map((c) => [c.id, c.name]));

/** Search engines and social sites by name; anything else by its host. */
function siteName(host: string) {
  const h = host.replace(/^(www|m|l|lm)\./, "");
  const known: [RegExp, string][] = [
    [/(^|\.)google\./, "Google"],
    [/(^|\.)bing\.com$/, "Bing"],
    [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
    [/(^|\.)instagram\.com$/, "Instagram"],
    [/(^|\.)facebook\.com$|(^|\.)fb\.com$/, "Facebook"],
    [/(^|\.)pinterest\./, "Pinterest"],
    [/(^|\.)tiktok\.com$/, "TikTok"],
    [/(^|\.)youtube\.com$/, "YouTube"],
    [/(^|\.)linkedin\.com$/, "LinkedIn"],
  ];
  return known.find(([re]) => re.test(h))?.[1] ?? h;
}

/**
 * How a couple reached the listing they enquired from, worked out from the pages they visited in
 * this tab (the listing last) and the site that sent them. Server side, from what the browser sent.
 */
export function classifySource(t: { pages?: unknown; referrer?: unknown; landing?: unknown } | undefined, origin: string, slug: string): { source: Source; detail?: string } {
  const pages = (Array.isArray(t?.pages) ? t.pages : []).filter((p): p is string => typeof p === "string" && p.startsWith("/")).slice(-6);
  // The page before this listing.
  const here = pages.findLastIndex((p) => p.split("?")[0] === `/vendors/${slug}`);
  let referrer: URL | null = null;
  try {
    referrer = typeof t?.referrer === "string" && t.referrer ? new URL(t.referrer) : null;
  } catch {}
  const ours = referrer?.host === new URL(origin).host;
  // A listing opened in a new tab starts a fresh trail, but its referrer is still our page.
  const before = here > 0 ? pages[here - 1] : ours && referrer ? `${referrer.pathname}${referrer.search}` : undefined;

  if (before) {
    const url = new URL(before, origin);
    const path = url.pathname;
    if (path === "/vendors") {
      const q = url.searchParams.get("q")?.trim();
      if (q) return { source: "search", detail: q.slice(0, 200) };
      const parts = [
        craftNames[url.searchParams.get("craft") ?? ""],
        ...(url.searchParams.get("service")?.split(",") ?? []),
        ...(url.searchParams.get("lang")?.split(",") ?? []),
        ...(url.searchParams.get("area")?.split(",").map((a) => areas[a as AreaCode] ?? a) ?? []),
      ].filter(Boolean);
      return { source: "directory", detail: parts.join(", ").slice(0, 200) || undefined };
    }
    if (path === "/") return { source: "home" };
    if (path.startsWith("/blog")) return { source: "blog", detail: path.slice(0, 200) };
    if (path === `/vendors/${slug}`) return { source: "direct" };
    if (path.startsWith("/vendors/")) return { source: "listing", detail: path.slice("/vendors/".length, 200) };
    return { source: "site", detail: path.slice(0, 200) };
  }

  // Landed on the listing itself: a campaign tag, then the site that sent them.
  const landing = typeof t?.landing === "string" && t.landing.startsWith("/") ? new URL(t.landing, origin) : null;
  const utm = landing?.searchParams.get("utm_source")?.trim();
  const host = referrer && !ours ? referrer.host : "";
  if (host) return { source: "elsewhere", detail: (utm ? `${siteName(host)} (${utm})` : siteName(host)).slice(0, 200) };
  if (utm) return { source: "elsewhere", detail: utm.slice(0, 200) };
  return { source: "direct" };
}

/** One line for an enquiry: "Searched “tea ceremony”", "From Instagram", "Browsed the directory: Photography & Film". */
export function sourceLine(source?: Source, detail?: string) {
  if (!source) return undefined;
  if (source === "search" && detail) return `Searched “${detail}”`;
  if (source === "directory" && detail) return `Browsed the directory: ${detail}`;
  if (source === "elsewhere" && detail) return `From ${detail}`;
  return SOURCES[source];
}
