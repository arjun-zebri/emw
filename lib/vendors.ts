import { areas, australiaWide, craftById, craftOf, crafts, languages as languageNames, serviceLabels } from "@/data/taxonomy";
import type { AreaCode, Craft, CraftId, Language, Service, Vendor } from "@/data/types";

/*
 * Helpers for a list of vendors, safe on the server and in the browser. The public pages get their
 * list from lib/listings.ts (Supabase); the admin still uses the snapshot in lib/static-vendors.ts.
 */

export function primaryCraft(vendor: Vendor): Craft {
  return craftOf(vendor.services[0]);
}

export function vendorCrafts(vendor: Vendor): CraftId[] {
  return [...new Set(vendor.services.map((s) => craftOf(s).id))];
}

export function locationLabel(vendor: Vendor): string {
  const area = vendor.serviceArea ?? [];
  if (australiaWide(area)) return vendor.based ? `${vendor.based} · Australia-wide` : "Australia-wide";
  const region = area.length === 1 ? areas[area[0]] : area.join(", ");
  if (vendor.based && vendor.based !== "Melbourne") return `${vendor.based}, Melbourne`;
  if (vendor.based) return region === "Victoria" || !region ? "Melbourne" : `Melbourne · ${region}`;
  return region || "Location on request";
}

export function craftCounts(vendors: Vendor[]): Record<CraftId, number> {
  const counts = Object.fromEntries(crafts.map((c) => [c.id, 0])) as Record<CraftId, number>;
  for (const v of vendors) for (const id of vendorCrafts(v)) counts[id]++;
  return counts;
}

/** Crafts with at least one listed vendor. Public pages show only these, so no category leads nowhere. */
export function listedCrafts(vendors: Vendor[]) {
  const counts = craftCounts(vendors);
  return crafts.filter((c) => counts[c.id] > 0);
}

/** A language couples can filter by: one we list, or "Other" for any we don't. */
export type LanguageFilter = Language | "Other";

/**
 * Languages couples can filter by, most vendors first. English is left out: nearly every vendor
 * speaks it, so choosing it filters almost nothing and only hides vendors by accident. "Other" comes
 * last and gathers the languages we don't list, like French.
 */
export function languageCounts(vendors: Vendor[]): [LanguageFilter, number][] {
  const counts = new Map<Language, number>();
  for (const v of vendors) for (const l of v.languages ?? []) if (l !== "English") counts.set(l, (counts.get(l) ?? 0) + 1);
  const other = vendors.filter((v) => v.otherLanguages?.length).length;
  return [...[...counts.entries()].sort((a, b) => b[1] - a[1]), ...(other ? [["Other", other] as [LanguageFilter, number]] : [])];
}

export function serviceCounts(vendors: Vendor[]): [Service, number][] {
  const counts = new Map<Service, number>();
  for (const v of vendors) for (const s of v.services) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * The location filter: Australia and the overseas regions side by side, and once Australia is on, its
 * states to narrow it. "AUS" is a filter value only; listings store states.
 */
export type AreaFilter = AreaCode | "AUS";

export const areaFilterLabel = (a: AreaFilter, short = false) => (a === "AUS" ? "Australia" : short && !isOverseas(a) ? a : areas[a]);

/** Australia, then every overseas region even when it has none yet, then the states with vendors, most first. */
export function areaCounts(vendors: Vendor[]): [AreaFilter, number][] {
  const counts = new Map<AreaCode, number>();
  for (const v of vendors) for (const s of v.serviceArea ?? []) counts.set(s, (counts.get(s) ?? 0) + 1);
  const home = vendors.filter((v) => v.serviceArea?.some((a) => !isOverseas(a))).length;
  const states = [...counts.entries()].filter(([a]) => !isOverseas(a)).sort((a, b) => b[1] - a[1]);
  return [["AUS", home], ...(Object.keys(areas) as AreaCode[]).filter(isOverseas).map((a): [AreaFilter, number] => [a, counts.get(a) ?? 0]), ...states];
}

export const isOverseas = (a: AreaFilter) => a === "CAN" || a === "USA" || a === "EUR" || a === "ASIA";
export const isState = (a: AreaFilter) => a !== "AUS" && !isOverseas(a);

/** Turning Australia off clears its states; choosing a state keeps Australia on. */
export function toggleArea(list: AreaFilter[], value: AreaFilter): AreaFilter[] {
  if (list.includes(value)) return value === "AUS" ? list.filter((a) => !isState(a) && a !== "AUS") : list.filter((a) => a !== value);
  return isState(value) && !list.includes("AUS") ? [...list, "AUS", value] : [...list, value];
}

/** Any chosen overseas region, or Australia (narrowed to the chosen states, if any). */
export function matchesArea(area: readonly AreaCode[], chosen: AreaFilter[]) {
  if (!chosen.length) return true;
  const states = chosen.filter(isState);
  const home = (chosen.includes("AUS") || states.length > 0) && (states.length ? states.some((s) => area.includes(s as AreaCode)) : area.some((a) => !isOverseas(a)));
  return home || chosen.some((a) => isOverseas(a) && area.includes(a as AreaCode));
}

/** Lowercase with accents dropped, so "Nguyen" finds "Nguyễn" and "cafe" finds "café". */
const fold = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

const searchText = new WeakMap<Vendor, string>();

/** Everything a couple might type to find a vendor: who they are, what they do, where, in which languages, and their own words. */
function haystack(v: Vendor) {
  let text = searchText.get(v);
  if (text === undefined) {
    const tongues = (v.languages ?? []).flatMap((l) => [l, languageNames[l].native]);
    text = fold(
      [
        v.name,
        v.person,
        v.discipline,
        ...v.services.flatMap((s) => [s, serviceLabels[s], craftOf(s).name]),
        ...tongues,
        ...(v.otherLanguages ?? []),
        v.based,
        ...(v.serviceArea ?? []).map((a) => areas[a]),
        v.lede,
        v.quote,
        ...v.story,
      ]
        .filter(Boolean)
        .join(" \n "),
    );
    searchText.set(v, text);
  }
  return text;
}

/** Every word of the search appears somewhere in the vendor's listing. */
export function matchesSearch(v: Vendor, q: string) {
  const words = fold(q)
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean);
  if (!words.length) return true;
  const text = haystack(v);
  return words.every((w) => text.includes(w));
}

