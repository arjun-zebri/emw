"use client";

import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { day } from "@/lib/admin/format";
import { useSitePages } from "@/lib/admin/pages";
import { photoUrl } from "@/lib/journal/blocks";
import { hasContent, PAGE_SLUGS, PAGES } from "@/lib/pages/pages";
import { thumbUrl } from "@/lib/supabase/storage";
import { Badge, Empty, PageHeader, Panel } from "../ui";

/** The site's own pages: About, Shared commitment, the Privacy policy. Each opens in the editor. */
export function PagesList() {
  const { status, pages, error } = useSitePages();

  return (
    <>
      <PageHeader title="Pages" description="The site’s own pages. Each one shows on the site once it has words, and changes go live when you publish them." />
      <Panel flush>
        {status === "loading" && !pages ? (
          <ul aria-busy="true">
            {PAGE_SLUGS.map((s, i) => (
              <li key={s} className={i ? "flex items-center gap-5 border-t border-ink/[0.06] px-5 py-5 sm:px-6" : "flex items-center gap-5 px-5 py-5 sm:px-6"}>
                <Skeleton className="aspect-[3/2] w-24 shrink-0 sm:w-36" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="mt-3 h-6 w-2/5" />
                  <Skeleton className="mt-2.5 h-4 w-3/5" />
                </div>
              </li>
            ))}
          </ul>
        ) : !pages?.length ? (
          <Empty title="The pages didn’t load">{error ?? "Their table isn’t in the database yet."}</Empty>
        ) : (
          <ul>
            {pages.map((page, i) => {
              const live = hasContent(page.content.body);
              const meta = PAGES[page.slug];
              return (
                <li key={page.slug} className={i ? "border-t border-ink/[0.06]" : undefined}>
                  <Link href={`/admin/pages/${page.slug}`} className="group flex items-center gap-4 px-5 py-5 transition-colors hover:bg-paper/70 sm:gap-6 sm:px-6">
                    <span className="block w-24 shrink-0 overflow-hidden bg-paper-soft sm:w-36">
                      {page.content.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element -- a thumbnail straight from Storage
                        <img src={thumbUrl(photoUrl(page.content.cover.src))} alt="" loading="lazy" decoding="async" className="aspect-[3/2] w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]" />
                      ) : (
                        <span className="flex aspect-[3/2] w-full items-center justify-center text-[0.75rem] text-ink-soft">No cover</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <Badge tone={live ? "good" : "neutral"}>{live ? "On the site" : "Not written yet"}</Badge>
                      <span className="mt-2 block truncate font-display text-[1.375rem] leading-tight text-ink transition-opacity group-hover:opacity-70">{page.content.title || meta.name}</span>
                      <span className="mt-1 block text-[0.875rem] text-ink-soft">{live ? meta.path : meta.empty}</span>
                    </span>
                    <span className="hidden w-44 shrink-0 text-[0.875rem] text-ink-soft md:block">{live ? `Updated ${day(page.updatedAt, { year: true })}` : ""}</span>
                    <Icon name="chevron-right" className="size-4 shrink-0 text-ink-mute transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
