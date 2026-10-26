"use client";

import Link from "next/link";
import { useState } from "react";
import { Media } from "@/components/media/Media";
import type { Post, PostStatus } from "@/data/journal";
import { journalReads, sum, traffic } from "@/lib/admin/analytics";
import { day, num } from "@/lib/admin/format";
import { useAdmin } from "@/lib/admin/store";
import { Badge, Btn, Empty, PageHeader, Panel, Tabs, type Tone } from "../ui";

type Filter = "all" | PostStatus;

export const postStatus: Record<PostStatus, { label: string; tone: Tone }> = {
  published: { label: "Published", tone: "good" },
  draft: { label: "Draft", tone: "neutral" },
  scheduled: { label: "Scheduled", tone: "warn" },
};

/** Reads over the last 30 days, from the post's share of site visits. */
function reads(post: Post) {
  if (post.status !== "published") return null;
  const share = journalReads[post.slug] ?? 0.012;
  return Math.round(sum(traffic("visits", "day")).value * share);
}

/** Newest first: scheduled and drafts by their date, then published. */
const order = (a: Post, b: Post) => b.date.localeCompare(a.date);

export function JournalList() {
  const { posts } = useAdmin();
  const [filter, setFilter] = useState<Filter>("all");
  const count = (s: PostStatus) => posts.filter((p) => p.status === s).length;
  const shown = posts.filter((p) => filter === "all" || p.status === filter).sort(order);

  return (
    <>
      <PageHeader
        title="Journal"
        description="Real weddings, culture and planning. The three newest published posts appear on the home page."
        actions={
          <Btn variant="primary" icon="pen" href="/admin/journal/new">
            Write a post
          </Btn>
        }
      />

      <Tabs
        className="mb-6"
        value={filter}
        onChange={setFilter}
        tabs={[
          { id: "all", label: "All", count: posts.length },
          { id: "published", label: "Published", count: count("published") },
          { id: "draft", label: "Drafts", count: count("draft") },
          { id: "scheduled", label: "Scheduled", count: count("scheduled") },
        ]}
      />

      <Panel flush>
        {shown.length === 0 ? (
          <Empty title="Nothing here yet" action={<Btn href="/admin/journal/new">Write a post</Btn>} />
        ) : (
          <ul>
            {shown.map((post, i) => {
              const r = reads(post);
              return (
                <li key={post.id} className={i ? "border-t border-ink/[0.06]" : undefined}>
                  <Link href={`/admin/journal/${post.id}`} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-paper/70 sm:gap-5 sm:px-6">
                    <span className="block w-12 shrink-0 overflow-hidden sm:w-14">
                      <Media src={post.cover.src} alt="" brief="" quiet sizes="56px" className="aspect-[4/5] w-full" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="t-title block truncate text-[1.1875rem] transition-opacity group-hover:opacity-70">{post.title || "Untitled"}</span>
                      <span className="mt-1 block truncate text-[0.75rem] text-ink-mute">
                        {post.category} · {post.author}
                      </span>
                    </span>
                    <span className="hidden w-28 shrink-0 md:block">
                      <Badge tone={postStatus[post.status].tone}>{postStatus[post.status].label}</Badge>
                    </span>
                    <span className="hidden w-32 shrink-0 text-[0.8125rem] text-ink-soft sm:block">
                      {post.status === "published" ? day(post.date) : post.status === "scheduled" ? `Publishes ${day(post.date)}` : `Edited ${day(post.updated)}`}
                    </span>
                    <span className="w-20 shrink-0 text-right">
                      {r !== null ? (
                        <>
                          <span className="block text-[0.875rem] font-medium tabular-nums">{num(r)}</span>
                          <span className="block text-[0.6875rem] text-ink-mute">reads, 30 days</span>
                        </>
                      ) : (
                        <span className="md:hidden">
                          <Badge tone={postStatus[post.status].tone}>{postStatus[post.status].label}</Badge>
                        </span>
                      )}
                    </span>
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
