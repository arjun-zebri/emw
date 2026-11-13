import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/journal/posts";
import { getListings } from "@/lib/listings";
import { absolute } from "@/lib/seo";

/** The public pages: home, the directory, every published vendor, the journal and its posts. Refreshes with the listings and the journal. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [vendors, posts] = await Promise.all([getListings(), getPosts()]);
  return [
    { url: absolute("/"), changeFrequency: "weekly", priority: 1 },
    { url: absolute("/vendors"), changeFrequency: "daily", priority: 0.9 },
    ...vendors.map((v) => ({
      url: absolute(`/vendors/${v.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.7,
      ...(v.cover && { images: [absolute(v.cover)] }),
    })),
    ...(posts.length ? [{ url: absolute("/journal"), lastModified: posts[0].publishedAt, changeFrequency: "weekly" as const, priority: 0.6 }] : []),
    ...posts.map((p) => ({
      url: absolute(`/journal/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
      ...(p.cover && { images: [absolute(p.cover.src)] }),
    })),
  ];
}
