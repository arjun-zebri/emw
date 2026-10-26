"use client";

import clsx from "clsx";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import { languages as languageNames, serviceLabels, states } from "@/data/taxonomy";
import { chargesFor, price, tierOrder, tiers, type TierId } from "@/lib/admin/billing";
import { aud, day, month } from "@/lib/admin/format";
import { addVendor, nowIso, removeVendor, update, useAdmin } from "@/lib/admin/store";
import { TODAY, monthKey } from "@/lib/admin/time";
import { toast } from "@/lib/admin/toast";
import { findAdminVendor, isListed, statusLabels, type AdminVendor } from "@/lib/admin/vendors";
import { VendorPerformance } from "../shared/VendorPerformance";
import { Badge, Btn, Empty, PageHeader, Panel, Segmented, Tabs, table } from "../ui";

type Tab = "performance" | "listing" | "billing";

export function VendorDetail() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const state = useAdmin();
  const vendor = findAdminVendor(state, slug);
  const tab = (["performance", "listing", "billing"].includes(params.get("tab") ?? "") ? params.get("tab") : "performance") as Tab;
  const setTab = (t: Tab) => router.replace(t === "performance" ? pathname : `${pathname}?tab=${t}`, { scroll: false });

  if (!vendor) {
    return (
      <>
        <PageHeader title="Vendor not found" back={{ href: "/admin/vendors", label: "Vendors" }} />
        <Panel>
          <Empty title="This vendor isn't listed" action={<Btn href="/admin/vendors">All vendors</Btn>}>
            They may have been removed.
          </Empty>
        </Panel>
      </>
    );
  }

  const status = statusLabels[vendor.status];
  const remove = () => {
    const original = state.addedVendors.find((v) => v.slug === vendor.slug);
    removeVendor(vendor.slug);
    router.push("/admin/vendors");
    toast(`${vendor.name} removed`, original && { label: "Undo", run: () => addVendor(original) });
  };

  return (
    <>
      <div className="mb-8 md:mb-10">
        <PageHeader
          back={{ href: "/admin/vendors", label: "Vendors" }}
          title={
            <span className="flex items-center gap-5">
              <span className="relative block size-16 shrink-0 overflow-hidden bg-paper-soft md:size-[4.5rem]">
                {vendor.cover && <Cover src={vendor.cover} />}
              </span>
              <span className="min-w-0">
                <span className="block truncate">{vendor.name}</span>
                <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-[0.875rem] tracking-normal text-ink-mute">
                  <span>
                    {vendor.discipline} · {vendor.location}
                  </span>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </span>
              </span>
            </span>
          }
          actions={
            <>
              {vendor.email && (
                <Btn icon="mail" href={`mailto:${vendor.email}`} external>
                  Email
                </Btn>
              )}
              {isListed(vendor.slug) && (
                <Btn icon="arrow-up-right" href={`/vendors/${vendor.slug}`} external>
                  View listing
                </Btn>
              )}
              {vendor.isNew && (
                <Btn variant="danger" icon="trash" onClick={remove}>
                  Remove
                </Btn>
              )}
            </>
          }
        />
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "performance", label: "Performance" },
            { id: "listing", label: "Listing" },
            { id: "billing", label: "Billing" },
          ]}
        />
      </div>

      {tab === "performance" && <VendorPerformance slug={vendor.slug} />}
      {tab === "listing" && <ListingTab vendor={vendor} />}
      {tab === "billing" && <BillingTab vendor={vendor} />}
    </>
  );
}

function Cover({ src }: { src: string }) {
  if (src.startsWith("data:")) {
    // eslint-disable-next-line @next/next/no-img-element -- uploaded in the demo as a data URL
    return <img src={src} alt="" className="size-full object-cover" />;
  }
  return <Media src={src} alt="" brief="" sizes="160px" className="size-full" />;
}

