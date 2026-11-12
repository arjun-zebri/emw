"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Portal } from "@/components/ui/Portal";
import { tierOrder, tiers, type TierId } from "@/lib/admin/billing";
import { aud, day } from "@/lib/admin/format";
import { resetDemo } from "@/lib/admin/store";
import { toast } from "@/lib/admin/toast";
import { supabase } from "@/lib/supabase/browser";
import { Avatar, Btn, Empty, PageHeader, Tabs, TextField } from "../ui";

type Tab = "team" | "business" | "plans" | "demo";

// The roles the database knows (team_role): owners manage the team, editors run the site.
type Role = "owner" | "editor";
const roles: Record<Role, { label: string; blurb: string }> = {
  owner: { label: "Owner", blurb: "Runs the business" },
  editor: { label: "Editor", blurb: "Looks after the directory" },
};

/** Who can do what, read across the roles. */
const permissions: [string, Role[]][] = [
  ["See dashboards and reports", ["owner", "editor"]],
  ["Approve vendors, Real Weddings and reviews", ["owner", "editor"]],
  ["Edit vendor listings", ["owner", "editor"]],
  ["Write and publish journal posts", ["owner", "editor"]],
  ["Billing, plans and refunds", ["owner"]],
  ["Change people's roles", ["owner"]],
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
          { id: "demo", label: "This browser" },
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

type Member = { id: string; name: string; role: Role; joined: string };

/** The team, as the database has it (team_members). Owners can change roles; row level security enforces it. */
function useTeam() {
  const [team, setTeam] = useState<{ status: "loading" | "ready" | "error"; error?: string; members: Member[]; me?: string }>({ status: "loading", members: [] });
  useEffect(() => {
    let live = true;
    (async () => {
      const db = supabase();
      const [{ data, error }, { data: auth }] = await Promise.all([db.from("team_members").select("user_id, name, role, created_at").order("created_at"), db.auth.getUser()]);
      if (!live) return;
      if (error) return setTeam({ status: "error", error: error.message, members: [] });
      setTeam({
        status: "ready",
        me: auth.user?.id,
        members: data.map((m) => ({ id: m.user_id, name: m.name ?? "Unnamed", role: m.role, joined: m.created_at })),
      });
    })();
    return () => {
      live = false;
    };
  }, []);
  const setRole = async (m: Member, role: Role) => {
    const { error } = await supabase().from("team_members").update({ role }).eq("user_id", m.id);
    if (error) return toast(`Couldn't change that: ${error.message}`);
    setTeam((t) => ({ ...t, members: t.members.map((x) => (x.id === m.id ? { ...x, role } : x)) }));
    toast(`${m.name} is now ${role === "owner" ? "an owner" : "an editor"}`);
  };
  return { ...team, setRole };
}

function Team() {
  const team = useTeam();
  const iAmOwner = team.members.some((m) => m.id === team.me && m.role === "owner");

  return (
    <div className="space-y-6">
      <section className="min-w-0 border border-ink/[0.09] bg-surface">
        <div className="px-6 py-5">
          <h2 className="text-[1.0625rem] font-medium">People</h2>
          <p className="mt-0.5 text-[0.875rem] text-ink-mute">
            {team.status === "ready" ? `${team.members.length} with access to the admin` : "Who can sign in to the admin"}
          </p>
        </div>
        {team.status === "loading" ? (
          <Empty title="Loading" className="border-t border-ink/[0.06]" />
        ) : team.status === "error" ? (
          <Empty title="Couldn't load the team" className="border-t border-ink/[0.06]">
            {team.error}
          </Empty>
        ) : (
          <ul>
            {team.members.map((m) => {
              const you = m.id === team.me;
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-ink/[0.06] px-6 py-5">
                  <Avatar name={m.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[0.9375rem] text-ink">
                      {m.name}
                      {you && <span className="bg-ink/[0.06] px-1.5 py-0.5 text-[0.6875rem] text-ink-soft">You</span>}
                    </p>
                    <p className="truncate text-[0.875rem] text-ink-mute">Since {day(m.joined, { year: true })}</p>
                  </div>
                  {you || !iAmOwner ? (
                    <span className="w-40 border border-transparent py-2 pl-3 text-[0.875rem] text-ink-soft">{roles[m.role].label}</span>
                  ) : (
                    <label className="relative w-40">
                      <span className="sr-only">Role for {m.name}</span>
                      <select
                        value={m.role}
                        onChange={(e) => void team.setRole(m, e.target.value as Role)}
                        className="w-full cursor-pointer appearance-none border border-ink/15 bg-surface py-2 pr-8 pl-3 text-[0.875rem] transition-colors hover:border-ink/40 focus:border-ink focus:outline-none"
                      >
                        {(Object.keys(roles) as Role[]).map((r) => (
                          <option key={r} value={r}>
                            {roles[r].label}
                          </option>
                        ))}
                      </select>
                      <Icon name="chevron-down" className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-mute" strokeWidth={1.25} />
                    </label>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="border-t border-ink/[0.06] px-6 py-4 text-[0.8125rem] text-ink-mute">New people are given an account and a password by your developer, then appear here.</p>
      </section>

      <section className="min-w-0 border border-ink/[0.09] bg-surface">
        <div className="px-6 py-5">
          <h2 className="text-[1.0625rem] font-medium">What each role can do</h2>
          <p className="mt-0.5 text-[0.875rem] text-ink-mute">An owner can change someone&apos;s role from the list above</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-t border-ink/[0.06]">
                <th className="px-6 py-4 text-[0.8125rem] font-normal text-ink-mute">Access</th>
                {(Object.keys(roles) as Role[]).map((r) => (
                  <th key={r} className="w-[18%] px-4 py-4 text-center font-normal">
                    <span className="block font-display text-[1.375rem] leading-none tracking-[-0.01em]">{roles[r].label}</span>
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
                        <Icon name="check" className="mx-auto size-4 text-ink" strokeWidth={1.75} title={`${roles[r].label}: yes`} />
                      ) : (
                        <span className="text-ink-mute/40" aria-label={`${roles[r].label}: no`}>
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
  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {tierOrder.map((t: TierId, i) => {
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
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-4 text-[0.8125rem] text-ink-mute">Plan names and prices are placeholders until they&apos;re confirmed. Vendors choose a plan when billing starts.</p>
    </>
  );
}

// ── Demo ────────────────────────────────────────────────────────────────

function Demo() {
  const [confirm, setConfirm] = useState(false);
  return (
    <section className="max-w-2xl border border-ink/[0.09] bg-surface p-6 sm:p-8">
      <h2 className="text-[1.0625rem] font-medium">Saved in this browser</h2>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
        Some changes are still kept in this browser until they move to the database: vendors added here, listing edits and alert
        settings. Approvals, enquiries and the team are already in the database and aren&apos;t affected. Reset clears what this browser holds.
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
                toast("Cleared from this browser");
              }}
            >
              Yes, clear it
            </Btn>
            <Btn variant="ghost" onClick={() => setConfirm(false)}>
              Keep my changes
            </Btn>
          </>
        ) : (
          <Btn icon="refresh" onClick={() => setConfirm(true)}>
            Clear this browser&apos;s changes
          </Btn>
        )}
      </div>
    </section>
  );
}
