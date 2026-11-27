import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SitePageArticle, SitePageFrame } from "@/components/pages/SitePage";
import { getPage } from "@/lib/pages/live";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("shared-commitment");
  return page ? pageMeta({ title: page.title || "Our shared commitment", description: page.description, path: "/shared-commitment", image: page.cover?.src }) : {};
}

export default function SharedCommitmentPage() {
  return (
    <SitePageFrame>
      <SharedCommitment />
    </SitePageFrame>
  );
}

async function SharedCommitment() {
  const page = await getPage("shared-commitment");
  // Not written yet in Admin → Pages, so not on the site.
  if (!page) notFound();
  return <SitePageArticle page={page} />;
}
