"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Portal } from "@/components/ui/Portal";
import { aud, day } from "@/lib/admin/format";
import { subscriptions, isPaying, tierOrder, tiers, type TierId } from "@/lib/admin/billing";
import type { Member, Role } from "@/lib/admin/people";
import { resetDemo, update, useAdmin } from "@/lib/admin/store";
import { TODAY } from "@/lib/admin/time";
import { toast } from "@/lib/admin/toast";
import { getVendor } from "@/lib/vendors";
import { Drawer } from "../Drawer";
import { Avatar, Btn, PageHeader, Tabs, TextField } from "../ui";

type Tab = "team" | "business" | "plans" | "demo";

const roles: Record<Role, { blurb: string; can: string[] }> = {
  Owner: { blurb: "Runs the business", can: ["Everything an editor can do", "Billing and plans", "The team"] },
  Editor: { blurb: "Looks after the directory", can: ["Vendors and approvals", "The journal", "Dashboards"] },
  Viewer: { blurb: "Keeps an eye on things", can: ["Dashboards and reports", "Can't change anything"] },
};

/** Who can do what, read across the roles. */
const permissions: [string, Role[]][] = [
  ["See dashboards and reports", ["Owner", "Editor", "Viewer"]],
  ["Approve vendors, Real Weddings and reviews", ["Owner", "Editor"]],
  ["Edit vendor listings", ["Owner", "Editor"]],
  ["Write and publish journal posts", ["Owner", "Editor"]],
  ["Billing, plans and refunds", ["Owner"]],
  ["Invite and remove people", ["Owner"]],
];

const expo = [0.16, 1, 0.3, 1] as const;

