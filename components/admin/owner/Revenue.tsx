"use client";

import Link from "next/link";
import { billingSummary, isPaying, mrr, price, revenueByMonth, subscriptions, tierOrder, tiers, type Subscription } from "@/lib/admin/billing";
import { aud, day, month, num, plural } from "@/lib/admin/format";
import { nowIso, update, useAdmin } from "@/lib/admin/store";
import { daysUntil } from "@/lib/admin/time";
import { toast } from "@/lib/admin/toast";
import { getVendor } from "@/lib/vendors";
import { Columns, Meter } from "../charts";
import { Avatar, Badge, Btn, Empty, PageHeader, Panel, Stat, table } from "../ui";

const tierColor = { essential: "var(--color-tier-1)", signature: "var(--color-tier-2)", premier: "var(--color-tier-3)" };
const series = tierOrder.map((t) => ({ id: t, label: tiers[t].name, color: tierColor[t] }));
const xLabel = (key: string, long?: boolean) => month(key, long);

function VendorCell({ sub, detail }: { sub: Subscription; detail?: React.ReactNode }) {
  const vendor = getVendor(sub.slug);
  const body = (
    <>
      <Avatar name={sub.name} src={vendor?.cover} size={30} />
      <span className="min-w-0">
        <span className="block truncate">{sub.name}</span>
        {detail && <span className="block truncate text-[0.75rem] text-ink-mute">{detail}</span>}
      </span>
    </>
  );
  return vendor ? (
    <Link href={`/admin/vendors/${sub.slug}?tab=billing`} className="flex items-center gap-3">
      {body}
    </Link>
  ) : (
    <span className="flex items-center gap-3">{body}</span>
  );
}

const plan = (s: Subscription) => `${tiers[s.tier].name}, ${aud(price(s))} ${s.billing === "annual" ? "a year" : "a month"}`;

