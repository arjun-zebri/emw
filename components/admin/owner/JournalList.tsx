"use client";

import clsx from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { day, num } from "@/lib/admin/format";
import { type ListedPost, type PostStatus, statusOf, useJournal } from "@/lib/admin/journal";
import { photoUrl } from "@/lib/journal/blocks";
import { thumbUrl } from "@/lib/supabase/storage";
import { Badge, Btn, Empty, PageHeader, Panel, Tabs, type Tone } from "../ui";

/*
 * Every post, newest change first: its cover, title and standfirst as couples will see them, where
 * it stands (live, a draft, or live with changes waiting), and how many people have read
 * it. The three newest live posts are the ones on the home page, and say so.
 */

type Filter = "all" | PostStatus;

export const postStatus: Record<PostStatus, { label: string; tone: Tone }> = {
  published: { label: "Live", tone: "good" },
  scheduled: { label: "Scheduled", tone: "warn" },
  draft: { label: "Draft", tone: "neutral" },
};

export function JournalList() {
  const { status, data, error } = useJournal();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const posts = useMemo(() => (data?.posts ?? []).map((p) => ({ ...p, status: statusOf(p) })), [data]);
  const home = useMemo(
    () =>
      new Set(
        posts
          .filter((p) => p.status === "published")
          .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
          .slice(0, 3)
          .map((p) => p.id),
      ),
    [posts],
  );
  const count = (s: PostStatus) => posts.filter((p) => p.status === s).length;
  const q = query.trim().toLowerCase();
  const shown = posts.filter((p) => (filter === "all" || p.status === filter) && (!q || `${p.title} ${p.standfirst} ${p.category} ${p.author}`.toLowerCase().includes(q)));

  return (
    <>
      <PageHeader
        title="Journal"
        description="The stories in the journal. The three newest live posts show on the home page."
        actions={
          <Btn variant="primary" icon="pen" href="/admin/journal/new">
            Write a post
          </Btn>
        }
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b hairline">
        <Tabs
          className="border-b-0"
          value={filter}
          onChange={setFilter}
          tabs={[
            { id: "all", label: "All", count: posts.length },
            { id: "published", label: "Live", count: count("published") },
            { id: "draft", label: "Drafts", count: count("draft") },
          ]}
        />
        <label className="relative mb-2 w-full sm:w-64">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-ink-mute" strokeWidth={1.5} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a post"
            aria-label="Find a post"
            className="h-9 w-full bg-transparent pl-7 text-[0.875rem] text-ink placeholder:text-ink-mute/60 focus:outline-none"
          />
        </label>
      </div>

      <Panel flush>
        {status === "loading" && !data ? (
          <ul aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className={clsx("flex items-center gap-5 px-5 py-5 sm:px-6", i && "border-t border-ink/[0.06]")}>
                <Skeleton className="aspect-[3/2] w-28 shrink-0 sm:w-36" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="mt-3 h-6 w-3/5" />
                  <Skeleton className="mt-2.5 h-4 w-4/5" />
                </div>
                <Skeleton className="hidden h-4 w-24 md:block" />
              </li>
            ))}
          </ul>
        ) : error && !data ? (
          <Empty title="The journal didn’t load">{error}</Empty>
        ) : shown.length === 0 ? (
          <Empty
            title={q ? `No post matches “${query.trim()}”` : filter === "all" ? "No posts yet" : `No ${postStatus[filter as PostStatus].label.toLowerCase()} posts`}
            action={!q && <Btn href="/admin/journal/new">Write a post</Btn>}
          />
        ) : (
          <ul>
            {shown.map((post, i) => (
              <li key={post.id} className={i ? "border-t border-ink/[0.06]" : undefined}>
                <Row post={post} onHome={home.has(post.id)} reads={data?.reads[post.slug]} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

function Row({ post, onHome, reads }: { post: ListedPost; onHome: boolean; reads?: { views: number; last30: number } }) {
  const s = postStatus[post.status];
  const when =
    post.status === "published" && post.publishedAt
      ? `Published ${day(post.publishedAt, { year: true })}`
      : post.status === "scheduled" && post.publishedAt
        ? `Goes live ${day(post.publishedAt, { weekday: true })}`
        : `Edited ${day(post.updatedAt)}`;

  return (
    <Link href={`/admin/journal/${post.id}`} className="group flex items-center gap-4 px-5 py-5 transition-colors hover:bg-paper/70 sm:gap-6 sm:px-6">
      <span className="block w-24 shrink-0 overflow-hidden bg-paper-soft sm:w-36">
        {post.cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- a thumbnail straight from Storage
          <img src={thumbUrl(photoUrl(post.cover.src))} alt="" loading="lazy" decoding="async" className="aspect-[3/2] w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]" />
        ) : (
          <span className="flex aspect-[3/2] w-full items-center justify-center text-[0.75rem] text-ink-soft">No cover yet</span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <Badge tone={s.tone}>{s.label}</Badge>
          {post.hasEdits && post.status !== "draft" && <Badge tone="warn">Unpublished changes</Badge>}
          {onHome && <span className="text-[0.8125rem] text-ink-soft">On the home page</span>}
        </span>
        <span className="mt-2 block truncate font-display text-[1.375rem] leading-tight text-ink transition-opacity group-hover:opacity-70">{post.title || "Untitled"}</span>
        <span className="mt-1 block truncate text-[0.875rem] text-ink-soft">
          {post.standfirst || `${post.category}${post.author && post.author !== "East Meets Wed" ? ` · ${post.author}` : ""}`}
        </span>
        <span className="mt-1.5 block text-[0.8125rem] text-ink-soft md:hidden">
          {post.category} · {when}
        </span>
      </span>

      <span className="hidden w-44 shrink-0 text-[0.875rem] md:block">
        <span className="block text-ink">{post.category}</span>
        <span className="mt-0.5 block text-ink-soft">{when}</span>
      </span>
      <span className="hidden w-28 shrink-0 text-right text-[0.875rem] lg:block">
        {post.status === "published" ? (
          <>
            <span className="block text-ink tabular-nums">{num(reads?.views ?? 0)} reads</span>
            <span className="mt-0.5 block text-ink-soft tabular-nums">{num(reads?.last30 ?? 0)} in 30 days</span>
          </>
        ) : (
          <span className="block text-ink-soft">{post.credits ? `${post.credits} vendor${post.credits === 1 ? "" : "s"}` : ""}</span>
        )}
      </span>
    </Link>
  );
}
