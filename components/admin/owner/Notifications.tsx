"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { setEmailSwitch } from "@/lib/admin/notifications-actions";
import type { NotificationsData, Switch } from "@/lib/admin/notifications";
import { day } from "@/lib/admin/format";
import { toast } from "@/lib/admin/toast";
import type { EmailPreview } from "@/lib/email/previews";
import type { SwitchId } from "@/lib/email/switches";
import { EmailFrame, EmailHeader } from "../shared/EmailFrame";
import { Toggle } from "../ui";

const icons: Record<EmailPreview["id"], IconName> = {
  "application-team": "inbox",
  confirm: "mail",
  password: "cog",
  "application-received": "check",
  "listing-live": "store",
  welcome: "heart",
  "enquiry-vendor": "speech",
};

const groups: { audience: EmailPreview["audience"]; title: string }[] = [
  { audience: "team", title: "To the team" },
  { audience: "vendor", title: "To businesses" },
];

const expo = [0.16, 1, 0.3, 1] as const;

/**
 * Every email the platform sends, laid out like a mail client: the list on the left, the selected
 * email on the right exactly as it renders in an inbox, with its switch above it. One setting for
 * the whole team; only owners can change it.
 */
export function Notifications({ data }: { data: NotificationsData }) {
  const { emails, canEdit } = data;
  const [switches, setSwitches] = useState(data.switches);
  const [selectedId, setSelectedId] = useState(emails[0]?.id);
  const selected = emails.find((e) => e.id === selectedId) ?? emails[0];

  if (!selected) {
    return <p className="border border-ink/[0.09] bg-surface px-6 py-5 text-[0.9375rem] text-ink-soft">There&apos;s no published vendor to show the emails with yet.</p>;
  }

  const always = (e: EmailPreview) => e.id === "confirm" || e.id === "password" || e.id === "welcome";
  const isOn = (e: EmailPreview) => (always(e) ? true : (switches[e.id as SwitchId]?.enabled ?? false));

  const flip = async (id: SwitchId, enabled: boolean) => {
    const before = switches[id];
    const title = emails.find((e) => e.id === id)?.title ?? "Email";
    setSwitches((s) => ({ ...s, [id]: { enabled, changed: before?.changed } }));
    const res = await setEmailSwitch(id, enabled);
    if (!res.ok) {
      setSwitches((s) => ({ ...s, [id]: before }));
      toast("Couldn't save that. Try again in a moment.");
      return;
    }
    setSwitches((s) => ({ ...s, [id]: { enabled, changed: { by: "You", at: res.at ?? new Date().toISOString() } } }));
    toast(`${title} ${enabled ? "switched on" : "switched off"}`);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="space-y-6 self-start">
        {groups.map((g) => (
          <section key={g.audience}>
            <h2 className="mb-2 text-[0.8125rem] text-ink-mute">{g.title}</h2>
            <ul className="border border-ink/[0.09] bg-surface">
              {emails
                .filter((e) => e.audience === g.audience)
                .map((e) => {
                  const active = e.id === selected.id;
                  const on = isOn(e);
                  return (
                    <li key={e.id} className="border-b border-ink/[0.06] last:border-b-0">
                      <button
                        type="button"
                        onClick={() => setSelectedId(e.id)}
                        aria-current={active}
                        className={clsx("relative flex w-full items-center gap-4 px-5 py-4 text-left transition-colors duration-300", active ? "bg-paper" : "hover:bg-paper/60")}
                      >
                        <span className={clsx("absolute inset-y-0 left-0 w-0.5 bg-ink transition-transform duration-500 ease-out-expo", active ? "scale-y-100" : "scale-y-0")} />
                        <span
                          className={clsx(
                            "flex size-10 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                            active ? "bg-ink/[0.08] text-ink" : "bg-paper-soft text-ink-soft",
                          )}
                        >
                          <Icon name={icons[e.id]} className="size-[1.125rem]" strokeWidth={1.25} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[0.9375rem] leading-snug text-ink">{e.title}</span>
                          <span className="mt-1 block truncate text-[0.8125rem] text-ink-soft">{e.when}</span>
                        </span>
                        <span className={clsx("shrink-0 text-[0.8125rem]", on ? "text-ink" : "text-ink-soft")}>{on ? "On" : "Off"}</span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>

      <section className="min-w-0 border border-ink/[0.09] bg-surface lg:sticky lg:top-[5.5rem] lg:self-start">
        <div className="flex items-center justify-between gap-6 border-b border-ink/[0.06] px-6 py-5">
          <div className="min-w-0">
            <h2 className="font-display text-[1.625rem] leading-[1.1] tracking-[-0.015em]">{selected.title}</h2>
            <p className="mt-1 text-[0.875rem] text-ink-soft">{selected.when}</p>
          </div>
          {!always(selected) && (
            <Toggle checked={isOn(selected)} onChange={(v) => flip(selected.id as SwitchId, v)} label={selected.title} disabled={!canEdit} />
          )}
        </div>

        <div className="bg-paper-soft px-3 py-6 sm:px-8 sm:py-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.18 } }}
              transition={{ duration: 0.6, ease: expo }}
              className="mx-auto max-w-[600px]"
            >
              <EmailHeader from={selected.from} to={selected.to} subject={selected.subject} />
              <EmailFrame html={selected.html} title={selected.subject} />
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="border-t border-ink/[0.06] px-6 py-4 text-[0.875rem] text-ink-soft">{status(selected, switches[selected.id as SwitchId], canEdit)}</p>
      </section>
    </div>
  );
}

function status(e: EmailPreview, s: Switch | undefined, canEdit: boolean) {
  if (e.id === "confirm") return "Always sent. Without it nobody could make an account to apply.";
  if (e.id === "password") return "Always sent. Without it nobody could get back in, or sign in for the first time.";
  if (e.id === "welcome") return "Sent only when you choose to, from Admin → Vendors.";
  const state = s?.enabled ? "On" : "Off";
  const changed = s?.changed ? `${state} since ${day(s.changed.at, { year: true })}, set by ${s.changed.by}.` : `${state}.`;
  return canEdit ? changed : `${changed} Only an owner can change this.`;
}
