"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { markEnquiryRead, useEnquiries, type Enquiry } from "@/lib/admin/enquiries";
import { ago, day, time } from "@/lib/admin/format";
import { regionLabel, sourceLine, weddingLabel } from "@/lib/enquiry-fields";
import { useSession, useVendorSlug } from "@/lib/admin/session";
import { Bone } from "../charts";
import { Avatar, Badge, Btn, Empty, PageHeader } from "../ui";

/** A vendor's enquiries, newest first. They reply from their own email; opening one here marks it read. */
export function Enquiries() {
  const slug = useVendorSlug();
  const { status, error, list } = useEnquiries(slug);
  const [selected, setSelected] = useState<string | null>(null);
  // On wide screens the first enquiry is open; on phones the list comes first.
  const current = list.find((e) => e.id === selected) ?? null;
  const shown = current ?? list[0];

  return (
    <>
      <PageHeader title="Enquiries" description="Couples who've written to you from your listing. Each one is emailed to you as well." />

      {status === "loading" ? (
        // The inbox's own shape while it loads: the list on the left, an enquiry on the right.
        <div className="grid grid-cols-1 border border-ink/[0.09] bg-surface lg:grid-cols-[22rem_1fr]">
          <ul className="border-ink/[0.09] lg:border-r">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="flex gap-3 border-b border-ink/[0.06] px-5 py-4">
                <Bone className="size-[34px] shrink-0 rounded-full" />
                <span className="flex-1 space-y-2">
                  <Bone className="h-3.5 w-1/2" />
                  <Bone className="h-3 w-4/5" />
                  <Bone className="h-3 w-3/5" />
                </span>
              </li>
            ))}
          </ul>
          <div className="hidden space-y-4 px-8 py-6 lg:block">
            <Bone className="h-7 w-1/3" />
            <Bone className="h-4 w-1/2" />
            <Bone className="mt-8 h-28 w-2/3" />
          </div>
        </div>
      ) : status !== "ready" || list.length === 0 ? (
        <div className="border border-ink/[0.09] bg-surface">
          {status === "error" ? (
            <Empty title="Couldn't load your enquiries">{error}</Empty>
          ) : (
            <Empty title="No enquiries yet">New enquiries arrive here and by email.</Empty>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 border border-ink/[0.09] bg-surface lg:grid-cols-[22rem_1fr]">
          <ul className={clsx("border-ink/[0.09] lg:max-h-[calc(100svh-15rem)] lg:overflow-y-auto lg:border-r", current && "hidden lg:block")}>
            {list.map((e) => {
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
                      <span className="mt-0.5 line-clamp-2 block text-[0.75rem] leading-snug text-ink-mute">{e.message || [weddingLabel(e.weddingDate), regionLabel(e.region)].filter(Boolean).join(" · ")}</span>
                      {!e.readAt && (
                        <span className="mt-2 block">
                          <Badge>New</Badge>
                        </span>
                      )}
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

/** One enquiry in full. `team`: the team reading every vendor's, so it names the vendor and has no reply actions. */
export function Thread({ enquiry: e, onBack, hiddenOnMobile, team }: { enquiry: Enquiry; onBack: () => void; hiddenOnMobile: boolean; team?: boolean }) {
  const session = useSession();

  // Opening it counts as reading it, but only for the vendor themselves, not the team looking in.
  useEffect(() => {
    if (!e.readAt && session?.role === "vendor") markEnquiryRead(e.id).catch(() => {});
  }, [e.id, e.readAt, session?.role]);

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
            <p className="mt-2 text-[0.8125rem] text-ink-soft">
              {team && <>To {e.vendorName} · </>}
              Sent {day(e.sentAt)} at {time(e.sentAt)}
              {e.emailedTo && <> · emailed to {e.emailedTo}</>}
            </p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 text-[0.875rem] sm:grid-cols-2 xl:grid-cols-3">
          {(
            [
              ["Wedding", weddingLabel(e.weddingDate)],
              ["Where", [regionLabel(e.region), e.venue].filter(Boolean).join(", ")],
              ["Guests", e.guests],
              ["Cultures", [e.cultures.join(", "), e.traditions].filter(Boolean).join(". ")],
              ["Found you", sourceLine(e.source, e.sourceDetail)],
              ["Email", e.email],
              ["Phone", e.phone],
            ] as const
          )
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-[0.8125rem] text-ink-soft">{k}</dt>
                <dd className="mt-0.5 break-words text-ink">{v}</dd>
              </div>
            ))}
        </dl>
      </div>

      <div className="flex-1 px-5 py-6 sm:px-8">
        {e.message ? (
          <p className="max-w-[38rem] bg-paper px-5 py-4 text-[0.9375rem] leading-relaxed whitespace-pre-line">{e.message}</p>
        ) : (
          <p className="text-[0.875rem] text-ink-soft">No message, just the details above.</p>
        )}
      </div>

      {!team && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/[0.06] px-5 py-4 sm:px-8">
          <p className="text-[0.8125rem] text-ink-soft">Your reply goes from your own email, straight to {e.name}.</p>
          <Btn variant="primary" icon="mail" href={`mailto:${e.email}?subject=${encodeURIComponent(`Re: your enquiry for ${e.vendorName}`)}`} external>
            Reply by email
          </Btn>
        </div>
      )}
    </article>
  );
}
