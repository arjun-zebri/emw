"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { useQueue } from "@/lib/admin/drafts";
import { useEnquiries } from "@/lib/admin/enquiries";
import { pending } from "@/lib/admin/feed";
import { longDay, plural } from "@/lib/admin/format";
import { statusOf, useJournal } from "@/lib/admin/journal";
import { useAdmin } from "@/lib/admin/store";
import { useToday } from "@/lib/admin/time";
import { adminVendors } from "@/lib/admin/vendors";
import { Btn, NotYet, PageHeader, Panel, Stat } from "../ui";

const greeting = () => {
  const hour = Number(new Date().toLocaleTimeString("en-AU", { timeZone: "Australia/Melbourne", hour: "numeric", hour12: false }));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
};
// The time of day only exists in the browser; the prerendered page says hello.
const useGreeting = () => useSyncExternalStore(() => () => {}, greeting, () => "Hello");

export function Overview() {
  const state = useAdmin();
  const now = useToday();
  const hello = useGreeting();
  const { counts } = useQueue();
  const enquiries = useEnquiries();
  const waiting = pending(counts);
  const listed = adminVendors(state).length;
  const posts = (useJournal().data?.posts ?? []).filter((p) => statusOf(p) === "published").length;

  const tasks: { icon: IconName; title: string; detail: string; href: string; action: string }[] = [
    waiting.vendors > 0 && {
      icon: "store" as const,
      title: `${plural(waiting.vendors, "business", "businesses")} waiting for approval`,
      detail: `${waiting.waiting?.ready ?? 0} ready, ${waiting.waiting?.missing ?? 0} missing data`,
      href: "/admin/approvals",
      action: "Review",
    },
  ].filter(Boolean) as typeof tasks;

  return (
    <>
      <PageHeader
        title={hello}
        description={now ? longDay(now) : undefined}
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
                  <span className="flex size-8 shrink-0 items-center justify-center bg-ink/[0.05] text-ink-soft">
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
        <Stat label="Vendors on the site" value={listed} note="Listed in the directory" href="/admin/vendors" />
        <Stat label="Waiting for approval" value={counts ? waiting.vendors : "–"} note={counts ? `${counts.ready} ready to approve` : undefined} href="/admin/approvals" />
        <Stat label="Enquiries" value={enquiries.status === "ready" ? enquiries.list.length : "–"} note={enquiries.status === "ready" ? "From vendor pages" : undefined} href="/admin/enquiries" />
        <Stat label="Journal posts" value={posts} note="Published" href="/admin/journal" />
      </div>

      <NotYet
        className="mt-4"
        title="The rest fills in at launch"
        items={[
          { icon: "coin", title: "Revenue", detail: "Subscriptions and payments, once vendors pay for their listing through Stripe." },
          { icon: "people", title: "Couples", detail: "Couples who save vendors and send enquiries, once they can sign up." },
          { icon: "pulse", title: "Site health", detail: "Uptime and response times, checked every few minutes from launch day." },
        ]}
      >
        Each of these starts counting when its source goes live.
      </NotYet>
    </>
  );
}
