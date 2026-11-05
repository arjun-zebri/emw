import type { MetadataRoute } from "next";
import { getListings } from "@/lib/listings";
import { absolute } from "@/lib/seo";

/** The public pages: home, the directory and every published vendor. Refreshes with the listings. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const vendors = await getListings();
  return [
    { url: absolute("/"), changeFrequency: "weekly", priority: 1 },
    { url: absolute("/vendors"), changeFrequency: "daily", priority: 0.9 },
    ...vendors.map((v) => ({
      url: absolute(`/vendors/${v.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.7,
      ...(v.cover && { images: [absolute(v.cover)] }),
    })),
  ];
}
