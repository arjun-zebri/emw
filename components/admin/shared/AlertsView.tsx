"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Icon, type IconName } from "@/components/icons/Icon";
import { alertDefs, channelLabels, type AlertDef, type Audience, type Channel } from "@/lib/admin/alerts";
import { toast } from "@/lib/admin/toast";
import { Tabs } from "../ui";
import { FROM, build } from "./EmailPreview";

const icons: Record<string, IconName> = {
  "vendor-signup": "store",
  submission: "image",
  "paid-change": "coin",
  "payment-risk": "card",
  "listing-expiring": "clock",
  "site-health": "pulse",
  "weekly-summary": "trend",
  "monthly-report": "overview",
  "vendor-enquiry": "speech",
  "vendor-reply-reminder": "clock",
  "vendor-review": "star",
  "vendor-renewal": "refresh",
  "couple-confirmation": "mail",
  "couple-matches": "heart",
};

const tabLabels: Record<Audience, string> = { owner: "To you", vendor: "To vendors", couple: "To couples" };
const allChannels: Channel[] = ["email", "sms", "app"];
const expo = [0.16, 1, 0.3, 1] as const;

/**
 * Alerts laid out like a mail client: the alerts on the left, the selected one's email rendered on the
 * right with how it's sent above it. The page is mostly the email itself, so there's little to click.
 */
export function AlertsView({
  audiences,
  channelsOf,
  setChannel,
  unavailable,
  vendorSlug,
  initialId,
  testTo,
}: {
  audiences: Audience[];
  channelsOf: (a: AlertDef) => Channel[];
  setChannel: (a: AlertDef, c: Channel, on: boolean) => void;
  /** Why a channel can't be used for this alert, if it can't. */
  unavailable?: (a: AlertDef, c: Channel) => string | undefined;
  vendorSlug?: string;
  initialId?: string | null;
  testTo: string;
}) {
  const first = alertDefs.find((a) => a.id === initialId) ?? alertDefs.find((a) => a.audience === audiences[0])!;
  const [audience, setAudience] = useState<Audience>(first.audience);
  const [selectedId, setSelectedId] = useState(first.id);
  const list = alertDefs.filter((a) => a.audience === audience);
  const selected = alertDefs.find((a) => a.id === selectedId) ?? list[0];
  const email = build(selected.id, vendorSlug ?? "katrina-lai");
  const on = channelsOf(selected);

  const select = (id: string) => {
    setSelectedId(id);
    if (initialId !== undefined) window.history.replaceState(null, "", `?preview=${id}`);
  };

  return (
    <div>
      {audiences.length > 1 && (
        <Tabs
          className="mb-6"
          value={audience}
          onChange={(a) => {
            setAudience(a);
            select(alertDefs.find((d) => d.audience === a)!.id);
          }}
          tabs={audiences.map((a) => ({ id: a, label: tabLabels[a], count: alertDefs.filter((d) => d.audience === a).length }))}
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <ul className="self-start border border-ink/[0.09] bg-surface">
          {list.map((a) => {
            const channels = channelsOf(a);
            const active = a.id === selected.id;
            return (
              <li key={a.id} className="border-b border-ink/[0.06] last:border-b-0">
                <button
                  type="button"
                  onClick={() => select(a.id)}
                  aria-current={active}
                  className={clsx("relative flex w-full items-center gap-4 px-5 py-4 text-left transition-colors duration-300", active ? "bg-paper" : "hover:bg-paper/60")}
                >
                  <span className={clsx("absolute inset-y-0 left-0 w-0.5 bg-ink transition-transform duration-500 ease-out-expo", active ? "scale-y-100" : "scale-y-0")} />
                  <span className={clsx("flex size-10 shrink-0 items-center justify-center rounded-full transition-colors duration-300", active ? "bg-ink/[0.08] text-ink" : "bg-paper-soft text-ink-mute")}>
                    <Icon name={icons[a.id] ?? "bell"} className="size-[1.125rem]" strokeWidth={1.25} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9375rem] leading-snug text-ink">{a.title}</span>
                    <span className="mt-1 block text-[0.8125rem] text-ink-mute">
                      {channels.length ? channels.map((c) => channelLabels[c]).join(", ") : "Off"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <section className="min-w-0 border border-ink/[0.09] bg-surface lg:sticky lg:top-[5.5rem] lg:self-start">
          <div className="flex flex-col gap-4 border-b border-ink/[0.06] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-display text-[1.625rem] leading-[1.1] tracking-[-0.015em]">{selected.title}</h2>
              <p className="mt-1 text-[0.875rem] text-ink-soft">{selected.when}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {allChannels
                .filter((c) => selected.channels.includes(c))
                .map((c) => {
                  const reason = unavailable?.(selected, c);
                  const checked = on.includes(c) && !reason;
                  return (
                    <button
                      key={c}
                      type="button"
                      role="switch"
                      aria-checked={checked}
                      disabled={!!reason}
                      title={reason}
                      onClick={() => setChannel(selected, c, !checked)}
                      className={clsx(
                        "flex h-9 items-center gap-2 border px-3.5 text-[0.8125rem] transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40",
                        checked ? "border-ink bg-ink text-paper" : "border-ink/15 text-ink-soft hover:border-ink/40 hover:text-ink",
                      )}
                    >
                      <Icon name={checked ? "check" : "plus"} className="size-3.5" strokeWidth={1.75} />
                      {channelLabels[c]}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* The email as it lands in an inbox. */}
          <div className="bg-paper-soft px-4 py-8 sm:px-10 sm:py-12">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.18 } }}
                transition={{ duration: 0.6, ease: expo }}
                className="mx-auto max-w-[36rem]"
              >
                <dl className="mb-5 space-y-1 text-[0.8125rem]">
                  <div className="flex gap-3">
                    <dt className="w-16 shrink-0 text-ink-mute">From</dt>
                    <dd className="truncate text-ink-soft">{FROM}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-16 shrink-0 text-ink-mute">To</dt>
                    <dd className="truncate text-ink-soft">{email.to}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-16 shrink-0 text-ink-mute">Subject</dt>
                    <dd className="font-medium text-ink">{email.subject}</dd>
                  </div>
                </dl>
                <div className="bg-surface shadow-[0_1px_2px_rgb(22_20_18/0.04),0_24px_48px_-28px_rgb(22_20_18/0.25)]">
                  <div className="px-8 pt-10 pb-10 sm:px-12">
                    <Logo title="East Meets Wed" className="mb-10 w-20 text-ink" />
                    {email.body}
                  </div>
                  <p className="border-t hairline px-8 py-5 text-[0.6875rem] leading-relaxed text-ink-mute sm:px-12">
                    East Meets Wed · Melbourne, Australia · You&apos;re receiving this because of your notification settings.
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-ink/[0.06] px-6 py-4">
            <p className="text-[0.8125rem] text-ink-mute">{on.length ? `Sent by ${on.map((c) => channelLabels[c].toLowerCase()).join(" and ")}` : "Turned off"}</p>
            <button
              type="button"
              onClick={() => toast(`Test sent to ${testTo}`)}
              className="group flex items-center gap-2 text-[0.875rem] text-ink transition-colors hover:text-ink-soft"
            >
              Send me a test
              <Icon name="arrow" className="size-4 transition-transform duration-500 ease-out-expo group-hover:translate-x-0.5" strokeWidth={1.4} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
