import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { areas, languages, otherLanguagesOf, serviceLabels } from "@/data/taxonomy";
import type { AreaCode, Language, Service, Vendor } from "@/data/types";
import type { Database } from "./supabase/database.types";
import { imageUrl } from "./supabase/storage";

/*
 * The published listings, for the public pages. Read with the publishable key and no session, so
 * row level security returns only published vendors and their photos, exactly what a visitor may
 * see. One cached query serves every page; it is tagged "vendors" so an approval or an edit can
 * refresh it at once (refreshListings in lib/listings-actions.ts), and expires within the hour
 * regardless, so a change made from a script still shows up.
 */

export const LISTINGS_TAG = "vendors";

const known = <T extends string>(values: string[], map: Record<T, unknown>) => values.filter((v): v is T => v in map);
const orUndefined = (s: string | null) => s?.trim() || undefined;

async function load(): Promise<Vendor[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(LISTINGS_TAG);

  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db
    .from("vendors")
    .select("*, vendor_photos(path, width, height, position)")
    .eq("status", "published")
    .order("name");
  // Fail loudly rather than render an empty directory: a cached empty list would hide every vendor.
  if (error) throw new Error(`Couldn't load the listings: ${error.message}`);

  return data.map((v) => {
    const photos = [...v.vendor_photos].sort((a, b) => a.position - b.position);
    const urls = photos.map((p) => imageUrl("vendor-photos", p.path));
    const ratios = Object.fromEntries(
      photos.flatMap((p, i) => (p.width && p.height ? [[urls[i], Math.round((p.width / p.height) * 1000) / 1000]] : [])),
    );
    const contact = { email: orUndefined(v.email), phone: orUndefined(v.phone), website: orUndefined(v.website) };
    const socials = { instagram: orUndefined(v.instagram), facebook: orUndefined(v.facebook), youtube: orUndefined(v.youtube) };
    return {
      slug: v.slug,
      legacySlug: v.legacy_slug ?? undefined,
      name: v.name,
      person: orUndefined(v.person),
      discipline: v.discipline,
      // Services and areas outside data/taxonomy.ts are dropped here rather than breaking a page.
      services: known<Service>(v.services, serviceLabels),
      based: orUndefined(v.based),
      serviceArea: known<AreaCode>(v.service_area, areas),
      travels: orUndefined(v.travels),
      languages: known<Language>(v.languages, languages),
      // Languages we don't list are kept as the vendor wrote them, and found under "Other".
      otherLanguages: otherLanguagesOf(v.languages),
      lede: v.lede,
      quote: orUndefined(v.quote),
      story: v.story,
      signoff: orUndefined(v.signoff),
      contact,
      socials,
      featured: v.featured,
      largeTile: v.large_tile,
      cover: urls[0],
      gallery: urls.slice(1),
      ratios,
    } satisfies Vendor;
  });
}

/** Every published vendor, A to Z. */
export const getListings = load;

export async function getListing(slug: string): Promise<Vendor | undefined> {
  return (await load()).find((v) => v.slug === slug);
}
