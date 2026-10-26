"use client";

import Link from "next/link";
import { useState } from "react";
import { enquiries as enquirySeries, intervals, sum, traffic, vendorRanking, type Interval } from "@/lib/admin/analytics";
import { subscriptionFor } from "@/lib/admin/billing";
import { ago, day, num, pct, plural } from "@/lib/admin/format";
import { enquiries } from "@/lib/admin/people";
import { nowIso, update, useAdmin } from "@/lib/admin/store";
import { daysUntil, hoursSince } from "@/lib/admin/time";
import { toast } from "@/lib/admin/toast";
import { getVendor } from "@/lib/vendors";
import { Columns, pointLabel } from "../charts";
import { Avatar, Badge, Btn, Delta, PageHeader, Panel, Segmented, Stat, table } from "../ui";

type Period = Extract<Interval, "week" | "month">;
const ink = [{ id: "value", label: "Enquiries", color: "var(--color-ink-soft)" }];

export function Enquiries() {
  const state = useAdmin();
  const [interval, setInterval] = useState<Period>("week");
  const [sort, setSort] = useState<"views" | "enquiries">("enquiries");
  const [showAll, setShowAll] = useState(false);

  const leads = enquirySeries(interval);
  const couples = traffic("couples", interval);
  const vendorSignups = traffic("vendorSignups", interval);
  const xLabel = (key: string, long?: boolean) => pointLabel(key, interval, long);
  // Today is a Monday, so this week has barely started: chart whole weeks only, so it doesn't read as a drop.
  const complete = <T,>(points: T[]) => (interval === "week" ? points.slice(0, -1) : points);
  const per = interval === "week" ? "Per week, to last Sunday" : "Per month, October so far";

  // Reply figures come from the enquiry records themselves (the last six weeks or so).
  const replyOf = (e: (typeof enquiries)[number]) => e.reply ?? state.replies[e.id];
  const replied = enquiries.filter(replyOf);
  const replyHours = replied.map((e) => (Date.parse(replyOf(e)!.at) - Date.parse(e.sentAt)) / 3_600_000).sort((a, b) => a - b);
  const median = replyHours.length ? replyHours[Math.floor(replyHours.length / 2)] : 0;

  const ranking = vendorRanking(interval);
  const ranked = [...ranking].sort((a, b) => b[sort].value - a[sort].value);
  const atRisk = [...vendorRanking("day")]
    .filter((r) => subscriptionFor(r.vendor.slug)?.status !== "cancelled")
    .sort((a, b) => a.enquiries.value - b.enquiries.value || a.views.value - b.views.value)
    .slice(0, 6);
  const recent = [...enquiries].sort((a, b) => b.sentAt.localeCompare(a.sentAt)).slice(0, 8);

  const nudge = (slug: string, name: string) => {
    update((s) => ({ nudged: { ...s.nudged, [slug]: nowIso() } }));
    toast(`Listing tips sent to ${name}`);
  };

  return (
    <>
      <PageHeader title="Enquiries" description="Leads sent to vendors, who's getting them, and who isn't." />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Segmented
          label="Period"
          value={interval}
          onChange={setInterval}
          options={[
            { id: "week", label: "Weekly" },
            { id: "month", label: "Monthly" },
          ]}
        />
        <p className="t-small text-[0.75rem]">
          {intervals[interval].range}, compared with the {intervals[interval].previous}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Enquiries sent" value={num(sum(leads).value)} delta={sum(leads).delta} />
        <Stat label="Replied to" value={pct(replied.length / Math.max(1, enquiries.length))} note={`Median reply in ${median < 1 ? "under an hour" : `${Math.round(median)} hours`}`} />
        <Stat label="New couples" value={num(sum(couples).value)} delta={sum(couples).delta} />
        <Stat label="New vendors" value={num(sum(vendorSignups).value)} delta={sum(vendorSignups).delta} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Enquiries" meta={`${per}, all vendors`} className="xl:col-span-2">
          <Columns data={complete(leads).map((p) => ({ key: p.key, value: p.value }))} series={ink} xLabel={xLabel} label="Enquiries per period" height={280} format={num} />
        </Panel>
        <div className="grid grid-cols-1 gap-4">
          <Panel title="Couple signups" meta={per}>
            <Columns data={complete(couples).map((p) => ({ key: p.key, value: p.value }))} series={[{ id: "value", label: "Couples", color: "var(--color-ink-soft)" }]} xLabel={xLabel} label="Couple signups per period" height={130} format={num} />
          </Panel>
          <Panel title="Vendor signups" meta={per}>
            <Columns data={complete(vendorSignups).map((p) => ({ key: p.key, value: p.value }))} series={[{ id: "value", label: "Vendors", color: "var(--color-accent)" }]} xLabel={xLabel} label="Vendor signups per period" height={130} format={num} />
          </Panel>
        </div>
      </div>

      <Panel
        title="Vendors"
        meta={intervals[interval].range}
        className="mt-4"
        flush
        actions={
          <Segmented
            label="Sort by"
            value={sort}
            onChange={setSort}
            options={[
              { id: "enquiries", label: "Most enquired" },
              { id: "views", label: "Most viewed" },
            ]}
          />
        }
      >
        <div className={table.wrap}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th}>Vendor</th>
                <th className={`${table.th} ${table.num}`}>Profile views</th>
                <th className={`${table.th} ${table.num}`}>Enquiries</th>
                <th className={`${table.th} ${table.num}`}>Conversion</th>
                <th className={`${table.th} ${table.num}`}>Change</th>
              </tr>
            </thead>
            <tbody>
              {(showAll ? ranked : ranked.slice(0, 10)).map((r, i) => (
                <tr key={r.vendor.slug} className={table.row}>
                  <td className={table.td}>
                    <Link href={`/admin/vendors/${r.vendor.slug}`} className="flex items-center gap-3">
                      <span className="w-5 text-[0.75rem] text-ink-mute tabular-nums">{i + 1}</span>
                      <Avatar name={r.vendor.name} src={r.vendor.cover} size={32} />
                      <span className="min-w-0">
                        <span className="block truncate">{r.vendor.name}</span>
                        <span className="block truncate text-[0.75rem] text-ink-mute">{r.vendor.discipline}</span>
                      </span>
                    </Link>
                  </td>
                  <td className={`${table.td} ${table.num}`}>{num(r.views.value)}</td>
                  <td className={`${table.td} ${table.num}`}>{num(r.enquiries.value)}</td>
                  <td className={`${table.td} ${table.num} text-ink-soft`}>{pct(r.conversion, 1)}</td>
                  <td className={`${table.td} ${table.num}`}>
                    <Delta value={r[sort].delta} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center py-3">
          <Btn size="sm" variant="ghost" onClick={() => setShowAll((s) => !s)}>
            {showAll ? "Show top 10" : `Show all ${ranked.length}`}
          </Btn>
        </div>
      </Panel>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="At risk of not renewing" meta="Fewest enquiries and views in the last 30 days" flush>
          <ul>
            {atRisk.map((r) => {
              const sub = subscriptionFor(r.vendor.slug);
              const renewsIn = sub ? daysUntil(sub.renews) : 999;
              const nudged = state.nudged[r.vendor.slug];
              return (
                <li key={r.vendor.slug} className="flex items-center gap-3 border-t border-ink/[0.06] px-5 py-3 sm:px-6">
                  <Avatar name={r.vendor.name} src={r.vendor.cover} size={34} />
                  <Link href={`/admin/vendors/${r.vendor.slug}`} className="min-w-0 flex-1">
                    <span className="block truncate text-[0.8125rem]">{r.vendor.name}</span>
                    <span className="block truncate text-[0.75rem] text-ink-mute">
                      {plural(r.views.value, "view")} · {plural(r.enquiries.value, "enquiry", "enquiries")}
                      {!r.vendor.cover && " · No photos"}
                    </span>
                  </Link>
                  {sub?.status === "cancelling" ? (
                    <Badge tone="warn">Cancelling</Badge>
                  ) : (
                    renewsIn <= 60 && <Badge tone="warn">Renews in {renewsIn} days</Badge>
                  )}
                  {nudged ? (
                    <span className="w-24 shrink-0 text-right text-[0.75rem] text-ink-mute">Tips sent</span>
                  ) : (
                    <Btn size="sm" className="w-24" onClick={() => nudge(r.vendor.slug, r.vendor.name)}>
                      Send tips
                    </Btn>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="Latest enquiries" flush>
          <ul>
            {recent.map((e) => {
              const reply = replyOf(e);
              const waiting = hoursSince(e.sentAt);
              const vendor = getVendor(e.vendor);
              return (
                <li key={e.id} className="flex items-center gap-3 border-t border-ink/[0.06] px-5 py-3 sm:px-6">
                  <Avatar name={e.couple} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.8125rem]">
                      {e.couple} <span className="text-ink-mute">to</span> {vendor?.name}
                    </span>
                    <span className="block truncate text-[0.75rem] text-ink-mute">
                      Wedding {day(e.weddingDate)} · {e.guests} guests · sent {ago(e.sentAt)}
                    </span>
                  </span>
                  {reply ? (
                    <Badge tone="good">Replied</Badge>
                  ) : (
                    <Badge tone={waiting > 48 ? "bad" : "neutral"}>Waiting {Math.round(waiting)}h</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </>
  );
}
