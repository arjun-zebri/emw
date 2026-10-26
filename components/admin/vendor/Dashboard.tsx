"use client";

import clsx from "clsx";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons/Icon";
import { subscriptionFor } from "@/lib/admin/billing";
import { day, longDay, plural } from "@/lib/admin/format";
import { enquiries, publishedReviews } from "@/lib/admin/people";
import { useVendorSlug } from "@/lib/admin/session";
import { useAdmin } from "@/lib/admin/store";
import { TODAY, hoursSince, monthKey } from "@/lib/admin/time";
import { getVendor } from "@/lib/vendors";
import { VendorPerformance } from "../shared/VendorPerformance";
import { Btn, PageHeader, Panel } from "../ui";
import { Stars } from "./Stars";

export function Dashboard() {
  const slug = useVendorSlug();
  const state = useAdmin();
  const vendor = getVendor(slug);
  const name = (vendor?.person ?? vendor?.signoff ?? vendor?.name ?? "there").split(" ")[0];
  const waiting = enquiries.filter((e) => e.vendor === slug && !e.reply && !state.replies[e.id]);
  const late = waiting.filter((e) => hoursSince(e.sentAt) >= 48);
  const sub = subscriptionFor(slug);
  const cardExpiring = sub && sub.card.expires <= monthKey(TODAY);
  const reviews = publishedReviews.filter((r) => r.vendor === slug);

  const tasks: { icon: IconName; title: string; detail: string; href: string; action: string; warn?: boolean }[] = [];
  if (waiting.length)
    tasks.push({
      icon: "speech",
      warn: late.length > 0,
      title: `${plural(waiting.length, "enquiry", "enquiries")} waiting for a reply`,
      detail: late.length ? `${late[0].couple} have waited ${Math.round(hoursSince(late[0].sentAt))} hours. Couples usually book whoever replies first.` : waiting.map((e) => e.couple).join(", "),
      href: "/account/enquiries",
      action: "Reply",
    });
  if (cardExpiring && sub)
    tasks.push({
      icon: "card",
      warn: true,
      title: "Your card expires this month",
      detail: `${sub.card.brand} ending ${sub.card.last4}. Update it before ${day(sub.renews)} to keep your listing live.`,
      href: "/account/billing",
      action: "Update",
    });

  return (
    <>
      <PageHeader
        title={`Hello, ${name}`}
        description={longDay(TODAY)}
        actions={
          <Btn icon="arrow-up-right" href={`/vendors/${slug}`} external>
            View your listing
          </Btn>
        }
      />

      {tasks.length > 0 && (
        <Panel className="mb-6" flush>
          <ul>
            {tasks.map((t, i) => (
              <li key={t.title} className={clsx(i > 0 && "border-t border-ink/[0.06]")}>
                <Link href={t.href} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-paper/70 sm:px-6">
                  <span className={clsx("flex size-8 shrink-0 items-center justify-center", t.warn ? "bg-warn/10 text-warn" : "bg-ink/[0.05] text-ink-soft")}>
                    <Icon name={t.icon} className="size-4" strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.875rem]">{t.title}</span>
                    <span className="block text-[0.75rem] text-ink-mute">{t.detail}</span>
                  </span>
                  <span className="hidden items-center gap-1.5 text-[0.8125rem] text-ink-mute transition-colors group-hover:text-ink sm:flex">
                    {t.action}
                    <Icon name="arrow" className="size-3.5 transition-transform duration-500 ease-out-expo group-hover:translate-x-0.5" strokeWidth={1.5} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <VendorPerformance slug={slug} audience="vendor" />

      <Panel title="Recent reviews" meta={reviews.length ? plural(reviews.length, "review") : undefined} className="mt-4" flush>
        {reviews.length ? (
          <ul>
            {reviews.map((r) => (
              <li key={r.id} className="border-t border-ink/[0.06] px-5 py-4 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[0.875rem]">{r.couple}</p>
                  <Stars rating={r.rating} />
                </div>
                <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-soft">{r.text}</p>
                <p className="mt-1.5 text-[0.75rem] text-ink-mute">Married {day(r.weddingDate)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-small border-t border-ink/[0.06] px-6 py-6">Reviews from your couples will appear here once they&apos;re approved.</p>
        )}
      </Panel>
    </>
  );
}
