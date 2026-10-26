"use client";

import clsx from "clsx";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { chargesFor, price, subscriptionFor, tierOrder, tiers } from "@/lib/admin/billing";
import { aud, day, month } from "@/lib/admin/format";
import { useVendorSlug } from "@/lib/admin/session";
import { TODAY, monthKey } from "@/lib/admin/time";
import { toast } from "@/lib/admin/toast";
import { Badge, Btn, Empty, PageHeader, Panel, Toggle, table } from "../ui";

export function Billing() {
  const slug = useVendorSlug();
  const sub = subscriptionFor(slug);
  const [autoRenew, setAutoRenew] = useState(sub?.autoRenew ?? true);

  if (!sub) {
    return (
      <>
        <PageHeader title="Plan & billing" />
        <Panel>
          <Empty title="No plan yet">Choose a plan to list your business.</Empty>
        </Panel>
      </>
    );
  }

  const tier = tiers[sub.tier];
  const expiring = sub.card.expires <= monthKey(TODAY);
  const invoices = chargesFor(slug).slice(0, 12);
  const per = sub.billing === "annual" ? "a year" : "a month";

  return (
    <>
      <PageHeader title="Plan & billing" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Your plan" className="lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-display text-[2.25rem] leading-none tracking-[-0.02em]">{tier.name}</p>
              <p className="mt-3 text-[0.875rem] text-ink-soft">
                {aud(price(sub))} {per}, billed {sub.billing === "annual" ? "yearly" : "monthly"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[0.75rem] text-ink-mute">{autoRenew ? "Renews" : "Ends"}</p>
              <p className="mt-0.5 text-[0.9375rem]">{day(sub.renews, { weekday: true, year: true })}</p>
            </div>
          </div>
          <ul className="mt-6 grid grid-cols-1 gap-2 border-t hairline pt-5 sm:grid-cols-2">
            {tier.perks.map((p) => (
              <li key={p} className="flex items-center gap-2 text-[0.8125rem] text-ink-soft">
                <Icon name="check" className="size-3.5 text-ink" strokeWidth={1.75} />
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-between gap-4 border-t hairline pt-5">
            <div>
              <p className="text-[0.875rem]">Renew automatically</p>
              <p className="text-[0.75rem] text-ink-mute">{autoRenew ? "Your listing stays live without a break." : "Your listing comes down when the plan ends."}</p>
            </div>
            <Toggle
              checked={autoRenew}
              label="Renew automatically"
              onChange={(v) => {
                setAutoRenew(v);
                toast(v ? "Auto-renew is on" : `Auto-renew is off. Your listing ends ${day(sub.renews)}`);
              }}
            />
          </div>
        </Panel>

        <Panel title="Card on file">
          <div className={clsx("border p-4", expiring ? "border-warn/40 bg-warn/[0.05]" : "border-ink/10 bg-paper")}>
            <div className="flex items-center justify-between">
              <Icon name="card" className="size-6 text-ink-soft" strokeWidth={1.25} />
              <span className="text-[0.75rem] text-ink-mute">{sub.card.brand}</span>
            </div>
            <p className="mt-6 text-[0.9375rem] tracking-[0.12em] tabular-nums">•••• {sub.card.last4}</p>
            <p className="mt-1 text-[0.75rem] text-ink-mute">Expires {month(sub.card.expires, true)}</p>
          </div>
          {expiring && (
            <p className="mt-3 flex gap-2 text-[0.75rem] leading-snug text-warn">
              <Icon name="alert" className="mt-px size-3.5 shrink-0" strokeWidth={1.5} />
              This card expires this month. Update it before {day(sub.renews)} so your listing stays live.
            </p>
          )}
          <Btn className="mt-4 w-full" onClick={() => toast("We've emailed you a secure link to update your card")}>
            Update card
          </Btn>
        </Panel>
      </div>

      <Panel title="Plans" meta="Change plan at any time; the difference is charged or credited straight away" className="mt-4" flush>
        <div className="grid grid-cols-1 border-t hairline md:grid-cols-3">
          {tierOrder.map((t, i) => {
            const current = t === sub.tier;
            return (
              <div key={t} className={clsx("flex flex-col p-5 sm:p-6", i > 0 && "border-t border-ink/[0.06] md:border-t-0 md:border-l")}>
                <div className="flex items-center justify-between">
                  <p className="text-[0.9375rem] font-medium">{tiers[t].name}</p>
                  {current && <Badge tone="ink">Current</Badge>}
                </div>
                <p className="mt-2 text-[1.5rem] font-medium tracking-[-0.02em]">
                  {aud(tiers[t][sub.billing])}
                  <span className="text-[0.8125rem] font-normal text-ink-mute"> {per}</span>
                </p>
                <ul className="mt-4 flex-1 space-y-1.5">
                  {tiers[t].perks.map((p) => (
                    <li key={p} className="text-[0.8125rem] text-ink-soft">
                      {p}
                    </li>
                  ))}
                </ul>
                <Btn
                  className="mt-6"
                  variant={current ? "secondary" : tierOrder.indexOf(t) > tierOrder.indexOf(sub.tier) ? "primary" : "secondary"}
                  disabled={current}
                  onClick={() => toast(`Switched to ${tiers[t].name} (demo)`)}
                >
                  {current ? "Your plan" : tierOrder.indexOf(t) > tierOrder.indexOf(sub.tier) ? `Upgrade to ${tiers[t].name}` : `Switch to ${tiers[t].name}`}
                </Btn>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Invoices" className="mt-4" flush>
        <div className={table.wrap}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th}>Date</th>
                <th className={table.th}>Description</th>
                <th className={table.th}>Status</th>
                <th className={clsx(table.th, table.num)}>Amount</th>
                <th className={table.th}>
                  <span className="sr-only">Download</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((c) => (
                <tr key={c.id} className={table.row}>
                  <td className={table.td}>{day(c.day, { year: true })}</td>
                  <td className={clsx(table.td, "text-ink-soft")}>
                    {tiers[c.sub.tier].name} listing, {c.sub.billing === "annual" ? "1 year" : "1 month"}
                  </td>
                  <td className={table.td}>{c.status === "paid" ? <Badge tone="good">Paid</Badge> : <Badge tone="bad">Failed</Badge>}</td>
                  <td className={clsx(table.td, table.num)}>{aud(c.amount, true)}</td>
                  <td className={clsx(table.td, "text-right")}>
                    <Btn size="sm" variant="ghost" icon="download" onClick={() => toast("Invoice downloaded")}>
                      PDF
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
