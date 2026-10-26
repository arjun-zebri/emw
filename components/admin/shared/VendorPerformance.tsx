"use client";

import { useState } from "react";
import { getVendor } from "@/lib/vendors";
import { intervals, vendorRanking, vendorSearches, vendorSeries, vendorSources, vendorTotals, type Interval, type VendorMetric } from "@/lib/admin/analytics";
import { num, pct } from "@/lib/admin/format";
import { AreaChart, BarList } from "../charts";
import { Empty, Panel, Segmented, Stat } from "../ui";

const metrics: { id: VendorMetric; label: string }[] = [
  { id: "views", label: "Profile views" },
  { id: "enquiries", label: "Enquiries" },
  { id: "website", label: "Website clicks" },
  { id: "instagram", label: "Instagram clicks" },
];

/**
 * A vendor's numbers: profile views, enquiries and clicks out, over time and by source. The same
 * view is the vendor's own dashboard and the owner's look at that vendor.
 */
export function VendorPerformance({ slug, audience = "owner" }: { slug: string; audience?: "owner" | "vendor" }) {
  const [interval, setInterval] = useState<Interval>("day");
  const [metric, setMetric] = useState<VendorMetric>("views");
  const vendor = getVendor(slug);

  if (!vendor) {
    return (
      <Panel>
        <Empty title="No stats yet">Views, clicks and enquiries appear here from the listing&apos;s first day live.</Empty>
      </Panel>
    );
  }

  const totals = vendorTotals(slug, interval);
  const ranking = vendorRanking(interval);
  const allViews = ranking.reduce((s, r) => s + r.views.value, 0);
  const average = ranking.reduce((s, r) => s + r.enquiries.value, 0) / Math.max(1, allViews);
  const conversion = totals.views.value ? totals.enquiries.value / totals.views.value : 0;
  const rank = [...ranking].sort((a, b) => b.views.value - a.views.value).findIndex((r) => r.vendor.slug === slug) + 1;
  const searchesShown = vendorSearches(vendor, interval);
  const visible = metrics.filter((m) => (m.id === "website" ? vendor.contact?.website : m.id === "instagram" ? vendor.socials?.instagram : true));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Period"
          value={interval}
          onChange={setInterval}
          options={(Object.keys(intervals) as Interval[]).map((id) => ({ id, label: intervals[id].range }))}
        />
        <p className="t-small text-[0.75rem]">Compared with the {intervals[interval].previous}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {visible.map((m) => (
          <button key={m.id} type="button" onClick={() => setMetric(m.id)} aria-pressed={metric === m.id} className="text-left">
            <Stat
              label={m.label}
              value={num(totals[m.id].value)}
              delta={totals[m.id].delta}
              className={metric === m.id ? "!border-ink" : "transition-colors hover:border-ink/25"}
            />
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title={visible.find((m) => m.id === metric)?.label} meta={intervals[interval].range} className="xl:col-span-2">
          <AreaChart key={metric + interval} points={vendorSeries(slug, metric, interval)} interval={interval} label={`${metric} for ${vendor.name}`} height={260} />
        </Panel>
        <Panel title="How the listing is doing">
          <dl className="space-y-5">
            <div>
              <dt className="text-[0.75rem] text-ink-mute">Views that became an enquiry</dt>
              <dd className="mt-1 text-[1.5rem] font-medium tracking-[-0.02em]">{pct(conversion, 1)}</dd>
              <dd className="t-small text-[0.75rem]">Directory average {pct(average, 1)}</dd>
            </div>
            <div>
              <dt className="text-[0.75rem] text-ink-mute">Most viewed in the directory</dt>
              <dd className="mt-1 text-[1.5rem] font-medium tracking-[-0.02em]">
                {rank} <span className="text-[0.875rem] font-normal text-ink-mute">of {ranking.length}</span>
              </dd>
            </div>
            {audience === "vendor" && (
              <p className="border-t hairline pt-4 text-[0.8125rem] leading-relaxed text-ink-soft">
                Listings with five or more photos get more enquiries. Adding the languages you speak helps couples searching in them find you.
              </p>
            )}
          </dl>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Where couples find the listing" meta={intervals[interval].range}>
          <BarList rows={vendorSources(slug, interval)} showShare />
        </Panel>
        <Panel title="Searches that showed the listing" meta="What couples typed into the directory">
          <BarList rows={searchesShown} empty="No searches matched this listing in the period." format={(n) => `${num(n)}×`} />
        </Panel>
      </div>
    </div>
  );
}
