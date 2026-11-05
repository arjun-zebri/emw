import type { IconName } from "@/components/icons/Icon";
import { getVendor } from "@/lib/vendors";
import { uptime } from "./analytics";
import { billingSummary, price, tiers } from "./billing";
import { aud, day } from "./format";
import type { Review, Submission } from "./people";
import type { AdminState } from "./store";
import { daysUntil, hoursAgo } from "./time";

/*
 * The owner's notification feed, built from the same data as the dashboards, so the bell, the
 * overview's "needs you" list and the approvals queue always agree.
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

const vendorName = (slug: string) => getVendor(slug)?.name ?? slug;

/** How many drafts wait in Supabase (useQueue's counts), or null before they've loaded. */
export type Waiting = { ready: number; missing: number } | null;

/*
 * Approvals waiting on the team. Vendors are the real drafts in Supabase. Real Weddings and reviews
 * have no source yet (couples can't send them until the site is live), so they're empty rather
 * than sample data.
 */
export function pending(waiting: Waiting) {
  return { vendors: waiting ? waiting.ready + waiting.missing : 0, waiting, submissions: [] as Submission[], reviews: [] as Review[] };
}

export function pendingCount(waiting: Waiting) {
  const p = pending(waiting);
  return p.vendors + p.submissions.length + p.reviews.length;
}

export function feed(state: AdminState, waiting: Waiting): FeedItem[] {
  const p = pending(waiting);
  const b = billingSummary();
  const items: FeedItem[] = [
    // One line for the whole queue: an import can add a hundred drafts at once.
    ...(p.waiting && p.vendors
      ? [
          {
            id: `drafts-${p.vendors}`,
            icon: "store" as const,
            tone: "neutral" as const,
            title: p.vendors === 1 ? "1 business waiting for approval" : `${p.vendors} businesses waiting for approval`,
            detail: `${p.waiting.ready} ready, ${p.waiting.missing} missing data`,
            at: new Date().toISOString(),
            href: "/admin/approvals",
          },
        ]
      : []),
    ...p.submissions.map((s) => ({
      id: `rw-${s.id}`,
      icon: "image" as const,
      tone: "neutral" as const,
      title: `${s.couple} sent their Real Wedding`,
      detail: s.title,
      at: s.submitted,
      href: `/admin/approvals?tab=weddings&item=${s.id}`,
    })),
    ...p.reviews.map((r) => ({
      id: `rv-${r.id}`,
      icon: "star" as const,
      tone: "neutral" as const,
      title: `New review for ${vendorName(r.vendor)}`,
      detail: `${r.couple}, ${r.rating} of 5`,
      at: r.submitted,
      href: `/admin/approvals?tab=reviews&item=${r.id}`,
    })),
    ...b.failed
      .filter((s) => !state.retried[s.id])
      .map((s) => ({
        id: `fail-${s.id}`,
        icon: "card" as const,
        tone: "bad" as const,
        title: `Payment failed: ${s.name}`,
        detail: `${aud(price(s))} · ${s.failure!.reason}`,
        at: `${s.failure!.at}T07:00:00+11:00`,
        href: "/admin/revenue#failed",
      })),
    ...b.expiringCards.map((s) => ({
      id: `card-${s.id}`,
      icon: "card" as const,
      tone: "warn" as const,
      title: `${s.name}'s card expires this month`,
      detail: `${s.card.brand} ending ${s.card.last4}`,
      at: hoursAgo(30),
      href: `/admin/vendors/${s.slug}?tab=billing`,
    })),
    ...b.renewals
      .filter((s) => daysUntil(s.renews) <= 30 && !s.autoRenew && s.status !== "cancelling")
      .map((s) => ({
        id: `expiring-${s.id}`,
        icon: "clock" as const,
        tone: "warn" as const,
        title: `${s.name}'s listing expires in ${daysUntil(s.renews)} days`,
        detail: "Auto-renew is off",
        at: hoursAgo(20),
        href: `/admin/vendors/${s.slug}?tab=billing`,
      })),
    ...b.cancelled
      .filter((s) => s.status === "cancelling")
      .map((s) => ({
        id: `cancel-${s.id}`,
        icon: "logout" as const,
        tone: "warn" as const,
        title: `${s.name} cancelled ${tiers[s.tier].name}`,
        detail: `Listing ends ${day(s.renews)}`,
        at: `${s.cancelled!.at}T14:20:00+11:00`,
        href: `/admin/vendors/${s.slug}?tab=billing`,
      })),
    ...b.upgrades.map((s) => ({
      id: `upgrade-${s.id}`,
      icon: "arrow-up" as const,
      tone: "good" as const,
      title: `${s.name} upgraded to ${tiers[s.tier].name}`,
      detail: `From ${tiers[s.upgradedFrom!.tier].name}`,
      at: `${s.upgradedFrom!.at}T11:02:00+11:00`,
      href: `/admin/vendors/${s.slug}?tab=billing`,
    })),
    ...b.newThisMonth.map((s) => ({
      id: `new-${s.id}`,
      icon: "coin" as const,
      tone: "good" as const,
      title: `${s.name} started ${tiers[s.tier].name}`,
      detail: `${aud(price(s))} ${s.billing === "annual" ? "a year" : "a month"}`,
      at: `${s.started}T10:15:00+11:00`,
      href: `/admin/vendors/${s.slug}?tab=billing`,
    })),
    ...uptime.incidents.map((i) => ({
      id: `site-${i.id}`,
      icon: "pulse" as const,
      tone: "warn" as const,
      title: `Site ran slow for ${i.minutes} minutes`,
      detail: `${day(i.day)} at ${i.at}. Resolved.`,
      at: `${i.day}T${i.at}:00+11:00`,
      href: "/admin#health",
    })),
  ];
  return items.map((i) => ({ ...i, at: new Date(i.at).toISOString() })).sort((a, b) => b.at.localeCompare(a.at));
}
