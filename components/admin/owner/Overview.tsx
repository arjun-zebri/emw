"use client";

import clsx from "clsx";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons/Icon";
import { enquiries, searches, sourceBreakdown, sum, traffic, uptime, vendorRanking } from "@/lib/admin/analytics";
import { billingSummary, mrr, price, revenueByMonth, tierOrder, tiers } from "@/lib/admin/billing";
import { pending } from "@/lib/admin/feed";
import { aud, compact, day, longDay, month, num, pct, plural } from "@/lib/admin/format";
import { useAdmin } from "@/lib/admin/store";
import { TODAY, daysUntil } from "@/lib/admin/time";
import { AreaChart, BarList, Meter, Sparkline } from "../charts";
import { Avatar, Badge, Btn, PageHeader, Panel, Stat } from "../ui";
import { SourceIcon } from "./SourceIcon";

const tierColors = ["var(--color-tier-1)", "var(--color-tier-2)", "var(--color-tier-3)"];

export function Overview() {
  const state = useAdmin();
  const visits = traffic("visits", "day");
  const leads = enquiries("day");
  const thisMonth = revenueByMonth(1)[0];
  const billing = billingSummary();
  const waiting = pending(state);
  const failed = billing.failed.filter((s) => !state.retried[s.id]);
  const expiring = billing.renewals.filter((s) => daysUntil(s.renews) <= 30 && (!s.autoRenew || s.status === "cancelling"));
  const top = vendorRanking("day")
    .sort((a, b) => b.enquiries.value - a.enquiries.value)
    .slice(0, 6);
  const nothingFound = searches("day").filter((s) => s.results === 0);

  const tasks: { icon: IconName; title: string; detail: string; href: string; action: string; tone?: "bad" | "warn" }[] = [
    waiting.applicants.length > 0 && {
      icon: "store" as const,
      title: `${plural(waiting.applicants.length, "business", "businesses")} waiting to join`,
      detail: waiting.applicants.map((a) => a.name).join(", "),
      href: "/admin/approvals",
      action: "Review",
    },
    waiting.submissions.length + waiting.reviews.length > 0 && {
      icon: "image" as const,
      title: [
        waiting.submissions.length && plural(waiting.submissions.length, "Real Wedding"),
        waiting.reviews.length && plural(waiting.reviews.length, "review"),
      ]
        .filter(Boolean)
        .join(" and ") + " to approve",
      detail: [...waiting.submissions.map((s) => s.couple), ...waiting.reviews.map((r) => r.couple)].join(", "),
      href: waiting.submissions.length ? "/admin/approvals?tab=weddings" : "/admin/approvals?tab=reviews",
      action: "Review",
    },
    failed.length > 0 && {
      icon: "card" as const,
      tone: "bad" as const,
      title: `${plural(failed.length, "payment")} failed`,
      detail: failed.map((s) => `${s.name} (${aud(price(s))})`).join(", "),
      href: "/admin/revenue#failed",
      action: "Resolve",
    },
    expiring.length > 0 && {
      icon: "clock" as const,
      tone: "warn" as const,
      title: `${plural(expiring.length, "listing")} ending in the next 30 days`,
      detail: expiring.map((s) => `${s.name}, ${day(s.renews)}`).join(" · "),
      href: "/admin/revenue#renewals",
      action: "View",
    },
  ].filter(Boolean) as typeof tasks;

  return (
    <>
      <PageHeader
        title="Good morning"
        description={longDay(TODAY)}
        actions={
          <>
            <Btn icon="pen" href="/admin/journal/new">
              Write a post
            </Btn>
            <Btn variant="primary" icon="plus" href="/admin/vendors/new">
              Add a vendor
            </Btn>
          </>
        }
      />

      {tasks.length > 0 && (
        <Panel title="Waiting on you" meta={plural(tasks.length, "thing")} className="mb-6" flush>
          <ul>
            {tasks.map((t) => (
              <li key={t.title} className="border-t border-ink/[0.06]">
                <Link href={t.href} className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-paper/70 sm:px-6">
                  <span
                    className={clsx(
                      "flex size-8 shrink-0 items-center justify-center",
                      t.tone === "bad" ? "bg-bad/10 text-bad" : t.tone === "warn" ? "bg-warn/10 text-warn" : "bg-ink/[0.05] text-ink-soft",
                    )}
                  >
                    <Icon name={t.icon} className="size-4" strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.875rem]">{t.title}</span>
                    <span className="block truncate text-[0.75rem] text-ink-mute">{t.detail}</span>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Visits, last 30 days" value={compact(sum(visits).value)} delta={sum(visits).delta} note="vs previous 30 days" href="/admin/traffic">
          <Sparkline values={visits.map((p) => p.value)} />
        </Stat>
        <Stat label="Enquiries sent to vendors" value={num(sum(leads).value)} delta={sum(leads).delta} note="vs previous 30 days" href="/admin/enquiries">
          <Sparkline values={leads.map((p) => p.value)} />
        </Stat>
        <Stat label="Monthly recurring revenue" value={aud(mrr())} note={`${aud(thisMonth.total)} collected in ${month(thisMonth.key, true).split(" ")[0]}`} href="/admin/revenue">
          <Sparkline values={revenueByMonth(12).map((m) => m.total)} />
        </Stat>
        <Stat label="Paying vendors" value={billing.paying} note={`${billing.newThisMonth.length} new this month`} href="/admin/vendors">
          <Meter parts={billing.byTier.map((t, i) => ({ label: tiers[t.tier].name, value: t.count, color: tierColors[tierOrder.indexOf(t.tier) ?? i] }))} />
        </Stat>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel
          title="Visits"
          meta="Last 30 days"
          className="xl:col-span-2"
          actions={
            <Btn size="sm" variant="ghost" href="/admin/traffic">
              Traffic
              <Icon name="arrow" className="size-3.5" strokeWidth={1.5} />
            </Btn>
          }
        >
          <AreaChart points={visits} interval="day" label="Visits per day" height={280} />
        </Panel>

        <Panel title="Most enquired this month" meta="Last 30 days" flush>
          <ul>
            {top.map((r) => (
              <li key={r.vendor.slug} className="border-t border-ink/[0.06]">
                <Link href={`/admin/vendors/${r.vendor.slug}`} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-paper/70 sm:px-6">
                  <Avatar name={r.vendor.name} src={r.vendor.cover} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.8125rem]">{r.vendor.name}</span>
                    <span className="block truncate text-[0.75rem] text-ink-mute">{num(r.views.value)} views</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-[0.875rem] font-medium tabular-nums">{r.enquiries.value}</span>
                    <span className="block text-[0.6875rem] text-ink-mute">enquiries</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Where visitors come from" meta="Last 30 days">
          <BarList rows={sourceBreakdown("day")} showShare icon={(r) => <SourceIcon label={r.label} />} />
        </Panel>
        <Panel title="Searches that found nothing" meta="Couples looked, the directory had no one">
          <BarList rows={nothingFound} limit={7} emphasis={() => true} format={(n) => `${num(n)} searches`} />
          <Link href="/admin/traffic#searches" className="mt-4 inline-flex items-center gap-1.5 text-[0.75rem] text-ink-mute hover:text-ink">
            All searches
            <Icon name="arrow" className="size-3.5" strokeWidth={1.5} />
          </Link>
        </Panel>
        <Panel id="health" title="Site health" meta={`Checked ${uptime.checkedAgo}`}>
          <div className="flex items-center gap-2">
            <Badge tone="good">Up</Badge>
            <span className="text-[0.8125rem] text-ink-mute">All pages responding</span>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-[0.75rem] text-ink-mute">Uptime, 30 days</dt>
              <dd className="mt-1 text-[1.375rem] font-medium tracking-[-0.02em]">{pct(uptime.ratio, 2)}</dd>
            </div>
            <div>
              <dt className="text-[0.75rem] text-ink-mute">Response time</dt>
              <dd className="mt-1 text-[1.375rem] font-medium tracking-[-0.02em]">{uptime.responseMs}ms</dd>
            </div>
          </dl>
          <div className="mt-5 border-t hairline pt-4">
            {uptime.incidents.map((i) => (
              <div key={i.id} className="flex gap-3">
                <Icon name="pulse" className="mt-0.5 size-4 text-warn" strokeWidth={1.5} />
                <div>
                  <p className="text-[0.8125rem]">
                    Slow for {i.minutes} minutes, {day(i.day)} at {i.at}
                  </p>
                  <p className="mt-0.5 text-[0.75rem] text-ink-mute">{i.detail} Resolved on its own; you were alerted by email and SMS.</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
