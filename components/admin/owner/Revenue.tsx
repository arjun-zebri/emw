"use client";

import { Icon } from "@/components/icons/Icon";
import { tierOrder, tiers } from "@/lib/admin/billing";
import { aud } from "@/lib/admin/format";
import { NotYet, PageHeader, Panel } from "../ui";

/** Payments arrive with Stripe at launch. Until then: what will be here, and the plans vendors will choose from. */
export function Revenue() {
  return (
    <>
      <PageHeader title="Revenue" description="Subscriptions, payments and renewals." />
      <NotYet
        title="Payments start at launch"
        items={[
          { icon: "coin", title: "Monthly revenue", detail: "What comes in each month, by plan." },
          { icon: "card", title: "Failed payments", detail: "Cards that didn't go through, with a way to retry." },
          { icon: "clock", title: "Renewals", detail: "Who renews soon, and who has turned auto-renew off." },
          { icon: "store", title: "Plans", detail: "How many vendors are on each plan, and who upgrades." },
        ]}
      >
        Vendors pay for their listing through Stripe once the new site is live. Every payment will show here.
      </NotYet>

      <Panel title="Listing plans" meta="Names and prices are placeholders until they're confirmed" className="mt-4" flush>
        <div className="grid grid-cols-1 border-t hairline md:grid-cols-3">
          {tierOrder.map((t, i) => (
            <div key={t} className={i > 0 ? "border-t border-ink/[0.06] p-5 sm:p-6 md:border-t-0 md:border-l" : "p-5 sm:p-6"}>
              <p className="flex items-center gap-2.5 font-display text-[1.5rem] leading-none tracking-[-0.015em]">
                <span className="size-2 shrink-0" style={{ background: `var(--color-tier-${i + 1})` }} aria-hidden />
                {tiers[t].name}
              </p>
              <p className="mt-4 text-[1.5rem] font-medium tracking-[-0.02em]">
                {aud(tiers[t].monthly)}
                <span className="text-[0.8125rem] font-normal text-ink-mute"> a month, or {aud(tiers[t].annual)} a year</span>
              </p>
              <ul className="mt-4 space-y-1.5">
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
