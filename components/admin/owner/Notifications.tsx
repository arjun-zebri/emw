"use client";

import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { alertDefs, type AlertDef, type Channel } from "@/lib/admin/alerts";
import { update, useAdmin } from "@/lib/admin/store";
import { toast } from "@/lib/admin/toast";
import { Drawer } from "../Drawer";
import { AlertMatrix, type MatrixGroup } from "../shared/AlertMatrix";
import { AlertsView } from "../shared/AlertsView";
import { EmailPreview } from "../shared/EmailPreview";
import { PageHeader, Tabs, Toggle } from "../ui";

type Tab = "mine" | "sent";

const byId = (ids: string[]) => ids.map((id) => alertDefs.find((a) => a.id === id)!);

const groups: MatrixGroup[] = [
  { title: "Approvals", alerts: byId(["vendor-signup", "submission"]) },
  { title: "Money", alerts: byId(["paid-change", "payment-risk", "listing-expiring"]) },
  { title: "The site", alerts: byId(["site-health"]) },
];

/** Where the team is reached; each can be paused as a whole. Stored with the alert settings. */
const REACH = "__reach";

export function Notifications() {
  return (
    <Suspense fallback={<Page preview={null} />}>
      <WithParams />
    </Suspense>
  );
}

function WithParams() {
  return <Page preview={useSearchParams().get("preview")} />;
}

function Page({ preview }: { preview: string | null }) {
  const router = useRouter();
  const sentIds = alertDefs.filter((a) => a.audience !== "owner").map((a) => a.id);
  const [tab, setTab] = useState<Tab>(preview && sentIds.includes(preview) ? "sent" : "mine");
  const [drawer, setDrawer] = useState<string | null>(preview && !sentIds.includes(preview) ? preview : null);
  const previewing = alertDefs.find((a) => a.id === drawer);

  return (
    <>
      <PageHeader title="Notifications" description="What you're told about, and the emails the platform sends on your behalf." />
      <Tabs
        className="mb-8"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "mine", label: "Your alerts" },
          { id: "sent", label: "Emails we send", count: sentIds.length },
        ]}
      />
      {tab === "mine" ? <Mine onPreview={(a) => setDrawer(a.id)} /> : <Sent initialId={preview} />}

      <Drawer
        open={!!previewing}
        onClose={() => {
          setDrawer(null);
          if (preview) router.replace("/admin/notifications", { scroll: false });
        }}
        title={previewing?.title ?? ""}
        width="max-w-2xl"
      >
        {previewing && <EmailPreview id={previewing.id} />}
      </Drawer>
    </>
  );
}

// ── Your alerts ─────────────────────────────────────────────────────────

