import type { Metadata } from "next";
import { LegalPage, legalMeta } from "@/components/legal/LegalPage";
import { SitePageArticle, SitePageFrame } from "@/components/pages/SitePage";
import { privacyPolicy } from "@/data/legal";
import { getPage } from "@/lib/pages/live";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("privacy-policy");
  return page
    ? pageMeta({ title: page.title || privacyPolicy.title, description: page.description || privacyPolicy.description, path: "/privacy-policy" })
    : legalMeta(privacyPolicy, "/privacy-policy");
}

export default async function PrivacyPolicyPage() {
  const page = await getPage("privacy-policy");
  // The team's own policy once it's written in Admin → Pages; until then, the old site's text.
  if (!page) return <LegalPage page={privacyPolicy} />;
  return (
    <SitePageFrame>
      <SitePageArticle page={page} />
    </SitePageFrame>
  );
}
