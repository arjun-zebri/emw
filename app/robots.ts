import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config";
import { indexable, privatePaths } from "@/lib/seo";

/** Production lets search engines in, apart from the private pages. Staging and previews shut them out. */
export default function robots(): MetadataRoute.Robots {
  if (!indexable) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: privatePaths }, sitemap: `${SITE.url}/sitemap.xml` };
}
