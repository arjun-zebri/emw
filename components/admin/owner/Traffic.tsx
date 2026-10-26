"use client";

import clsx from "clsx";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import {
  intervals,
  journalReads,
  locations,
  referrers,
  searches,
  sourceBreakdown,
  states,
  sum,
  topPages,
  traffic,
  trafficMetrics,
  type Interval,
  type TrafficMetric,
} from "@/lib/admin/analytics";
import { compact, num, pct } from "@/lib/admin/format";
import { applicants } from "@/lib/admin/people";
import { publishedPosts, useAdmin } from "@/lib/admin/store";
import { AreaChart, BarList } from "../charts";
import { Badge, PageHeader, Panel, Segmented, Stat } from "../ui";
import { SourceIcon } from "./SourceIcon";

export function Traffic() {
  const state = useAdmin();
  const [interval, setInterval] = useState<Interval>("day");
  const [metric, setMetric] = useState<TrafficMetric>("visits");
  const [place, setPlace] = useState<"cities" | "states">("cities");

  const totals = {
    visits: sum(traffic("visits", interval)),
    visitors: sum(traffic("visitors", interval)),
    pageviews: sum(traffic("pageviews", interval)),
  };
  const perVisit = totals.pageviews.value / Math.max(1, totals.visits.value);
  const perVisitBefore = totals.pageviews.prev / Math.max(1, totals.visits.prev);
  const sourceRows = sourceBreakdown(interval);
  const otherSites = sourceRows.find((r) => r.label === "Other sites")?.value ?? 0;
  const posts = publishedPosts(state.posts).map((p) => {
    const share = journalReads[p.slug] ?? 0.012;
    return {
      label: p.title,
      value: Math.round(totals.pageviews.value * share),
      // Older posts have had longer to collect reads, so they grew less.
      prev: Math.round(totals.pageviews.prev * share * (0.62 + (p.title.length % 7) * 0.07)),
      href: `/admin/journal/${p.id}`,
    };
  });
  const allSearches = searches(interval);
  const answeredBy = (q: string) => applicants.filter((a) => a.answers === q && !state.decisions[a.id]);
  const empty = allSearches.filter((s) => s.results === 0);
  const range = intervals[interval].range;

  return (
    <>
      <PageHeader title="Traffic" description="Who visits, where they come from and what they look for." />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Segmented
          label="Period"
          value={interval}
          onChange={setInterval}
          options={(Object.keys(intervals) as Interval[]).map((id) => ({ id, label: intervals[id].label }))}
        />
        <p className="t-small text-[0.75rem]">
          {range}, compared with the {intervals[interval].previous}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(trafficMetrics) as TrafficMetric[]).map((m) => (
          <button key={m} type="button" onClick={() => setMetric(m)} aria-pressed={metric === m} className="text-left">
            <Stat
              label={trafficMetrics[m]}
              value={compact(totals[m].value)}
              delta={totals[m].delta}
              note={metric === m ? "Shown below" : undefined}
              className={metric === m ? "!border-ink" : "transition-colors hover:border-ink/25"}
            />
          </button>
        ))}
        <Stat label="Pages per visit" value={perVisit.toFixed(1)} delta={perVisit / perVisitBefore - 1} />
      </div>

      <Panel title={trafficMetrics[metric]} meta={range} className="mt-4">
        <AreaChart key={metric + interval} points={traffic(metric, interval)} interval={interval} label={`${trafficMetrics[metric]}, ${range.toLowerCase()}`} height={300} />
      </Panel>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Where visitors come from" meta="Visits by source">
          <BarList rows={sourceRows} showShare showDelta icon={(r) => <SourceIcon label={r.label} />} />
          <div className="mt-5 border-t hairline pt-4">
            <p className="text-[0.75rem] text-ink-mute">Other sites</p>
            <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
              {referrers.map((r) => (
                <li key={r.label} className="flex justify-between gap-3 text-[0.75rem]">
                  <span className="truncate text-ink-soft">{r.label}</span>
                  <span className="text-ink-mute tabular-nums">{num(otherSites * r.share)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel
          title="Visitor locations"
          meta="Visits by city or state"
          actions={
            <Segmented
              label="Group by"
              value={place}
              onChange={setPlace}
              options={[
                { id: "cities", label: "Cities" },
                { id: "states", label: "States" },
              ]}
            />
          }
        >
          <BarList rows={place === "cities" ? locations(interval) : states(interval)} limit={10} showShare />
        </Panel>

        <Panel title="Top pages" meta="Page views">
          <BarList
            rows={topPages(interval).map((r) => ({ ...r, href: undefined }))}
            icon={(r) => (
              <a href={r.detail} target="_blank" rel="noreferrer" aria-label={`Open ${r.label}`} className="text-ink-mute hover:text-ink">
                <Icon name="arrow-up-right" className="size-3.5" strokeWidth={1.5} />
              </a>
            )}
            showDelta
          />
        </Panel>

        <Panel title="Top journal posts" meta="Reads">
          <BarList rows={posts} showDelta empty="No published posts yet." />
        </Panel>
      </div>

      <div id="searches" className="mt-4 grid scroll-mt-24 grid-cols-1 gap-4 lg:grid-cols-5">
        <Panel title="What couples search for" meta="Searches on the site, with how many vendors each found" className="lg:col-span-3" flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-[0.8125rem]">
              <thead>
                <tr className="text-left text-[0.75rem] text-ink-mute">
                  <th className="h-9 border-y hairline pl-5 font-normal sm:pl-6">Search</th>
                  <th className="h-9 border-y hairline px-3 text-right font-normal">Searches</th>
                  <th className="h-9 border-y hairline pr-5 text-right font-normal sm:pr-6">Vendors found</th>
                </tr>
              </thead>
              <tbody>
                {allSearches.slice(0, 14).map((s) => (
                  <tr key={s.label} className="border-b border-ink/[0.06] last:border-0">
                    <td className="h-10 pl-5 sm:pl-6">{s.label}</td>
                    <td className="px-3 text-right tabular-nums">{num(s.value)}</td>
                    <td className={clsx("pr-5 text-right tabular-nums sm:pr-6", s.results === 0 ? "text-warn" : "text-ink-soft")}>{s.results === 0 ? "None" : s.results}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Searches with no results" meta={`${num(empty.reduce((t, s) => t + s.value, 0))} searches found nobody`} className="lg:col-span-2">
          <p className="mb-4 text-[0.8125rem] leading-relaxed text-ink-soft">
            Each of these is a couple the directory couldn&apos;t help. They show which kinds of vendor to invite next.
          </p>
          <ul className="space-y-1">
            {empty.map((s) => {
              const answer = answeredBy(s.label);
              return (
                <li key={s.label} className="flex min-h-9 items-center justify-between gap-3 bg-warn/[0.07] px-3 py-1.5 text-[0.8125rem]">
                  <span className="min-w-0">
                    <span className="block">{s.label}</span>
                    {answer.length > 0 && <span className="block truncate text-[0.75rem] text-ink-mute">{answer[0].name} has applied</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {answer.length > 0 && <Badge tone="good">Applicant</Badge>}
                    <span className="tabular-nums">{num(s.value)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="t-small mt-4 text-[0.75rem]">{pct(empty.reduce((t, s) => t + s.value, 0) / Math.max(1, allSearches.reduce((t, s) => t + s.value, 0)))} of all searches.</p>
        </Panel>
      </div>
    </>
  );
}
