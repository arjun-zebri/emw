import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NextPage, SitePageArticle, SitePageFrame } from "@/components/pages/SitePage";
import { getPage } from "@/lib/pages/live";
import { PAGES } from "@/lib/pages/pages";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("about");
  return pageMeta({ title: page?.title || "About", description: page?.description || "About East Meets Wed.", path: "/about", image: page?.cover?.src });
}

export default function AboutPage() {
  return (
    <SitePageFrame>
      <About />
    </SitePageFrame>
  );
}

async function About() {
  const [page, commitment] = await Promise.all([getPage("about"), getPage("shared-commitment")]);
  // Until the team writes it in Admin → Pages, About is the section on the home page.
  if (!page) redirect("/#about");
  return <SitePageArticle page={page} more={commitment && <NextPage href={PAGES["shared-commitment"].path}>{commitment.title || PAGES["shared-commitment"].name}</NextPage>} />;
}