function ListingTab({ vendor }: { vendor: AdminVendor }) {
  const links: { icon: IconName; label: string; href: string }[] = [
    vendor.website && { icon: "globe" as const, label: vendor.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""), href: vendor.website },
    vendor.instagram && { icon: "instagram" as const, label: "Instagram", href: vendor.instagram },
    vendor.facebook && { icon: "facebook" as const, label: "Facebook", href: vendor.facebook },
    vendor.email && { icon: "mail" as const, label: vendor.email, href: `mailto:${vendor.email}` },
    vendor.phone && { icon: "phone" as const, label: vendor.phone, href: `tel:${vendor.phone.replace(/\s/g, "")}` },
  ].filter(Boolean) as { icon: IconName; label: string; href: string }[];

  const rows: [string, React.ReactNode][] = [
    ["Contact person", vendor.person ?? "–"],
    ["Services", vendor.services.map((s) => serviceLabels[s]).join(", ") || "–"],
    ["Based in", vendor.based ?? "–"],
    ["Travels to", vendor.serviceArea.map((s) => states[s]).join(", ") || "–"],
    [
      "Languages",
      vendor.languages.length ? (
        <span className="flex flex-wrap gap-x-3 gap-y-1">
          {vendor.languages.map((l) => (
            <span key={l} lang={languageNames[l].lang}>
              {languageNames[l].native}
              {languageNames[l].native !== l && <span className="ml-1.5 text-ink-mute">{l}</span>}
            </span>
          ))}
        </span>
      ) : (
        "–"
      ),
    ],
  ];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Panel title="Photos" meta={`${vendor.photos.length} on the listing`} className="xl:col-span-2">
        {vendor.photos.length === 0 ? (
          <Empty title="No photos yet">The listing shows a placeholder until photos are added.</Empty>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {vendor.photos.map((src, i) => (
              <li key={src.slice(-40) + i} className={clsx("relative overflow-hidden bg-paper-soft", i === 0 ? "col-span-2 row-span-2 aspect-square sm:aspect-auto" : "aspect-square")}>
                <span className="absolute inset-0">
                  <Cover src={src} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <div className="space-y-4">
        <Panel title="Introduction">
          <p className="text-[0.875rem] leading-relaxed text-ink-soft">{vendor.lede || "–"}</p>
        </Panel>
        <Panel title="Details" flush>
          <dl>
            {rows.map(([k, val]) => (
              <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3 border-t border-ink/[0.06] px-5 py-3 text-[0.8125rem] sm:px-6">
                <dt className="text-ink-mute">{k}</dt>
                <dd>{val}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        {links.length > 0 && (
          <Panel title="Links" flush>
            <ul>
              {links.map((l) => (
                <li key={l.href} className="border-t border-ink/[0.06]">
                  <a href={l.href} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-5 py-3 text-[0.8125rem] transition-colors hover:bg-paper/70 sm:px-6">
                    <Icon name={l.icon} className="size-4 text-ink-mute" strokeWidth={1.4} />
                    <span className="min-w-0 flex-1 truncate">{l.label}</span>
                    <Icon name="arrow-up-right" className="size-3.5 text-ink-mute" strokeWidth={1.5} />
                  </a>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  );
}

function BillingTab({ vendor }: { vendor: AdminVendor }) {
  const state = useAdmin();
  const sub = vendor.sub;
  const [tier, setTier] = useState<TierId>(sub.tier);
  const retried = state.retried[sub.id];
  const failed = sub.status === "past_due" && !retried;
  const cardExpiring = sub.card.expires <= monthKey(TODAY);
  const charged = vendor.isNew ? [] : chargesFor(vendor.slug);
  // Show the failed attempt itself, even when it fell between the plan's usual billing days.
  const failedCharge =
    sub.failure && !charged.some((c) => c.status === "failed")
      ? [{ id: `failed-${sub.id}`, sub, day: sub.failure.at, amount: price(sub), status: "failed" as const }]
      : [];
  const history = [...failedCharge, ...charged].slice(0, 12);

  const retry = () => {
    update((s) => ({ retried: { ...s.retried, [sub.id]: nowIso() } }));
    toast(`Payment of ${aud(price(sub))} from ${vendor.name} went through`);
  };

  const changeTier = (t: TierId) => {
    setTier(t);
    toast(t === sub.tier ? `${vendor.name} stays on ${tiers[t].name}` : `${vendor.name} moves to ${tiers[t].name} from their next payment`);
  };

  const facts: [string, React.ReactNode][] = [
    ["Price", `${aud(price({ tier, billing: sub.billing }))} ${sub.billing === "annual" ? "a year" : "a month"}`],
    ["Billing", sub.billing === "annual" ? "Yearly" : "Monthly"],
    ["Started", day(sub.started, { year: true })],
    [sub.status === "cancelling" || !sub.autoRenew ? "Ends" : "Renews", day(sub.renews, { year: true })],
    [
      "Card",
      <span key="card" className="flex items-center gap-2">
        {sub.card.brand} ending {sub.card.last4}
        <span className={clsx("text-[0.75rem]", cardExpiring ? "text-warn" : "text-ink-mute")}>
          expires {month(sub.card.expires)} {sub.card.expires.slice(2, 4)}
        </span>
      </span>,
    ],
  ];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="space-y-4">
        {failed && sub.failure && (
          <div className="border border-bad/25 bg-bad/[0.04] p-5">
            <p className="flex items-center gap-2 text-[0.875rem] font-medium text-bad">
              <Icon name="alert" className="size-4" strokeWidth={1.5} />
              Payment failed {day(sub.failure.at)}
            </p>
            <p className="mt-1.5 text-[0.8125rem] text-ink-soft">
              {sub.failure.reason}. Tried {sub.failure.attempts} times; the next try is automatic in two days.
            </p>
            <div className="mt-4 flex gap-2">
              <Btn variant="primary" icon="refresh" onClick={retry}>
                Retry now
              </Btn>
              {vendor.email && (
                <Btn href={`mailto:${vendor.email}?subject=Your East Meets Wed payment`} external>
                  Email them
                </Btn>
              )}
            </div>
          </div>
        )}
        {!failed && cardExpiring && (
          <div className="border border-warn/25 bg-warn/[0.05] p-5">
            <p className="flex items-center gap-2 text-[0.875rem] font-medium text-warn">
              <Icon name="card" className="size-4" strokeWidth={1.5} />
              Card expires this month
            </p>
            <p className="mt-1.5 text-[0.8125rem] text-ink-soft">They&apos;ve been sent a reminder to update it.</p>
          </div>
        )}
        <Panel title="Plan" actions={<Badge>{tiers[tier].name}</Badge>} flush>
          <dl>
            {facts.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[6rem_1fr] gap-3 border-t border-ink/[0.06] px-5 py-3 text-[0.8125rem] sm:px-6">
                <dt className="text-ink-mute">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="border-t border-ink/[0.06] px-5 py-4 sm:px-6">
            <p className="mb-2 text-[0.75rem] text-ink-mute">Change plan</p>
            <Segmented label="Change plan" value={tier} onChange={changeTier} options={tierOrder.map((t) => ({ id: t, label: tiers[t].name }))} />
          </div>
        </Panel>
        {sub.cancelled && (
          <Panel title="Cancellation">
            <p className="text-[0.8125rem] text-ink-soft">
              Cancelled {day(sub.cancelled.at)}: “{sub.cancelled.reason}”
            </p>
          </Panel>
        )}
      </div>

      <Panel title="Payments" meta={history.length ? "Most recent first" : undefined} className="self-start xl:col-span-2" flush>
        {history.length === 0 ? (
          <Empty title="No payments yet">The first payment is taken when the listing goes live.</Empty>
        ) : (
          <div className={table.wrap}>
            <table className={clsx(table.table, "min-w-[480px]")}>
              <thead>
                <tr>
                  <th className={table.th}>Date</th>
                  <th className={table.th}>Plan</th>
                  <th className={table.th}>Status</th>
                  <th className={`${table.th} ${table.num}`}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {history.map((c) => {
                  const ok = c.status === "paid" || !!retried;
                  return (
                    <tr key={c.id} className={table.row}>
                      <td className={table.td}>{day(c.day, { year: true })}</td>
                      <td className={`${table.td} text-ink-soft`}>
                        {tiers[c.sub.tier].name}, {c.sub.billing === "annual" ? "yearly" : "monthly"}
                      </td>
                      <td className={table.td}>
                        <Badge tone={ok ? "good" : "bad"}>{ok ? (c.status === "failed" ? "Paid on retry" : "Paid") : "Failed"}</Badge>
                      </td>
                      <td className={`${table.td} ${table.num}`}>{aud(c.amount, true)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
