import { craftById, craftOf, crafts, states } from "@/data/taxonomy";
import type { Craft, CraftId, Language, Service, StateCode, Vendor } from "@/data/types";
import { vendorPhotos } from "@/data/photos";
import { vendors as listings } from "@/data/vendors";

export const vendors: Vendor[] = listings.map((v) => ({ ...v, ...vendorPhotos[v.slug] }));

export function getVendor(slug: string): Vendor | undefined {
  return vendors.find((v) => v.slug === slug);
}

/** Issue-style number, e.g. "07". Stable across filters because it follows the source order. */
export function vendorNumber(vendor: Vendor): string {
  return String(vendors.indexOf(vendor) + 1).padStart(2, "0");
}

export function primaryCraft(vendor: Vendor): Craft {
  return craftOf(vendor.services[0]);
}

export function vendorCrafts(vendor: Vendor): CraftId[] {
  return [...new Set(vendor.services.map((s) => craftOf(s).id))];
}

export function locationLabel(vendor: Vendor): string {
  const area = vendor.serviceArea ?? [];
  if (area.length >= 8) return vendor.based ? `${vendor.based} · Australia-wide` : "Australia-wide";
  const region = area.length === 1 ? states[area[0]] : area.join(", ");
  if (vendor.based && vendor.based !== "Melbourne") return `${vendor.based}, Melbourne`;
  if (vendor.based) return region === "Victoria" || !region ? "Melbourne" : `Melbourne · ${region}`;
  return region || "Location on request";
}

export function craftCounts(): Record<CraftId, number> {
  const counts = Object.fromEntries(crafts.map((c) => [c.id, 0])) as Record<CraftId, number>;
  for (const v of vendors) for (const id of vendorCrafts(v)) counts[id]++;
  return counts;
}

export function languageCounts(): [Language, number][] {
  const counts = new Map<Language, number>();
  for (const v of vendors) for (const l of v.languages ?? []) counts.set(l, (counts.get(l) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function serviceCounts(): [Service, number][] {
  const counts = new Map<Service, number>();
  for (const v of vendors) for (const s of v.services) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function areaCounts(): [StateCode, number][] {
  const counts = new Map<StateCode, number>();
  for (const v of vendors) for (const s of v.serviceArea ?? []) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export type VendorFilters = {
  craft?: CraftId;
  languages: Language[];
  areas: StateCode[];
  services: Service[];
  sort: "featured" | "az";
};

export function parseFilters(params: URLSearchParams): VendorFilters {
  const list = <T extends string>(key: string) => (params.get(key)?.split(",").filter(Boolean) ?? []) as T[];
  const craft = params.get("craft") as CraftId | null;
  return {
    craft: craft && craft in craftById ? craft : undefined,
    languages: list<Language>("lang"),
    areas: list<StateCode>("area"),
    services: list<Service>("service"),
    sort: params.get("sort") === "az" ? "az" : "featured",
  };
}

export function filtersToParams(f: VendorFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.craft) p.set("craft", f.craft);
  if (f.languages.length) p.set("lang", f.languages.join(","));
  if (f.areas.length) p.set("area", f.areas.join(","));
  if (f.services.length) p.set("service", f.services.join(","));
  if (f.sort !== "featured") p.set("sort", f.sort);
  return p;
}

export function filterVendors(list: Vendor[], f: Omit<VendorFilters, "sort"> & { sort?: VendorFilters["sort"] }) {
  const result = list.filter(
    (v) =>
      (!f.craft || vendorCrafts(v).includes(f.craft)) &&
      (!f.languages.length || f.languages.some((l) => v.languages?.includes(l))) &&
      (!f.areas.length || f.areas.some((a) => v.serviceArea?.includes(a))) &&
      (!f.services.length || f.services.some((s) => v.services.includes(s))),
  );
  if (f.sort === "az") return [...result].sort((a, b) => a.name.localeCompare(b.name));
  // Featured first, but vendors still waiting on photography always go last so the grid stays image-led.
  return [...result].sort((a, b) => Number(!!b.cover) - Number(!!a.cover) || Number(b.featured) - Number(a.featured));
}

/** Same craft first, then vendors who share a language other than English; photographed vendors before the rest. */
export function relatedVendors(vendor: Vendor, count = 3): Vendor[] {
  const craft = primaryCraft(vendor).id;
  const tongues = (vendor.languages ?? []).filter((l): l is Language => l !== "English");
  const score = (v: Vendor) =>
    (vendorCrafts(v).includes(craft) ? 4 : 0) + (v.languages?.some((l) => tongues.includes(l)) ? 2 : 0) + (v.cover ? 1 : 0);
  return vendors
    .filter((v) => v !== vendor)
    .map((v) => ({ v, s: score(v) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, count)
    .map(({ v }) => v);
}

export function nextVendor(vendor: Vendor): Vendor {
  return vendors[(vendors.indexOf(vendor) + 1) % vendors.length];
}

export const featuredVendors = vendors.filter((v) => v.featured);
