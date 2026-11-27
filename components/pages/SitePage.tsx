import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icons/Icon";
import { Article } from "@/components/journal/Article";
import { PostSkeleton } from "@/components/journal/Skeletons";
import { PageTransition } from "@/components/motion/PageTransition";
import type { LivePage } from "@/lib/pages/live";

/** A page the team writes in Admin → Pages, set as a journal post is, without the post's line of date and reading time. */
export function SitePageFrame({ children }: { children: React.ReactNode }) {
  return (
    <PageTransition>
      <div className="pt-[var(--header-h)] pb-[clamp(6rem,12vw,10rem)]">
        <Suspense fallback={<PostSkeleton />}>{children}</Suspense>
      </div>
    </PageTransition>
  );
}

export function SitePageArticle({ page, more }: { page: LivePage; more?: React.ReactNode }) {
  return (
    <Article
      plain
      post={{ title: page.title, standfirst: page.standfirst, category: "", body: page.body, author: "", minutes: 0 }}
      vendors={[]}
      more={more}
    />
  );
}

/** One line at the foot of a page, leading on to another, in the article's column. */
export function NextPage({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <div className="shell mt-[clamp(4rem,7vw,6rem)]">
      <div className="mx-auto w-full max-w-[42rem] border-t hairline">
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