export function Settings() {
  const [tab, setTab] = useState<Tab>("team");
  return (
    <>
      <PageHeader title="Team" description="Who can sign in, how the business appears on invoices, and the listing plans." />
      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-8"
        tabs={[
          { id: "team", label: "People" },
          { id: "business", label: "Business" },
          { id: "plans", label: "Listing plans" },
          { id: "demo", label: "Demo data" },
        ]}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} transition={{ duration: 0.5, ease: expo }}>
          {tab === "team" && <Team />}
          {tab === "business" && <Business />}
          {tab === "plans" && <Plans />}
          {tab === "demo" && <Demo />}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

// ── Team ────────────────────────────────────────────────────────────────

function Team() {
  const state = useAdmin();
  const [inviting, setInviting] = useState(false);
  const [role, setRole] = useState<Role>("Editor");

  const invite = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name")).trim();
    const email = String(data.get("email")).trim();
    const member: Member = { id: `m${Date.now()}`, name, email, role, joined: TODAY };
    update((s) => ({ team: [...s.team, member] }));
    toast(`Invite sent to ${email}`);
    setInviting(false);
    setRole("Editor");
  };

  const setMemberRole = (m: Member, r: Role) => {
    update((s) => ({ team: s.team.map((x) => (x.id === m.id ? { ...x, role: r } : x)) }));
    toast(`${m.name} is now ${r === "Owner" ? "an" : "a"} ${r.toLowerCase()}`);
  };

  const remove = (m: Member) => {
    const before = state.team;
    update((s) => ({ team: s.team.filter((x) => x.id !== m.id) }));
    toast(`${m.name} removed`, { label: "Undo", run: () => update(() => ({ team: before })) });
  };

  return (
    <div className="space-y-6">
      <section className="min-w-0 border border-ink/[0.09] bg-surface">
        <div className="flex items-center justify-between gap-4 px-6 py-5">
          <div>
            <h2 className="text-[1.0625rem] font-medium">People</h2>
            <p className="mt-0.5 text-[0.875rem] text-ink-mute">{state.team.length} with access to the admin</p>
          </div>
          <Btn variant="primary" icon="plus" onClick={() => setInviting(true)}>
            Invite someone
          </Btn>
        </div>
        <ul>
          {state.team.map((m) => (
            <li key={m.id} className="group flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-ink/[0.06] px-6 py-5">
              <Avatar name={m.name} size={44} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[0.9375rem] text-ink">
                  {m.name}
                  {m.you && <span className="bg-ink/[0.06] px-1.5 py-0.5 text-[0.6875rem] text-ink-soft">You</span>}
                </p>
                <p className="truncate text-[0.875rem] text-ink-mute">
                  {m.email} · since {day(m.joined)}
                </p>
              </div>
              {m.you ? (
                <span className="w-40 border border-transparent py-2 pl-3 text-[0.875rem] text-ink-soft">{m.role}</span>
              ) : (
                <label className="relative w-40">
                  <span className="sr-only">Role for {m.name}</span>
                  <select
                    value={m.role}
                    onChange={(e) => setMemberRole(m, e.target.value as Role)}
                    className="w-full cursor-pointer appearance-none border border-ink/15 bg-surface py-2 pr-8 pl-3 text-[0.875rem] transition-colors hover:border-ink/40 focus:border-ink focus:outline-none"
                  >
                    {(Object.keys(roles) as Role[]).map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                  <Icon name="chevron-down" className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-mute" strokeWidth={1.25} />
                </label>
              )}
              <div className="w-8">
                {!m.you && (
                  <button
                    type="button"
                    onClick={() => remove(m)}
                    aria-label={`Remove ${m.name}`}
                    className="flex size-8 items-center justify-center text-ink-mute opacity-0 transition-all group-hover:opacity-100 hover:bg-bad/10 hover:text-bad focus:opacity-100"
                  >
                    <Icon name="trash" className="size-4" strokeWidth={1.4} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="min-w-0 border border-ink/[0.09] bg-surface">
        <div className="px-6 py-5">
          <h2 className="text-[1.0625rem] font-medium">What each role can do</h2>
          <p className="mt-0.5 text-[0.875rem] text-ink-mute">Change someone&apos;s role from the list above at any time</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-t border-ink/[0.06]">
                <th className="px-6 py-4 text-[0.8125rem] font-normal text-ink-mute">Access</th>
                {(Object.keys(roles) as Role[]).map((r) => (
                  <th key={r} className="w-[18%] px-4 py-4 text-center font-normal">
                    <span className="block font-display text-[1.375rem] leading-none tracking-[-0.01em]">{r}</span>
                    <span className="mt-1.5 block text-[0.75rem] text-ink-mute">{roles[r].blurb}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map(([label, who]) => (
                <tr key={label} className="border-t border-ink/[0.06]">
                  <td className="px-6 py-3.5 text-[0.9375rem] text-ink-soft">{label}</td>
                  {(Object.keys(roles) as Role[]).map((r) => (
                    <td key={r} className="px-4 py-3.5 text-center">
                      {who.includes(r) ? (
                        <Icon name="check" className="mx-auto size-4 text-ink" strokeWidth={1.75} title={`${r}: yes`} />
                      ) : (
                        <span className="text-ink-mute/40" aria-label={`${r}: no`}>
                          –
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Drawer open={inviting} onClose={() => setInviting(false)} title="Team" width="max-w-lg">
        <form onSubmit={invite} className="flex min-h-full flex-col px-6 py-8 sm:px-8">
          <h3 className="font-display text-[2rem] leading-none tracking-[-0.02em]">Invite someone</h3>
          <p className="mt-3 text-[0.9375rem] text-ink-soft">They&apos;ll get an email with a link to set their password.</p>
          <div className="mt-8 space-y-6">
            <TextField label="Name" name="name" required autoFocus autoComplete="off" />
            <TextField label="Email" name="email" type="email" required autoComplete="off" />
          </div>
          <fieldset className="mt-8">
            <legend className="mb-3 text-[0.75rem] text-ink-mute">Role</legend>
            <div className="space-y-2">
              {(Object.keys(roles) as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={role === r}
                  onClick={() => setRole(r)}
                  className={clsx(
                    "flex w-full items-start gap-4 border p-4 text-left transition-colors duration-300",
                    role === r ? "border-ink bg-surface" : "border-ink/12 hover:border-ink/35",
                  )}
                >
                  <span className={clsx("mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors", role === r ? "border-ink" : "border-ink/30")}>
                    <span className={clsx("size-2 rounded-full bg-ink transition-transform duration-300", role === r ? "scale-100" : "scale-0")} />
                  </span>
                  <span>
                    <span className="block text-[0.9375rem]">{r}</span>
                    <span className="mt-0.5 block text-[0.8125rem] text-ink-mute">{roles[r].can.join(", ")}</span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="mt-auto flex gap-3 pt-10">
            <Btn onClick={() => setInviting(false)} className="h-11 flex-1">
              Cancel
            </Btn>
            <Btn variant="primary" type="submit" icon="send" className="h-11 flex-[2]">
              Send invite
            </Btn>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

// ── Business ────────────────────────────────────────────────────────────

function Business() {
  const [dirty, setDirty] = useState(false);
  const [version, setVersion] = useState(0);

  return (
    <form
      key={version}
      onChange={() => setDirty(true)}
      onSubmit={(e) => {
        e.preventDefault();
        setDirty(false);
        toast("Business details saved");
      }}
      className="grid grid-cols-1 gap-6 xl:grid-cols-2"
    >
      <section className="border border-ink/[0.09] bg-surface p-6 sm:p-8">
        <h2 className="text-[1.0625rem] font-medium">The business</h2>
        <p className="mt-0.5 text-[0.875rem] text-ink-mute">How East Meets Wed signs its emails</p>
        <div className="mt-7 space-y-6">
          <TextField label="Business name" defaultValue="East Meets Wed" />
          <TextField label="Contact email" type="email" defaultValue="hello@eastmeetswed.com" />
          <TextField label="Phone" placeholder="Optional" />
        </div>
      </section>
      <section className="border border-ink/[0.09] bg-surface p-6 sm:p-8">
        <h2 className="text-[1.0625rem] font-medium">Invoices</h2>
        <p className="mt-0.5 text-[0.875rem] text-ink-mute">Printed on every vendor&apos;s receipt</p>
        <div className="mt-7 space-y-6">
          <TextField label="ABN" placeholder="00 000 000 000" />
          <TextField label="Invoice number prefix" defaultValue="EMW" hint="Invoices read EMW-0001, EMW-0002 and so on" />
          <TextField label="Address" placeholder="Melbourne, Victoria" />
        </div>
      </section>

      {/* A save bar slides up only once something has changed. */}
      <Portal>
        <AnimatePresence>
          {dirty && (
            <motion.div
              className="fixed inset-x-0 bottom-0 z-40 lg:left-[15rem]"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
            >
              <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 bg-ink px-6 py-4 text-paper sm:mx-[var(--gutter)] sm:mb-4 xl:mx-auto">
                <p className="text-[0.875rem]">You have unsaved changes</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDirty(false);
                      setVersion((v) => v + 1);
                    }}
                    className="h-9 px-4 text-[0.8125rem] text-paper/70 transition-colors hover:text-paper"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDirty(false);
                      toast("Business details saved");
                    }}
                    className="h-9 bg-paper px-5 text-[0.8125rem] font-medium text-ink transition-colors hover:bg-paper/85"
                  >
                    Save changes
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </form>
  );
}

// ── Plans ───────────────────────────────────────────────────────────────

function Plans() {
  const paying = subscriptions.filter(isPaying);
  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {tierOrder.map((t: TierId, i) => {
          const on = paying.filter((s) => s.tier === t);
          return (
            <section key={t} className="relative flex flex-col border border-ink/[0.09] bg-surface">
              <div className="flex flex-1 flex-col p-7">
                {/* The tier's colour matches the revenue charts, as a small key rather than a stripe. */}
                <h2 className="flex items-center gap-3 font-display text-[2rem] leading-none tracking-[-0.02em]">
                  <span className="size-2.5 shrink-0" style={{ background: `var(--color-tier-${i + 1})` }} aria-hidden />
                  {tiers[t].name}
                </h2>
                <p className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-[2.5rem] leading-none font-medium tracking-[-0.03em]">{aud(tiers[t].monthly)}</span>
                  <span className="text-[0.9375rem] text-ink-mute">a month</span>
                </p>
                <p className="mt-2 text-[0.875rem] text-ink-mute">or {aud(tiers[t].annual)} a year, two months free</p>
                <ul className="mt-7 space-y-2.5 border-t hairline pt-6">
                  {tiers[t].perks.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-[0.9375rem] text-ink-soft">
                      <Icon name="check" className="mt-[4px] size-3.5 text-ink" strokeWidth={1.75} />
                      {p}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex items-center gap-3 pt-8">
                  <div className="flex -space-x-2">
                    {on.slice(0, 5).map((s) => (
                      <Avatar key={s.id} name={s.name} src={getVendor(s.slug)?.cover} size={28} className="ring-2 ring-surface" />
                    ))}
                  </div>
                  <p className="text-[0.875rem] text-ink-soft">
                    <span className="font-medium text-ink">{on.length}</span> {on.length === 1 ? "vendor" : "vendors"}
                  </p>
                </div>
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-4 text-[0.8125rem] text-ink-mute">Plan names and prices are placeholders for the demo.</p>
    </>
  );
}

// ── Demo ────────────────────────────────────────────────────────────────

function Demo() {
  const [confirm, setConfirm] = useState(false);
  return (
    <section className="max-w-2xl border border-ink/[0.09] bg-surface p-6 sm:p-8">
      <h2 className="text-[1.0625rem] font-medium">Demo data</h2>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
        The figures in this admin are simulated, and anything you change (posts, vendors, approvals, replies, settings) is kept in this browser so the walkthrough feels
        real. Reset to start again from the original data.
      </p>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        {confirm ? (
          <>
            <Btn
              variant="danger"
              icon="refresh"
              onClick={() => {
                resetDemo();
                setConfirm(false);
                toast("Demo data reset");
              }}
            >
              Yes, reset everything
            </Btn>
            <Btn variant="ghost" onClick={() => setConfirm(false)}>
              Keep my changes
            </Btn>
          </>
        ) : (
          <Btn icon="refresh" onClick={() => setConfirm(true)}>
            Reset demo data
          </Btn>
        )}
      </div>
    </section>
  );
}
