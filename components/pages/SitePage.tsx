import { Suspense } from "react";
import { Article } from "@/components/journal/Article";
import { Skeleton, SkeletonLines } from "@/components/ui/Skeleton";
import { PageTransition } from "@/components/motion/PageTransition";
import type { LivePage } from "@/lib/pages/live";

/** A page the team writes in Admin → Pages, set as a journal post is, without the post's line of date and reading time. */
export function SitePageFrame({ children }: { children: React.ReactNode }) {
  return (
    <PageTransition>
      <div className="pt-[var(--header-h)] pb-[clamp(6rem,12vw,10rem)]">
        <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
      </div>
    </PageTransition>
  );
}

/** The page's shape while it loads: the title, then the words, full width. */
function PageSkeleton() {
  return (
    <div aria-busy="true" className="shell pt-[clamp(2rem,5vw,4.5rem)]">
      <Skeleton className="h-[clamp(2.5rem,5.2vw,5rem)] w-2/5" />
      <SkeletonLines lines={3} className="mt-[clamp(2.5rem,5vw,4rem)] max-w-[48rem] text-[1.375rem] leading-[1.6]" />
    </div>
  );
}

export function SitePageArticle({ page }: { page: LivePage }) {
  return (
    <Article
      plain
      post={{ title: page.title, standfirst: "", category: "", body: page.body, author: "", minutes: 0 }}
      vendors={[]}
    />
  );
}
