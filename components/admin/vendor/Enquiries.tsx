"use client";

import clsx from "clsx";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { ago, day, time } from "@/lib/admin/format";
import { enquiries, type Enquiry } from "@/lib/admin/people";
import { useVendorSlug } from "@/lib/admin/session";
import { update, useAdmin } from "@/lib/admin/store";
import { hoursSince } from "@/lib/admin/time";
import { toast } from "@/lib/admin/toast";
import { Avatar, Badge, Btn, Empty, PageHeader, Tabs, inputCls } from "../ui";

type Filter = "waiting" | "replied" | "all";

export function Enquiries() {
  const slug = useVendorSlug();
  const state = useAdmin();
  const mine = enquiries.filter((e) => e.vendor === slug);
  const replyOf = (e: Enquiry) => state.replies[e.id] ?? e.reply;
  const waiting = mine.filter((e) => !replyOf(e));
  const [filter, setFilter] = useState<Filter>(waiting.length ? "waiting" : "all");
  const [selected, setSelected] = useState<string | null>(null);
  // An enquiry just replied to stays in the Waiting list until another is opened, so the sent reply stays on screen.
  const list = filter === "waiting" ? mine.filter((e) => !replyOf(e) || e.id === selected) : filter === "replied" ? mine.filter((e) => replyOf(e)) : mine;
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

      {list.length === 0 ? (
        <div className="border border-ink/[0.09] bg-surface">
          <Empty title={filter === "waiting" ? "You're all caught up" : "No enquiries yet"}>New enquiries arrive here and by email.</Empty>
        </div>
      ) : (
        <div className="grid grid-cols-1 border border-ink/[0.09] bg-surface lg:grid-cols-[22rem_1fr]">
          <ul className={clsx("border-ink/[0.09] lg:max-h-[calc(100svh-15rem)] lg:overflow-y-auto lg:border-r", current && "hidden lg:block")}>
            {list.map((e) => {
              const replied = !!replyOf(e);
              const hours = hoursSince(e.sentAt);
              const active = shown?.id === e.id;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(e.id)}
                    aria-current={active ? "true" : undefined}
                    className={clsx(
                      "flex w-full gap-3 border-b border-ink/[0.06] px-5 py-4 text-left transition-colors",
                      active ? "lg:bg-paper" : "hover:bg-paper/60",
                    )}
                  >
                    <Avatar name={e.couple} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={clsx("truncate text-[0.875rem]", !replied && "font-medium")}>{e.couple}</span>
                        <span className="shrink-0 text-[0.6875rem] text-ink-mute">{ago(e.sentAt)}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[0.75rem] leading-snug text-ink-mute">{e.message}</span>
                      {!replied && (
                        <span className="mt-2 block">
                          {hours >= 48 ? <Badge tone="warn">Waiting {Math.round(hours)}h</Badge> : <Badge>New</Badge>}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {shown && <Thread key={shown.id} enquiry={shown} reply={replyOf(shown)} onBack={() => setSelected(null)} hiddenOnMobile={!current} />}
        </div>
      )}
    </>
  );
}

function Thread({ enquiry: e, reply, onBack, hiddenOnMobile }: { enquiry: Enquiry; reply?: { at: string; text: string }; onBack: () => void; hiddenOnMobile: boolean }) {
  const [text, setText] = useState("");
  const hours = hoursSince(e.sentAt);

  const send = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!text.trim()) return;
    update((s) => ({ replies: { ...s.replies, [e.id]: { at: new Date().toISOString(), text: text.trim() } } }));
    toast(`Reply sent to ${e.couple}`);
    setText("");
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
            <h2 className="font-display text-[1.75rem] leading-none tracking-[-0.02em]">{e.couple}</h2>
            <p className="mt-2 text-[0.75rem] text-ink-mute">
              Sent {day(e.sentAt)} at {time(e.sentAt)}
            </p>
          </div>
          {!reply && hours >= 48 && <Badge tone="warn">Waiting {Math.round(hours)} hours</Badge>}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-[0.8125rem] sm:grid-cols-4">
          {[
            ["Wedding date", day(e.weddingDate, { year: true })],
            ["Guests", e.guests],
            ["Traditions", e.traditions],
            ["Contact", e.phone ?? e.email],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[0.75rem] text-ink-mute">{k}</dt>
              <dd className="mt-0.5 break-words">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex-1 space-y-4 px-5 py-6 sm:px-8">
        <Message who={e.couple} at={e.sentAt} text={e.message} />
        {reply && <Message who="You" at={reply.at} text={reply.text} mine />}
      </div>

      {!reply && (
        <form onSubmit={send} className="border-t border-ink/[0.06] px-5 py-4 sm:px-8">
          <label htmlFor={`reply-${e.id}`} className="sr-only">
            Reply to {e.couple}
          </label>
          <textarea
            id={`reply-${e.id}`}
            rows={4}
            value={text}
            onChange={(ev) => setText(ev.target.value)}
            placeholder={`Reply to ${e.couple.split(" & ")[0]}`}
            className={clsx(inputCls, "resize-none leading-relaxed")}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[0.75rem] text-ink-mute">Sent by email to {e.email}</p>
            <Btn variant="primary" type="submit" icon="send" disabled={!text.trim()}>
              Send reply
            </Btn>
          </div>
        </form>
      )}
    </article>
  );
}

function Message({ who, at, text, mine }: { who: string; at: string; text: string; mine?: boolean }) {
  return (
    <div className={clsx("max-w-[36rem] px-4 py-3.5", mine ? "ml-auto bg-ink text-paper" : "bg-paper")}>
      <p className={clsx("mb-1.5 text-[0.75rem]", mine ? "text-paper/60" : "text-ink-mute")}>
        {who} · {ago(at)}
      </p>
      <p className="text-[0.875rem] leading-relaxed">{text}</p>
    </div>
  );
}