export type VendorFilters = {
  craft?: CraftId;
  languages: LanguageFilter[];
  areas: AreaFilter[];
  services: Service[];
  /** Words typed into the search, as typed. */
  q: string;
  sort: "featured" | "az";
};

export function parseFilters(params: URLSearchParams): VendorFilters {
  const list = <T extends string>(key: string) => (params.get(key)?.split(",").filter(Boolean) ?? []) as T[];
  const craft = params.get("craft") as CraftId | null;
  return {
    craft: craft && craft in craftById ? craft : undefined,
    languages: list<LanguageFilter>("lang").filter((l) => l === "Other" || l in languageNames),
    areas: list<AreaFilter>("area").filter((a) => a === "AUS" || a in areas),
    services: list<Service>("service"),
    q: params.get("q") ?? "",
    sort: params.get("sort") === "az" ? "az" : "featured",
  };
}

export function filtersToParams(f: VendorFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.craft) p.set("craft", f.craft);
  if (f.languages.length) p.set("lang", f.languages.join(","));
  if (f.areas.length) p.set("area", f.areas.join(","));
  if (f.services.length) p.set("service", f.services.join(","));
  if (f.q.trim()) p.set("q", f.q);
  if (f.sort !== "featured") p.set("sort", f.sort);
  return p;
}

export function filterVendors(
  list: Vendor[],
  f: Omit<VendorFilters, "sort" | "q"> & {
    sort?: VendorFilters["sort"];
    q?: string;
  },
) {
  const result = list.filter(
    (v) =>
      (!f.craft || vendorCrafts(v).includes(f.craft)) &&
      (!f.languages.length || f.languages.some((l) => (l === "Other" ? !!v.otherLanguages?.length : v.languages?.includes(l)))) &&
      matchesArea(v.serviceArea ?? [], f.areas) &&
      (!f.services.length || f.services.some((s) => v.services.includes(s))) &&
      (!f.q || matchesSearch(v, f.q)),
  );
  if (f.sort === "az") return [...result].sort((a, b) => a.name.localeCompare(b.name));
  // Featured first, but vendors still waiting on photography always go last so the grid stays image-led.
  return [...result].sort((a, b) => Number(!!b.cover) - Number(!!a.cover) || Number(b.featured) - Number(a.featured));
}

/** Same craft first, then vendors who share a language other than English; photographed vendors before the rest. */
export function relatedVendors(vendors: Vendor[], vendor: Vendor, count = 3): Vendor[] {
  const craft = primaryCraft(vendor).id;
  const tongues = (vendor.languages ?? []).filter((l): l is Language => l !== "English");
  const score = (v: Vendor) =>
    (vendorCrafts(v).includes(craft) ? 4 : 0) + (v.languages?.some((l) => tongues.includes(l)) ? 2 : 0) + (v.cover ? 1 : 0);
  return vendors
    .filter((v) => v.slug !== vendor.slug)
    .map((v) => ({ v, s: score(v) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, count)
    .map(({ v }) => v);
}

/**
 * "@studio" from a link to an Instagram or Facebook profile, for the link's label. Nothing when the
 * link has no plain handle (a Facebook "profile.php?id=" link, say), so the label falls back to the
 * site's name.
 */
/** A YouTube channel's name from its link: @handle, /c/name or /user/name. Video and /channel/UC… links have none to show. */
export function youtubeChannel(url: string): string | undefined {
  try {
    const [first, second] = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).pathname.split("/").filter(Boolean).map(decodeURIComponent);
    if (first?.startsWith("@")) return first;
    if ((first === "c" || first === "user") && second) return second;
    return undefined;
  } catch {
    return undefined;
  }
}

export function socialHandle(url: string): string | undefined {
  try {
    const first = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).pathname.split("/").filter(Boolean)[0];
    if (!first || /\.php$/i.test(first) || ["pages", "people", "groups", "p", "reel"].includes(first.toLowerCase())) return undefined;
    return `@${decodeURIComponent(first)}`;
  } catch {
    return undefined;
  }
}
