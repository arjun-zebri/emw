"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { languages as languageNames } from "@/data/taxonomy";
import { vendorTotals } from "@/lib/admin/analytics";
import { tiers } from "@/lib/admin/billing";
import { pending } from "@/lib/admin/feed";
import { ago, day, num } from "@/lib/admin/format";
import { useAdmin } from "@/lib/admin/store";
import { adminVendors, statusLabels, type AdminVendor } from "@/lib/admin/vendors";
import { Avatar, Badge, Btn, Empty, PageHeader, Panel, Tabs, inputCls, table } from "../ui";

type Tab = "all" | "pending" | "failed" | "ending" | "new";

export function VendorsList() {
  const router = useRouter();
  const state = useAdmin();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const all = adminVendors(state);
  const waiting = pending(state).applicants;

  const groups: Record<Exclude<Tab, "pending">, AdminVendor[]> = {
    all,
    failed: all.filter((v) => v.status === "payment-failed"),
    ending: all.filter((v) => v.status === "expiring" || v.status === "cancelling"),
    new: all.filter((v) => v.isNew || v.sub.started >= "2026-10-01"),
  };

  const stats = new Map(all.map((v) => [v.slug, v.isNew ? null : vendorTotals(v.slug, "day")]));

  const q = query.trim().toLowerCase();
  const matches = (v: AdminVendor) =>
    !q ||
    [v.name, v.discipline, v.location, ...v.languages, ...v.languages.map((l) => languageNames[l].native)].some((s) => s.toLowerCase().includes(q));
  const rows = tab === "pending" ? [] : groups[tab].filter(matches);

  return (
    <>
      <PageHeader
        title="Vendors"
        description={`${all.length} listed, ${waiting.length} waiting to join`}
        actions={
          <Btn variant="primary" icon="plus" href="/admin/vendors/new">
            Add a vendor
          </Btn>
        }
      />

      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          className="md:flex-1"
          tabs={[
            { id: "all", label: "All", count: groups.all.length },
            { id: "pending", label: "Awaiting approval", count: waiting.length },
            { id: "failed", label: "Payment failed", count: groups.failed.length },
            { id: "ending", label: "Expiring & cancelling", count: groups.ending.length },
            { id: "new", label: "New", count: groups.new.length },
          ]}
        />
        {tab !== "pending" && (
          <div className="relative md:w-72">
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-ink-mute" strokeWidth={1.5} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, craft or language" aria-label="Search vendors" className={`${inputCls} pl-7`} />
          </div>
        )}
      </div>

      {tab === "pending" ? (
        <Panel flush>
          {waiting.length === 0 ? (
            <Empty title="No one waiting">New applications appear here and in Approvals.</Empty>
          ) : (
            <ul>
              {waiting.map((a, i) => (
                <li key={a.id} className={i > 0 ? "border-t border-ink/[0.06]" : undefined}>
                  <Link href={`/admin/approvals?item=${a.id}`} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-paper/70 sm:px-6">
                    <Avatar name={a.name} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.875rem]">{a.name}</span>
                      <span className="block truncate text-[0.75rem] text-ink-mute">
                        {a.discipline} · {a.based}
                      </span>
                    </span>
                    <span className="hidden text-[0.75rem] text-ink-mute sm:block">Applied {ago(a.submitted)}</span>
                    <span className="flex items-center gap-1.5 text-[0.8125rem] text-ink-mute group-hover:text-ink">
                      Review
                      <Icon name="arrow" className="size-3.5" strokeWidth={1.5} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : (
        <Panel flush>
          {rows.length === 0 ? (
            <Empty title={q ? "No vendors match" : "Nothing here"}>{q ? `Nothing for “${query}”.` : "When a vendor fits this list, they'll show up here."}</Empty>
          ) : (
            <div className={table.wrap}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th}>Vendor</th>
                    <th className={`${table.th} hidden lg:table-cell`}>Location</th>
                    <th className={table.th}>Plan</th>
                    <th className={table.th}>Status</th>
                    <th className={`${table.th} ${table.num}`}>Views</th>
                    <th className={`${table.th} ${table.num}`}>Enquiries</th>
                    <th className={`${table.th} ${table.num}`}>Renews</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((v) => {
                    const s = stats.get(v.slug);
                    const status = statusLabels[v.status];
                    return (
                      <tr key={v.slug} onClick={() => router.push(`/admin/vendors/${v.slug}`)} className={`${table.row} cursor-pointer`}>
                        <td className={table.td}>
                          <Link href={`/admin/vendors/${v.slug}`} className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                            <Avatar name={v.name} src={v.cover} size={36} className="!rounded-none" />
                            <span className="min-w-0">
                              <span className="block max-w-[16rem] truncate">{v.name}</span>
                              <span className="block max-w-[16rem] truncate text-[0.75rem] text-ink-mute">{v.discipline}</span>
                            </span>
                          </Link>
                        </td>
                        <td className={`${table.td} hidden max-w-[12rem] truncate text-ink-soft lg:table-cell`}>{v.location}</td>
                        <td className={`${table.td} text-ink-soft`}>{tiers[v.sub.tier].name}</td>
                        <td className={table.td}>
                          <Badge tone={status.tone}>{status.label}</Badge>
                        </td>
                        <td className={`${table.td} ${table.num}`}>{s ? num(s.views.value) : <span className="text-ink-mute">–</span>}</td>
                        <td className={`${table.td} ${table.num}`}>{s ? num(s.enquiries.value) : <span className="text-ink-mute">–</span>}</td>
                        <td className={`${table.td} ${table.num} text-ink-soft`}>{day(v.sub.renews)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
      {tab !== "pending" && rows.length > 0 && <p className="t-small mt-3 text-[0.75rem]">Views and enquiries over the last 30 days.</p>}
    </>
  );
}
