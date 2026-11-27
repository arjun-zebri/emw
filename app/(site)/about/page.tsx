import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SitePageArticle, SitePageFrame } from "@/components/pages/SitePage";
import { getPage } from "@/lib/pages/live";
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
  const page = await getPage("about");
  // Until the team writes it in Admin → Pages, About is the section on the home page. The page shows
  // only what's written there: a link to Shared commitment is one the team puts in the text.
  if (!page) redirect("/#about");
  return <SitePageArticle page={page} />;
}
