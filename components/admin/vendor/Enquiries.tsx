"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { markEnquiry, useEnquiries, type Enquiry } from "@/lib/admin/enquiries";
import { ago, day, time } from "@/lib/admin/format";
import { useSession, useVendorSlug } from "@/lib/admin/session";
import { hoursSince } from "@/lib/admin/time";
import { toast } from "@/lib/admin/toast";
import { Avatar, Badge, Btn, Empty, PageHeader, Tabs } from "../ui";

type Filter = "waiting" | "replied" | "all";

export function Enquiries() {
  const slug = useVendorSlug();
  const { status, error, list: mine } = useEnquiries(slug);
  const waiting = mine.filter((e) => !e.repliedAt);
  const [filter, setFilter] = useState<Filter>("waiting");
  const [selected, setSelected] = useState<string | null>(null);
  // An enquiry just marked as replied stays in the Waiting list until another is opened, so it stays on screen.
  const list = filter === "waiting" ? mine.filter((e) => !e.repliedAt || e.id === selected) : filter === "replied" ? mine.filter((e) => e.repliedAt) : mine;
  // On wide screens the first enquiry is open; on phones the list comes first.
  const current = list.find((e) => e.id === selected) ?? null;
  const shown = current ?? list[0];

  return (
    <>
      <PageHeader title="Enquiries" description="Couples who've asked about your services. Reply within two days and you're far more likely to be booked." />
      <Tabs
        className="mb-6"
        value={filter}
        onChange={(f) => {
          setFilter(f);
          setSelected(null);
        }}
        tabs={[
          { id: "waiting", label: "Waiting", count: waiting.length },
          { id: "replied", label: "Replied", count: mine.length - waiting.length },
          { id: "all", label: "All", count: mine.length },
        ]}
      />

      {status !== "ready" || list.length === 0 ? (
        <div className="border border-ink/[0.09] bg-surface">
          {status === "loading" ? (
            <Empty title="Loading">Fetching your enquiries.</Empty>
          ) : status === "error" ? (
            <Empty title="Couldn't load your enquiries">{error}</Empty>
          ) : (
            <Empty title={filter === "waiting" && mine.length ? "You're all caught up" : "No enquiries yet"}>New enquiries arrive here and by email.</Empty>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 border border-ink/[0.09] bg-surface lg:grid-cols-[22rem_1fr]">
          <ul className={clsx("border-ink/[0.09] lg:max-h-[calc(100svh-15rem)] lg:overflow-y-auto lg:border-r", current && "hidden lg:block")}>
            {list.map((e) => {
              const hours = hoursSince(e.sentAt);
              const active = shown?.id === e.id;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(e.id)}
                    aria-current={active ? "true" : undefined}
                    className={clsx("flex w-full gap-3 border-b border-ink/[0.06] px-5 py-4 text-left transition-colors", active ? "lg:bg-paper" : "hover:bg-paper/60")}
                  >
                    <Avatar name={e.name} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={clsx("truncate text-[0.875rem]", !e.readAt && "font-medium")}>{e.name}</span>
                        <span className="shrink-0 text-[0.6875rem] text-ink-mute">{ago(e.sentAt)}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[0.75rem] leading-snug text-ink-mute">{e.message}</span>
                      {!e.repliedAt && <span className="mt-2 block">{hours >= 48 ? <Badge tone="warn">Waiting {Math.round(hours)}h</Badge> : !e.readAt && <Badge>New</Badge>}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {shown && <Thread key={shown.id} enquiry={shown} onBack={() => setSelected(null)} hiddenOnMobile={!current} />}
        </div>
      )}
    </>
  );
}

function Thread({ enquiry: e, onBack, hiddenOnMobile }: { enquiry: Enquiry; onBack: () => void; hiddenOnMobile: boolean }) {
  const session = useSession();
  const hours = hoursSince(e.sentAt);
  const [saving, setSaving] = useState(false);

  // Opening it counts as reading it, but only for the vendor themselves, not the team looking in.
  useEffect(() => {
    if (!e.readAt && session?.role === "vendor") markEnquiry(e.id, "read").catch(() => {});
  }, [e.id, e.readAt, session?.role]);

  const replied = async () => {
    setSaving(true);
    try {
      await markEnquiry(e.id, "replied");
      toast(`Marked as replied to ${e.name}`);
    } catch (err) {
      toast(`Couldn't save that: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className={clsx("flex min-w-0 flex-col", hiddenOnMobile && "hidden lg:flex")}>
      <div className="border-b border-ink/[0.06] px-5 py-5 sm:px-8">
        <button type="button" onClick={onBack} className="t-small mb-4 inline-flex items-center gap-1.5 hover:text-ink lg:hidden">
          <Icon name="chevron-left" className="size-3.5" strokeWidth={1.5} />
          All enquiries
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[1.75rem] leading-none tracking-[-0.02em]">{e.name}</h2>
            <p className="mt-2 text-[0.75rem] text-ink-mute">
              Sent {day(e.sentAt)} at {time(e.sentAt)}
            </p>
          </div>
          {e.repliedAt ? <Badge tone="good">Replied {ago(e.repliedAt)}</Badge> : hours >= 48 && <Badge tone="warn">Waiting {Math.round(hours)} hours</Badge>}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-[0.8125rem] sm:grid-cols-3">
          {(
            [
              ["Wedding date", e.weddingDate ? day(e.weddingDate, { year: true }) : "Not given"],
              ["Email", e.email],
              ["Phone", e.phone ?? "Not given"],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[0.75rem] text-ink-mute">{k}</dt>
              <dd className="mt-0.5 break-words">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex-1 px-5 py-6 sm:px-8">
        <div className="max-w-[36rem] bg-paper px-4 py-3.5">
          <p className="mb-1.5 text-[0.75rem] text-ink-mute">
            {e.name} · {ago(e.sentAt)}
          </p>
          <p className="text-[0.875rem] leading-relaxed whitespace-pre-line">{e.message}</p>
        </div>
      </div>

      {!e.repliedAt && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/[0.06] px-5 py-4 sm:px-8">
          <p className="text-[0.75rem] text-ink-mute">Reply from your own email, then mark it here.</p>
          <div className="flex gap-2">
            <Btn onClick={() => void replied()} disabled={saving}>
              Mark as replied
            </Btn>
            <Btn variant="primary" icon="mail" href={`mailto:${e.email}?subject=${encodeURIComponent("Your enquiry on East Meets Wed")}`} external>
              Reply by email
            </Btn>
          </div>
        </div>
      )}
    </article>
  );
}
