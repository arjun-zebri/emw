"use client";

import clsx from "clsx";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { day } from "@/lib/admin/format";
import { useSitePages } from "@/lib/admin/pages";
import { hasContent, PAGE_SLUGS, PAGES } from "@/lib/pages/pages";
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
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-6 w-2/5" />
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
                <li key={page.slug} className={clsx("flex items-center gap-4 sm:gap-6", i > 0 && "border-t border-ink/[0.06]")}>
                  <Link href={`/admin/pages/${page.slug}`} className="group flex min-w-0 flex-1 items-center gap-4 py-5 pl-5 transition-colors hover:bg-paper/70 sm:gap-6 sm:pl-6">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[1.375rem] leading-tight text-ink transition-opacity group-hover:opacity-70">{page.content.title || meta.name}</span>
                      <span className="mt-1 block text-[0.875rem] text-ink-soft">{live ? `Updated ${day(page.updatedAt, { year: true })}` : meta.empty}</span>
                    </span>
                    <Badge tone={live ? "good" : "neutral"}>{live ? "On the site" : "Not written yet"}</Badge>
                  </Link>
                  {/* Where it lives on the site, to open in a new tab. */}
                  <a
                    href={meta.path}
                    target="_blank"
                    rel="noreferrer"
                    className="hidden w-52 shrink-0 items-center gap-1.5 text-[0.875rem] text-ink-soft transition-colors hover:text-ink md:inline-flex"
                  >
                    {meta.path}
                    <Icon name="arrow-up-right" className="size-3.5" strokeWidth={1.5} />
                  </a>
                  <Link href={`/admin/pages/${page.slug}`} aria-hidden tabIndex={-1} className="pr-5 sm:pr-6">
                    <Icon name="chevron-right" className="size-4 shrink-0 text-ink-mute" strokeWidth={1.5} />
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
