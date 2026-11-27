import type { Metadata } from "next";
import { Article } from "@/components/journal/Article";
import { SitePageFrame } from "@/components/pages/SitePage";
import type { LegalPage as Page } from "@/data/legal";
import type { Block } from "@/lib/journal/blocks";
import { pageMeta } from "@/lib/seo";

/** Kept out of search until the client's own text replaces the placeholder. */
export function legalMeta(page: Page, path: string): Metadata {
  return { ...pageMeta({ title: page.title, description: page.description, path }), ...(!page.final && { robots: { index: false } }) };
}

/**
 * The old site's text, until the team writes the page in Admin → Pages: set exactly as a written
 * page is (components/pages/SitePage.tsx), each section's heading on the left and its words on the right.
 */
export function LegalPage({ page }: { page: Page }) {
  let n = 0;
  const id = () => `legal-${n++}`;
  const body: Block[] = page.sections.length
    ? page.sections.flatMap((s): Block[] => [{ id: id(), type: "h", text: s.heading }, ...s.paragraphs.map((t): Block => ({ id: id(), type: "p", content: [{ text: t }] }))])
    : [{ id: id(), type: "p", content: [{ text: `Our ${page.title.toLowerCase()} will be published here soon.` }] }];
  return (
    <SitePageFrame>
      <Article plain post={{ title: page.title, standfirst: "", category: "", body, author: "", minutes: 0 }} vendors={[]} />
    </SitePageFrame>
  );
}
