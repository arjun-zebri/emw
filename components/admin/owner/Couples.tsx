"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { days, enquiries as enquirySeries, sum, traffic } from "@/lib/admin/analytics";
import { day, num, plural } from "@/lib/admin/format";
import { couples, type Couple } from "@/lib/admin/people";
import { toast } from "@/lib/admin/toast";
import { Avatar, Btn, Empty, PageHeader, Panel, Stat, inputCls, table } from "../ui";

function download(rows: Couple[]) {
  const head = ["Names", "Email", "Cultures", "City", "State", "Wedding date", "Guests", "Saved", "Enquiries", "Joined"];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [head, ...rows.map((c) => [c.names, c.email, c.cultures, c.city, c.state, c.weddingDate, c.guests, c.saved, c.enquiries, c.joined])]
    .map((r) => r.map(esc).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "east-meets-wed-couples.csv" });
  a.click();
  URL.revokeObjectURL(url);
  toast(`Exported ${plural(rows.length, "couple")}`);
}

export function Couples() {
  const [query, setQuery] = useState("");
  const joined = sum(traffic("couples", "day"));
  const total = days.reduce((n, d) => n + d.couples, 0);
  const sent = sum(enquirySeries("day"));
  const avgSaved = couples.reduce((s, c) => s + c.saved, 0) / couples.length;

  const q = query.trim().toLowerCase();
  const rows = [...couples]
    .sort((a, b) => b.joined.localeCompare(a.joined))
    .filter((c) => !q || [c.names, c.email, c.cultures, c.city].some((s) => s.toLowerCase().includes(q)));

  return (
    <>
      <Suspense>
        <ExportOnLoad />
      </Suspense>
      <PageHeader
        title="Couples"
        description="Couples who've made an account to save vendors and send enquiries."
        actions={
          <Btn icon="download" onClick={() => download(rows)}>
            Export CSV
          </Btn>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Couples with an account" value={num(total)} />
        <Stat label="Joined, last 30 days" value={num(joined.value)} delta={joined.delta} note="vs previous 30 days" />
        <Stat label="Enquiries sent, last 30 days" value={num(sent.value)} delta={sent.delta} note="vs previous 30 days" />
        <Stat label="Vendors saved, on average" value={avgSaved.toFixed(1)} />
      </div>

      <Panel
        title="Recently joined"
        meta={`The latest ${couples.length}, newest first`}
        flush
        actions={
          <div className="relative w-56 max-sm:hidden">
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-ink-mute" strokeWidth={1.5} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, email or culture" aria-label="Search couples" className={`${inputCls} pl-7`} />
          </div>
        }
      >
        {rows.length === 0 ? (
          <Empty title="No couples match">Nothing for “{query}”.</Empty>
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th}>Couple</th>
                  <th className={table.th}>Cultures</th>
                  <th className={table.th}>Location</th>
                  <th className={table.th}>Wedding</th>
                  <th className={`${table.th} ${table.num}`}>Saved</th>
                  <th className={`${table.th} ${table.num}`}>Enquiries</th>
                  <th className={`${table.th} ${table.num}`}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className={table.row}>
                    <td className={table.td}>
                      <span className="flex items-center gap-3">
                        <Avatar name={c.names} size={32} />
                        <span className="min-w-0">
                          <span className="block whitespace-nowrap">{c.names}</span>
                          <a href={`mailto:${c.email}`} className="block max-w-[14rem] truncate text-[0.75rem] text-ink-mute hover:text-ink">
                            {c.email}
                          </a>
                        </span>
                      </span>
                    </td>
                    <td className={`${table.td} whitespace-nowrap text-ink-soft`}>{c.cultures}</td>
                    <td className={`${table.td} whitespace-nowrap text-ink-soft`}>
                      {c.city}, {c.state}
                    </td>
                    <td className={`${table.td} whitespace-nowrap text-ink-soft`}>{day(c.weddingDate, { year: true })}</td>
                    <td className={`${table.td} ${table.num}`}>{c.saved}</td>
                    <td className={`${table.td} ${table.num}`}>{c.enquiries}</td>
                    <td className={`${table.td} ${table.num} whitespace-nowrap text-ink-soft`}>{day(c.joined)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

/** ⌘K "Export couples as CSV" lands here with ?export=1. Kept apart so the page itself needs no Suspense. */
function ExportOnLoad() {
  const params = useSearchParams();
  const exported = useRef(false);
  useEffect(() => {
    if (params.get("export") === "1" && !exported.current) {
      exported.current = true;
      download(couples);
    }
  }, [params]);
  return null;
}
