import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icons/Icon";
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
      <div className="mt-[clamp(2.5rem,5vw,4rem)] lg:grid lg:grid-cols-12 lg:gap-x-[clamp(2rem,3vw,3.5rem)]">
        <SkeletonLines lines={5} className="max-w-[44rem] text-[1.0625rem] leading-[1.8] lg:col-span-7 lg:col-start-6" />
      </div>
    </div>
  );
}

export function SitePageArticle({ page, more }: { page: LivePage; more?: React.ReactNode }) {
  return (
    <Article
      plain
      post={{ title: page.title, standfirst: "", category: "", body: page.body, author: "", minutes: 0 }}
      vendors={[]}
      more={more}
    />
  );
}

/** One line at the foot of a page, leading on to another, in the article's column. */
export function NextPage({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    // In the page's right-hand column, under its words.
    <div className="shell mt-[clamp(4rem,7vw,6rem)] lg:grid lg:grid-cols-12 lg:gap-x-[clamp(2rem,3vw,3.5rem)]">
      <div className="w-full max-w-[44rem] border-t hairline lg:col-span-7 lg:col-start-6">
        <Link href={href} prefetch className="group flex items-center justify-between gap-5 py-5">
          <span className="t-title">{children}</span>
          <Icon
            name="arrow"
            className="size-4 shrink-0 text-ink-mute transition-[translate,color] duration-500 ease-out-expo group-hover:translate-x-1 group-hover:text-ink"
            strokeWidth={1.25}
          />
        </Link>
      </div>
    </div>
  );
}
