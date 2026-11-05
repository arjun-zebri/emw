import type { Metadata } from "next";
import { siteImages } from "@/data/images";
import { states } from "@/data/taxonomy";
import type { Vendor } from "@/data/types";
import { SITE } from "./config";
import { photoSrcSet, variantPath } from "./supabase/storage";
import { locationLabel } from "./vendors";

/*
 * What search engines see: titles, share cards, canonical links and structured data. Every URL
 * points at eastmeetswed.com whichever deployment serves it, and only the production deployment
 * may be indexed, so staging never turns up in search.
 */

export const indexable = process.env.VERCEL_ENV === "production";

/** Pages that are never for search: the portals, sign-in, the application form, the design system. */
export const privatePaths = ["/admin", "/account", "/login", "/list-your-business/apply", "/design-system"];

export const absolute = (path: string) => new URL(path, SITE.url).toString();

/** Canonical link, Open Graph and X card for one public page. Open Graph replaces the layout's rather than merging, so it's built whole here. */
export function pageMeta({ title, description, path, image }: { title?: string; description: string; path: string; image?: string }): Metadata {
  // Vendor photos have a 1200px copy beside the original, the size share cards are drawn at.
  const src = image ?? siteImages.cover.src!;
  const images = [absolute(photoSrcSet(src) ? variantPath(src, 1200) : src)];
  const shareTitle = title ? `${title} · ${SITE.name}` : SITE.name;
  return {
    ...(title && { title }),
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", locale: "en_AU", siteName: SITE.name, url: path, title: shareTitle, description, images },
    twitter: { card: "summary_large_image", title: shareTitle, description, images },
  };
}

/** pageMeta without the canonical and Open Graph URL, for the root layout's fallback. */
export function withoutUrl({ alternates, openGraph, ...rest }: Metadata): Metadata {
  void alternates;
  return { ...rest, openGraph: { ...openGraph, url: undefined } };
}

export function vendorMeta(vendor: Vendor): Metadata {
  return pageMeta({
    title: `${vendor.name} · ${vendor.discipline}`,
    description: `${vendor.discipline}, ${locationLabel(vendor)}. ${vendor.lede}`,
    path: `/vendors/${vendor.slug}`,
    image: vendor.cover,
  });
}

/** Serialised for a <script type="application/ld+json">; `<` is escaped so vendor copy can't close the tag. */
export const ldJson = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c");

export const siteLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${SITE.url}/#organization`, name: SITE.name, url: SITE.url, description: SITE.description },
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      name: SITE.name,
      url: SITE.url,
      inLanguage: "en-AU",
      publisher: { "@id": `${SITE.url}/#organization` },
    },
  ],
};

/**
 * A vendor as a local business, from what their listing already shows: name, one line, photos,
 * where they're based and work, languages, and their own website and socials. Email and phone
 * stay out; couples reach vendors through the enquiry form.
 */
export function vendorLd(vendor: Vendor) {
  const url = absolute(`/vendors/${vendor.slug}`);
  const area = vendor.serviceArea ?? [];
  const sameAs = [vendor.contact?.website, vendor.socials?.instagram, vendor.socials?.facebook, vendor.socials?.youtube].filter(Boolean);
  const images = [vendor.cover, ...(vendor.gallery ?? [])].filter((src): src is string => !!src).map(absolute);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": `${url}#business`,
        name: vendor.name,
        url,
        description: vendor.lede,
        ...(images.length && { image: images }),
        ...(vendor.based && { address: { "@type": "PostalAddress", addressLocality: vendor.based, addressCountry: "AU" } }),
        areaServed:
          area.length >= 8 ? { "@type": "Country", name: "Australia" } : area.map((s) => ({ "@type": "State", name: states[s] })),
        ...(vendor.languages?.length && { knowsLanguage: vendor.languages }),
        ...(sameAs.length && { sameAs }),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
          { "@type": "ListItem", position: 2, name: "Vendors", item: absolute("/vendors") },
          { "@type": "ListItem", position: 3, name: vendor.name, item: url },
        ],
      },
    ],
  };
}