export function Revenue() {
  const state = useAdmin();
  const months = revenueByMonth(12);
  const year = months.reduce((t, m) => t + m.total, 0);
  const b = billingSummary();
  const failed = b.failed.filter((s) => !state.retried[s.id]);
  const recovered = b.failed.filter((s) => state.retried[s.id]);
  const changes = [
    ...b.newThisMonth.map((s) => ({ sub: s, kind: "New" as const, at: s.started, tone: "good" as const })),
    ...b.upgrades.map((s) => ({ sub: s, kind: "Upgrade" as const, at: s.upgradedFrom!.at, tone: "good" as const })),
    ...b.cancelled.map((s) => ({ sub: s, kind: s.status === "cancelling" ? ("Cancelling" as const) : ("Cancelled" as const), at: s.cancelled!.at, tone: "warn" as const })),
  ].sort((a, c) => c.at.localeCompare(a.at));

  const retry = (s: Subscription) => {
    update((st) => ({ retried: { ...st.retried, [s.id]: nowIso() } }));
    toast(`Payment of ${aud(price(s))} collected from ${s.name}`);
  };

  return (
    <>
      <PageHeader title="Revenue" description="Listing plans, payments and renewals." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Monthly recurring revenue" value={aud(mrr())} note="Annual plans spread across the year" />
        <Stat label="Revenue, last 12 months" value={aud(year)} note={`${aud(months.at(-1)!.total)} so far in ${month(months.at(-1)!.key, true).split(" ")[0]}`} />
        <Stat label="Paying vendors" value={b.paying} note={`${b.newThisMonth.length} new this month`}>
          <Meter parts={b.byTier.map((t) => ({ label: tiers[t.tier].name, value: t.count, color: tierColor[t.tier] }))} />
        </Stat>
        <Stat label="Failed payments" value={failed.length} note={failed.length ? aud(failed.reduce((t, s) => t + price(s), 0)) + " outstanding" : "All collected"} href="#failed" />
      </div>

      <Panel title="Revenue by month" meta="Collected, by plan" className="mt-4">
        <Columns data={months} series={series} xLabel={xLabel} label="Revenue by month and plan" height={300} format={(n) => aud(n)} />
      </Panel>

      <Panel id="failed" title="Failed payments" meta="Retried automatically after 1, 3 and 5 days" className="mt-4 scroll-mt-24" flush>
        {failed.length === 0 ? (
          <Empty title="Nothing outstanding">Every payment has been collected.</Empty>
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th}>Vendor</th>
                  <th className={`${table.th} ${table.num}`}>Amount</th>
                  <th className={table.th}>Reason</th>
                  <th className={`${table.th} ${table.num}`}>Attempts</th>
                  <th className={table.th}>Failed</th>
                  <th className={table.th} />
                </tr>
              </thead>
              <tbody>
                {failed.map((s) => (
                  <tr key={s.id} className={table.row}>
                    <td className={table.td}>
                      <VendorCell sub={s} detail={`${s.card.brand} ending ${s.card.last4}`} />
                    </td>
                    <td className={`${table.td} ${table.num}`}>{aud(price(s))}</td>
                    <td className={`${table.td} text-ink-soft`}>{s.failure!.reason}</td>
                    <td className={`${table.td} ${table.num}`}>{s.failure!.attempts}</td>
                    <td className={`${table.td} text-ink-soft`}>{day(s.failure!.at)}</td>
                    <td className={`${table.td} text-right`}>
                      <span className="inline-flex gap-2">
                        <Btn size="sm" variant="ghost" icon="mail" onClick={() => toast(`Card update link sent to ${s.name}`)}>
                          Email vendor
                        </Btn>
                        <Btn size="sm" variant="primary" icon="refresh" onClick={() => retry(s)}>
                          Retry
                        </Btn>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {recovered.length > 0 && (
          <p className="border-t border-ink/[0.06] px-5 py-3 text-[0.75rem] text-ink-mute sm:px-6">
            Recovered today: {recovered.map((s) => `${s.name} (${aud(price(s))})`).join(", ")}
          </p>
        )}
      </Panel>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel id="renewals" title="Renewals coming up" meta="Annual plans, next 60 days" className="scroll-mt-24" flush>
          <ul>
            {b.renewals.map((s) => (
              <li key={s.id} className="flex items-center gap-3 border-t border-ink/[0.06] px-5 py-3 text-[0.8125rem] sm:px-6">
                <span className="min-w-0 flex-1">
                  <VendorCell sub={s} detail={plan(s)} />
                </span>
                {s.status === "cancelling" ? (
                  <Badge tone="warn">Cancelling</Badge>
                ) : !s.autoRenew ? (
                  <Badge tone="warn">Auto-renew off</Badge>
                ) : null}
                <span className="w-24 shrink-0 text-right">
                  <span className="block tabular-nums">{day(s.renews)}</span>
                  <span className="block text-[0.75rem] text-ink-mute">in {plural(daysUntil(s.renews), "day")}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Plan changes" meta="New, upgraded and cancelled, last 90 days" flush>
          <ul>
            {changes.map((c) => (
              <li key={c.kind + c.sub.id} className="flex items-center gap-3 border-t border-ink/[0.06] px-5 py-3 text-[0.8125rem] sm:px-6">
                <span className="min-w-0 flex-1">
                  <VendorCell
                    sub={c.sub}
                    detail={
                      c.kind === "Upgrade"
                        ? `${tiers[c.sub.upgradedFrom!.tier].name} to ${tiers[c.sub.tier].name}`
                        : c.sub.cancelled
                          ? c.sub.cancelled.reason
                          : plan(c.sub)
                    }
                  />
                </span>
                <Badge tone={c.tone}>{c.kind}</Badge>
                <span className="w-16 shrink-0 text-right text-[0.75rem] text-ink-mute tabular-nums">{day(c.at)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Cards expiring" meta="This month and next" flush>
          {b.expiringCards.length === 0 ? (
            <Empty title="No cards expiring" />
          ) : (
            <ul>
              {b.expiringCards.map((s) => (
                <li key={s.id} className="flex items-center gap-3 border-t border-ink/[0.06] px-5 py-3 text-[0.8125rem] sm:px-6">
                  <span className="min-w-0 flex-1">
                    <VendorCell sub={s} detail={`${s.card.brand} ending ${s.card.last4}, expires ${month(s.card.expires)}`} />
                  </span>
                  <Btn size="sm" icon="mail" onClick={() => toast(`Reminder to update their card sent to ${s.name}`)}>
                    Remind
                  </Btn>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Plans" meta="Prices are placeholders for the demo">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {tierOrder.map((t) => {
              const count = subscriptions.filter((s) => s.tier === t && isPaying(s)).length;
              return (
                <div key={t} className="border border-ink/[0.09] p-4">
                  <span className="block h-1 w-6" style={{ background: tierColor[t] }} aria-hidden />
                  <p className="mt-3 font-display text-[1.25rem] leading-tight">{tiers[t].name}</p>
                  <p className="mt-1 text-[0.8125rem] text-ink-soft">
                    {aud(tiers[t].monthly)} a month
                    <span className="block text-[0.75rem] text-ink-mute">or {aud(tiers[t].annual)} a year</span>
                  </p>
                  <p className="mt-3 border-t hairline pt-3 text-[0.75rem] text-ink-mute">
                    <span className="text-ink tabular-nums">{num(count)}</span> {count === 1 ? "vendor" : "vendors"}
                  </p>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </>
  );
}
