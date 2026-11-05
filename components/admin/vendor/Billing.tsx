"use client";

import clsx from "clsx";
import { Icon } from "@/components/icons/Icon";
import { tierOrder, tiers } from "@/lib/admin/billing";
import { aud } from "@/lib/admin/format";
import { NotYet, PageHeader, Panel } from "../ui";

/** Billing starts with Stripe at launch. Until then: what will be here, and the plans to choose from. */
export function Billing() {
  return (
    <>
      <PageHeader title="Plan & billing" />
      <NotYet
        title="Billing starts at launch"
        items={[
          { icon: "store", title: "Your plan", detail: "What you're on, when it renews, and a switch to change it." },
          { icon: "card", title: "Your card", detail: "The card on file, kept by Stripe, and a secure link to update it." },
          { icon: "download", title: "Invoices", detail: "Every payment, with a receipt to download." },
        ]}
      >
        You&rsquo;ll choose a plan and pay through Stripe once the new site is live. Everything about your billing will be here.
      </NotYet>

      <Panel title="Plans" meta="Names and prices are placeholders until they're confirmed" className="mt-4" flush>
        <div className="grid grid-cols-1 border-t hairline md:grid-cols-3">
          {tierOrder.map((t, i) => (
            <div key={t} className={clsx("flex flex-col p-5 sm:p-6", i > 0 && "border-t border-ink/[0.06] md:border-t-0 md:border-l")}>
              <p className="text-[0.9375rem] font-medium">{tiers[t].name}</p>
              <p className="mt-2 text-[1.5rem] font-medium tracking-[-0.02em]">
                {aud(tiers[t].monthly)}
                <span className="text-[0.8125rem] font-normal text-ink-mute"> a month</span>
              </p>
              <p className="mt-1 text-[0.75rem] text-ink-mute">or {aud(tiers[t].annual)} a year</p>
              <ul className="mt-4 flex-1 space-y-1.5">
                {tiers[t].perks.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-[0.8125rem] text-ink-soft">
                    <Icon name="check" className="mt-[3px] size-3.5 text-ink" strokeWidth={1.75} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
