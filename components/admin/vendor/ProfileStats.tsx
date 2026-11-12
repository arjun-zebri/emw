"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { lastDays, STATS_DAYS, useProfileStats } from "@/lib/account/stats";
import type { Enquiry } from "@/lib/admin/enquiries";
import { day, num } from "@/lib/admin/format";
import { useToday } from "@/lib/admin/time";
import { sourceLine } from "@/lib/enquiry-fields";
import { BarList, Trend } from "../charts";
import { Empty, Panel, Stat } from "../ui";

/**
 * A vendor's numbers for the last 30 days: views of their page, day by day, the enquiries couples
 * sent, and how those couples found them. Free for every listed vendor in the launch year; the team
 * can switch it off per vendor (Admin → Vendors), when it becomes part of paid membership.
 */
export function ProfileStats({ slug, enquiries, enquiriesReady }: { slug: string | null; enquiries: Enquiry[]; enquiriesReady: boolean }) {
  const stats = useProfileStats(slug);
  // Empty until the page is in the browser, so the server render never reads the clock.
  const today = useToday();
  const since = today ? lastDays()[0] : "";
  const recent = since ? enquiries.filter((e) => e.sentAt.slice(0, 10) >= since) : [];
  const found = new Map<string, number>();
  for (const e of recent) {
    const line = sourceLine(e.source, e.sourceDetail) ?? "Not known";
    found.set(line, (found.get(line) ?? 0) + 1);
  }

  if (stats.status === "off") return null;
  if (stats.status === "error")
    return (
      <Panel title="Your listing">
        <Empty title="Couldn’t load your numbers">{stats.error}</Empty>
      </Panel>
    );

  const ready = stats.status === "on" && enquiriesReady && !!today;
  return (
    <section aria-busy={!ready}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="font-display text-[1.5rem] leading-[1.1] tracking-[-0.015em]">Your last {STATS_DAYS} days</h2>
        <p className="text-[0.875rem] text-ink-soft">Included free during our launch year</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Stat label="Profile views" value={stats.status === "on" ? num(stats.total) : <Skeleton className="h-[1.875rem] w-20" />} note="Couples who opened your listing" />
        <Stat label="Enquiries" value={enquiriesReady && today ? num(recent.length) : <Skeleton className="h-[1.875rem] w-12" />} note="Sent from your listing" href="/account/enquiries" />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Profile views, day by day">
          {stats.status === "on" ? (
            <Trend
              data={stats.days.map((d) => ({ key: d.day, value: d.views }))}
              height={220}
              label="Profile views per day"
              unit={["view", "views"]}
              xLabel={(k, long) => day(k, { weekday: long })}
            />
          ) : (
            <Skeleton className="h-[220px] w-full" />
          )}
        </Panel>
        <Panel title="How couples found you" meta="From the enquiries they sent">
          {enquiriesReady && today ? (
            <BarList
              rows={[...found].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ id: label, label, value }))}
              empty="Once couples enquire, you’ll see where they came from."
            />
          ) : (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          )}
        </Panel>
      </div>
    </section>
  );
}
