import type { Metadata } from "next";
import { LegalPage, legalMeta } from "@/components/legal/LegalPage";
import { SitePageArticle, SitePageFrame } from "@/components/pages/SitePage";
import { termsAndConditions } from "@/data/legal";
import { getPage } from "@/lib/pages/live";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("terms-and-conditions");
  return page
    ? pageMeta({ title: page.title || termsAndConditions.title, description: page.description || termsAndConditions.description, path: "/terms-and-conditions" })
    : legalMeta(termsAndConditions, "/terms-and-conditions");
}

export default async function TermsPage() {
  const page = await getPage("terms-and-conditions");
  // The team's own terms once they're written in Admin → Pages; until then, the placeholder.
  if (!page) return <LegalPage page={termsAndConditions} />;
  return (
    <SitePageFrame>
      <SitePageArticle page={page} />
    </SitePageFrame>
  );
}
