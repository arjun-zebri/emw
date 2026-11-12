import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import type { Database } from "@/lib/supabase/database.types";
import { imageUrl } from "@/lib/supabase/storage";
import { CATEGORIES, type Block, type Category, describe, photoUrl, readBody, bodyText, readingMinutes, wordCount } from "./blocks";

/*
 * The live journal posts, for the public blog. Read with the publishable key and no session, so
 * row level security returns only what a visitor may see: published posts, and scheduled ones once
 * their time has passed. One cached query serves every page; it is tagged "journal" so publishing
 * from the admin refreshes it at once (refreshJournal in ./actions.ts), and it refreshes itself
 * when the next scheduled post is due, or within the hour regardless.
 */

export const JOURNAL_TAG = "journal";

export type Credit = { slug: string; name: string; discipline: string; cover?: string };

export type LivePost = {
  id: string;
  slug: string;
  oldSlugs: string[];
  title: string;
  standfirst: string;
  category: Category;
  cover?: { src: string; alt: string; w?: number; h?: number };
  body: Block[];
  description: string;
  author: string;
  publishedAt: string;
  updatedAt: string;
  minutes: number;
  vendors: Credit[];
};

const HOUR = 3600;

async function load(): Promise<LivePost[]> {
  "use cache";
  cacheTag(JOURNAL_TAG);

  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [{ data, error }, next] = await Promise.all([
    db
      .from("posts")
      .select("*, post_vendors(position, vendors(slug, name, discipline, status, vendor_photos(path, position)))")
      .order("published_at", { ascending: false }),
    db.rpc("next_post_at"),
  ]);
  // Fail loudly rather than cache an empty blog.
  if (error) throw new Error(`Couldn't load the journal: ${error.message}`);

  // Come back when the next scheduled post goes live, so it appears on time.
  const due = next.data ? Math.ceil((Date.parse(next.data) - Date.now()) / 1000) : HOUR;
  const revalidate = Math.min(HOUR, Math.max(30, due));
  cacheLife({ stale: 30, revalidate, expire: Math.max(revalidate * 2, HOUR * 24) });

  return data.map((p) => {
    const body = readBody(p.body);
    const credits = [...p.post_vendors]
      .sort((a, b) => a.position - b.position)
      .flatMap(({ vendors: v }): Credit[] => {
        if (!v || v.status !== "published") return [];
        const photo = [...v.vendor_photos].sort((a, b) => a.position - b.position)[0];
        return [{ slug: v.slug, name: v.name, discipline: v.discipline, cover: photo ? imageUrl("vendor-photos", photo.path) : undefined }];
      });
    return {
      id: p.id,
      slug: p.slug,
      oldSlugs: p.old_slugs,
      title: p.title,
      standfirst: p.standfirst,
      category: (CATEGORIES as readonly string[]).includes(p.category) ? (p.category as Category) : "Culture",
      cover: p.cover_path
        ? { src: photoUrl(p.cover_path), alt: p.cover_alt, ...(p.cover_width && p.cover_height ? { w: p.cover_width, h: p.cover_height } : {}) }
        : undefined,
      body,
      description: describe(p.description, p.standfirst, body),
      author: p.author,
      publishedAt: p.published_at!,
      updatedAt: p.updated_at,
      minutes: readingMinutes(wordCount(bodyText(body))),
      vendors: credits,
    } satisfies LivePost;
  });
}

/** Every live post, newest first. */
export const getPosts = load;

/** A post by its address, or by an address it had before (`moved` then says where it lives now). */
export async function getPost(slug: string): Promise<{ post: LivePost; moved: boolean } | undefined> {
  const posts = await load();
  const post = posts.find((p) => p.slug === slug);
  if (post) return { post, moved: false };
  const old = posts.find((p) => p.oldSlugs.includes(slug));
  return old ? { post: old, moved: true } : undefined;
}

/** Up to `n` other posts to read next: the same category first, then the newest. */
export function morePosts(posts: LivePost[], post: LivePost, n = 3) {
  const others = posts.filter((p) => p.id !== post.id);
  return [...others.filter((p) => p.category === post.category), ...others.filter((p) => p.category !== post.category)].slice(0, n);
}
