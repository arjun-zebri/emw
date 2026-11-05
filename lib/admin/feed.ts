import type { IconName } from "@/components/icons/Icon";
import type { Review, Submission } from "./people";

/*
 * The owner's notification feed, built from the same data as the approvals queue, so the bell,
 * the overview's "waiting on you" list and Approvals always agree.
 */

export type FeedItem = {
  id: string;
  icon: IconName;
  tone: "neutral" | "warn" | "bad" | "good";
  title: string;
  detail?: string;
  at: string;
  href: string;
};

/** How many drafts wait in Supabase (useQueue's counts), or null before they've loaded. */
export type Waiting = { ready: number; missing: number } | null;

/*
 * Approvals waiting on the team. Vendors are the real drafts in Supabase. Real Weddings and reviews
 * have no source yet (couples can't send them until the site is live), so they're empty.
 */
export function pending(waiting: Waiting) {
  return { vendors: waiting ? waiting.ready + waiting.missing : 0, waiting, submissions: [] as Submission[], reviews: [] as Review[] };
}

export function pendingCount(waiting: Waiting) {
  const p = pending(waiting);
  return p.vendors + p.submissions.length + p.reviews.length;
}

export function feed(waiting: Waiting): FeedItem[] {
  const p = pending(waiting);
  if (!p.waiting || !p.vendors) return [];
  // One line for the whole queue: an import can add a hundred drafts at once.
  return [
    {
      id: `drafts-${p.vendors}`,
      icon: "store",
      tone: "neutral",
      title: p.vendors === 1 ? "1 business waiting for approval" : `${p.vendors} businesses waiting for approval`,
      detail: `${p.waiting.ready} ready, ${p.waiting.missing} missing data`,
      at: new Date().toISOString(),
      href: "/admin/approvals",
    },
  ];
}