function Mine({ onPreview }: { onPreview: (a: AlertDef) => void }) {
  const state = useAdmin();
  const reach = state.alerts[REACH] ?? (["email", "sms", "app"] as Channel[]);
  const [quiet, setQuiet] = useState(true);
  const [weekday, setWeekday] = useState("Monday");
  const [hour, setHour] = useState("8am");

  const setReach = (c: Channel, on: boolean) => update((s) => ({ alerts: { ...s.alerts, [REACH]: on ? [...reach, c] : reach.filter((x) => x !== c) } }));
  const setAlert = (a: AlertDef, c: Channel, on: boolean) =>
    update((s) => {
      const current = s.alerts[a.id] ?? a.defaults;
      return { alerts: { ...s.alerts, [a.id]: on ? [...current, c] : current.filter((x) => x !== c) } };
    });
  const isOn = (a: AlertDef, c: Channel) => (state.alerts[a.id] ?? a.defaults).includes(c);

  const channels: { id: Channel; icon: IconName; label: string; to: string }[] = [
    { id: "email", icon: "mail", label: "Email", to: "hello@eastmeetswed.com" },
    { id: "sms", icon: "phone", label: "Text message", to: "0412 345 678" },
    { id: "app", icon: "bell", label: "In-app", to: "The bell at the top of the admin" },
  ];

  const weekly = alertDefs.find((a) => a.id === "weekly-summary")!;
  const monthly = alertDefs.find((a) => a.id === "monthly-report")!;

  return (
    <div className="space-y-6">
      <section className="border border-ink/[0.09] bg-surface">
        <div className="px-6 pt-5 pb-4">
          <h2 className="text-[1.0625rem] font-medium">Where we reach you</h2>
          <p className="mt-0.5 text-[0.875rem] text-ink-mute">Pause a channel to stop everything sent through it</p>
        </div>
        <div className="grid grid-cols-1 border-t border-ink/[0.06] md:grid-cols-3">
          {channels.map((c, i) => {
            const on = reach.includes(c.id);
            return (
              <div key={c.id} className={clsx("flex items-center gap-4 px-6 py-5", i > 0 && "border-t border-ink/[0.06] md:border-t-0 md:border-l")}>
                <span className={clsx("flex size-10 shrink-0 items-center justify-center rounded-full bg-paper-soft text-ink-soft transition-opacity duration-300", !on && "opacity-40")}>
                  <Icon name={c.icon} className="size-[1.125rem]" strokeWidth={1.25} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.9375rem]">{c.label}</p>
                  <p className="mt-0.5 truncate text-[0.8125rem] text-ink-mute">{on ? c.to : "Paused"}</p>
                </div>
                <Toggle checked={on} onChange={(v) => setReach(c.id, v)} label={c.label} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="border border-ink/[0.09] bg-surface pt-5">
        <AlertMatrix
          groups={groups}
          channels={["email", "sms", "app"]}
          isOn={isOn}
          set={setAlert}
          channelOff={(c) => !reach.includes(c)}
          onPreview={onPreview}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="border border-ink/[0.09] bg-surface">
          <div className="px-6 pt-5 pb-4">
            <h2 className="text-[1.0625rem] font-medium">Reports</h2>
            <p className="mt-0.5 text-[0.875rem] text-ink-mute">Visits, enquiries, revenue and new vendors, by email</p>
          </div>
          <ReportRow
            title="Weekly summary"
            on={isOn(weekly, "email")}
            onToggle={(v) => setAlert(weekly, "email", v)}
            onPreview={() => onPreview(weekly)}
            schedule={
              <>
                Every{" "}
                <InlineSelect value={weekday} onChange={setWeekday} options={["Monday", "Tuesday", "Friday", "Sunday"]} label="Day" /> at{" "}
                <InlineSelect value={hour} onChange={setHour} options={["7am", "8am", "9am", "5pm"]} label="Time" />
              </>
            }
          />
          <ReportRow
            title="Monthly report"
            on={isOn(monthly, "email")}
            onToggle={(v) => setAlert(monthly, "email", v)}
            onPreview={() => onPreview(monthly)}
            schedule="On the 1st, for the month just gone"
          />
        </section>

        <section className="border border-ink/[0.09] bg-surface">
          <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-4">
            <div>
              <h2 className="text-[1.0625rem] font-medium">Quiet hours</h2>
              <p className="mt-0.5 text-[0.875rem] text-ink-mute">Hold texts overnight and send them in the morning</p>
            </div>
            <Toggle
              checked={quiet}
              onChange={(v) => {
                setQuiet(v);
                toast(v ? "Quiet hours on" : "Quiet hours off");
              }}
              label="Quiet hours"
            />
          </div>
          <div className={clsx("border-t border-ink/[0.06] px-6 py-5 transition-opacity", !quiet && "opacity-40")}>
            <p className="text-[0.9375rem]">
              From <span className="font-medium">9pm</span> to <span className="font-medium">7am</span>, Melbourne time
            </p>
            <p className="mt-2 flex items-start gap-2 text-[0.8125rem] text-ink-mute">
              <Icon name="pulse" className="mt-0.5 size-3.5" strokeWidth={1.5} />
              If the site goes down you&apos;ll still get a text straight away.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function ReportRow({
  title,
  on,
  onToggle,
  onPreview,
  schedule,
}: {
  title: string;
  on: boolean;
  onToggle: (v: boolean) => void;
  onPreview: () => void;
  schedule: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 border-t border-ink/[0.06] px-6 py-4">
      <div className={clsx("min-w-0 flex-1 transition-opacity", !on && "opacity-40")}>
        <p className="text-[0.9375rem]">{title}</p>
        <p className="mt-0.5 text-[0.8125rem] text-ink-mute">{schedule}</p>
      </div>
      <button type="button" onClick={onPreview} className="link-line shrink-0 text-[0.8125rem] text-ink-soft hover:text-ink">
        Preview
      </button>
      <Toggle checked={on} onChange={onToggle} label={title} />
    </div>
  );
}

/** A select that reads as part of the sentence. */
function InlineSelect({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: string[]; label: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="cursor-pointer appearance-none border-b border-ink/25 bg-transparent text-ink transition-colors hover:border-ink focus:border-ink focus:outline-none"
    >
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

// ── Emails we send ──────────────────────────────────────────────────────

function Sent({ initialId }: { initialId: string | null }) {
  const state = useAdmin();
  return (
    <AlertsView
      audiences={["vendor", "couple"]}
      initialId={initialId}
      testTo="hello@eastmeetswed.com"
      channelsOf={(a) => state.alerts[a.id] ?? a.defaults}
      setChannel={(a, c, on) =>
        update((s) => {
          const current = s.alerts[a.id] ?? a.defaults;
          return { alerts: { ...s.alerts, [a.id]: on ? [...current, c] : current.filter((x) => x !== c) } };
        })
      }
    />
  );
}
