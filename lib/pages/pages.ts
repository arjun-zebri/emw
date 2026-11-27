import { type Block, bodyText } from "@/lib/journal/blocks";

/*
 * The site's own pages the team writes in Admin → Pages (table site_pages). Shared by the public
 * pages and the admin, so nothing here touches the database.
 */

export const PAGE_SLUGS = ["about", "shared-commitment", "privacy-policy", "terms-and-conditions"] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

export const isPageSlug = (s: string): s is PageSlug => (PAGE_SLUGS as readonly string[]).includes(s);

/** Where each page lives on the site, and what it's called in the admin. */
export const PAGES: Record<PageSlug, { path: string; name: string; empty: string }> = {
  about: { path: "/about", name: "About", empty: "Until it has words, “About” goes to the About section of the home page." },
  "shared-commitment": { path: "/shared-commitment", name: "Shared commitment", empty: "Until it has words, it isn’t linked from the site." },
  "privacy-policy": { path: "/privacy-policy", name: "Privacy policy", empty: "Until it has words, the site shows the old site’s privacy text." },
  "terms-and-conditions": { path: "/terms-and-conditions", name: "Terms and conditions", empty: "Until it has words, the site shows a short placeholder." },
};

/** A page is on the site once its body has words or a photo. */
export const hasContent = (body: Block[]) => body.some((b) => b.type === "img") || bodyText(body).trim().length > 0;
