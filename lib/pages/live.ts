import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { type Block, describe, photoUrl, readBody } from "@/lib/journal/blocks";
import type { Database } from "@/lib/supabase/database.types";
import { hasContent, isPageSlug, type PageSlug } from "./pages";

/*
 * The site pages as visitors read them: About, Shared commitment, the Privacy policy. One cached
 * query, tagged "pages", which saving in Admin → Pages drops (refreshPages in ./actions.ts). Only
 * pages with something in their body come back.
 *
 * If the table can't be read (before its migration has run, or in a database hiccup) the site
 * carries on as if no page had been written, and tries again within a minute, so the footer and
 * the header never break over it.
 */

export const PAGES_TAG = "pages";

export type LivePage = {
  slug: PageSlug;
  title: string;
  standfirst: string;
  cover?: { src: string; alt: string; w?: number; h?: number };
  body: Block[];
  description: string;
  updatedAt: string;
};

async function load(): Promise<Partial<Record<PageSlug, LivePage>>> {
  "use cache";
  cacheTag(PAGES_TAG);

  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.from("site_pages").select("*");
  if (error) {
    cacheLife({ stale: 30, revalidate: 60, expire: 300 });
    return {};
  }
  // Publishing refreshes at once; anything written another way shows within the hour.
  cacheLife("hours");

  const pages: Partial<Record<PageSlug, LivePage>> = {};
  for (const p of data) {
    const body = readBody(p.body);
    if (!isPageSlug(p.slug) || !hasContent(body)) continue;
    pages[p.slug] = {
      slug: p.slug,
      title: p.title,
      standfirst: p.standfirst,
      cover: p.cover_path
        ? { src: photoUrl(p.cover_path), alt: p.cover_alt, ...(p.cover_width && p.cover_height ? { w: p.cover_width, h: p.cover_height } : {}) }
        : undefined,
      body,
      description: describe(p.description, p.standfirst, body),
      updatedAt: p.updated_at,
    };
  }
  return pages;
}

/** A page, if it's been written. */
export async function getPage(slug: PageSlug) {
  return (await load())[slug];
}

/** Which pages are on the site. */
export async function livePages() {
  return Object.keys(await load()) as PageSlug[];
}
