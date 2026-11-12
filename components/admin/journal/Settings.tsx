"use client";

import clsx from "clsx";
import { Icon } from "@/components/icons/Icon";
import type { CreditVendor, PostContent } from "@/lib/admin/journal";
import { CATEGORIES, describe, photoUrl, slugify } from "@/lib/journal/blocks";
import { thumbUrl } from "@/lib/supabase/storage";
import { DatePicker } from "../shared/DatePicker";
import { DetailRow, rowInput } from "../shared/DetailRow";
import { Dropdown } from "../shared/Dropdown";

/*
 * The post's details beside it: when it goes live, its category and byline, the vendors it credits
 * (with their photos), its address, and how it looks in Google and when shared, drawn as they'll
 * appear rather than described.
 */

const tz = "Australia/Melbourne";

/** A Melbourne date and time ("2026-11-20", "07:00") as an instant. */
export function melbourneIso(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const offset = (t: number) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-AU", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
        .formatToParts(t)
        .map((x) => [x.type, x.value]),
    );
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - t;
  };
  let t = guess - offset(guess);
  t = guess - offset(t);
  return new Date(t).toISOString();
}

/** An instant as a Melbourne date and time. */
export function melbourneParts(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-CA", { timeZone: tz }),
    time: d.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
  };
}

export type When = { date: string; time: string } | null;

export function Settings({
  content,
  update,
  onSlugTouched,
  slugTaken,
  live,
  liveSlug,
  when,
  onWhen,
  publishedAt,
  vendors,
  words,
  minutes,
}: {
  content: PostContent;
  update: (fn: (c: PostContent) => PostContent) => void;
  onSlugTouched: () => void;
  slugTaken: boolean;
  /** The post is on the blog now. */
  live: boolean;
  liveSlug: string;
  /** A chosen time to go live, or null for "when you publish". */
  when: When;
  onWhen: (w: When) => void;
  publishedAt: string | null;
  vendors: CreditVendor[];
  words: number;
  minutes: number;
}) {
  const set = <K extends keyof PostContent>(k: K, v: PostContent[K]) => update((c) => ({ ...c, [k]: v }));
  const credited = content.vendors.map((id) => vendors.find((v) => v.id === id)).filter((v): v is CreditVendor => !!v);
  const slug = content.slug || slugify(content.title);
  const description = describe(content.description, content.standfirst, content.body);
  const over = content.description.length > 160;

  return (
    <div className="space-y-6">
      <Section title="Publishing">
        <dl>
          <DetailRow plain label="Goes live" htmlFor="post-when">
            {live && !when ? (
              <p className="text-[0.9375rem] text-ink">
                {publishedAt ? new Date(publishedAt).toLocaleString("en-AU", { timeZone: tz, day: "numeric", month: "long", year: "numeric" }) : "Live"}
                <button
                  type="button"
                  onClick={() => onWhen(melbourneParts(publishedAt ?? new Date().toISOString()))}
                  className="ml-3 text-[0.8125rem] text-ink-soft underline decoration-ink/20 underline-offset-[0.25em] hover:text-ink"
                >
                  Change date
                </button>
              </p>
            ) : when ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-36">
                  <DatePicker id="post-when" value={when.date} onChange={(date) => onWhen({ ...when, date })} />
                </div>
                <input
                  type="time"
                  step={900}
                  value={when.time}
                  onChange={(e) => onWhen({ ...when, time: e.target.value || "07:00" })}
                  aria-label="Time"
                  className={clsx(rowInput, "w-auto tabular-nums")}
                />
                <button type="button" onClick={() => onWhen(null)} className="text-[0.8125rem] text-ink-soft underline decoration-ink/20 underline-offset-[0.25em] hover:text-ink">
                  {live ? "Keep the date" : "Publish straight away"}
                </button>
              </div>
            ) : (
              <p className="text-[0.9375rem] text-ink">
                When you publish
                <button
                  type="button"
                  onClick={() => {
                    const tomorrow = new Date(Date.now() + 86_400_000).toLocaleDateString("en-CA", { timeZone: tz });
                    onWhen({ date: tomorrow, time: "07:00" });
                  }}
                  className="ml-3 text-[0.8125rem] text-ink-soft underline decoration-ink/20 underline-offset-[0.25em] hover:text-ink"
                >
                  Schedule
                </button>
              </p>
            )}
          </DetailRow>
          <DetailRow plain label="Category" htmlFor="post-category">
            <Dropdown id="post-category" quiet options={CATEGORIES.map((c) => ({ value: c, label: c }))} value={content.category} onChange={(c) => set("category", c)} placeholder="Choose a category" />
          </DetailRow>
          <DetailRow plain label="Written by" htmlFor="post-author">
            <input id="post-author" value={content.author} onChange={(e) => set("author", e.target.value)} placeholder="East Meets Wed" className={rowInput} />
          </DetailRow>
          <DetailRow plain label="Length">
            <p className="text-[0.9375rem] text-ink">
              {words.toLocaleString("en-AU")} words, {minutes} min read
            </p>
          </DetailRow>
        </dl>
      </Section>

      <Section title="In this story" note="Credited at the end of the post, linked to their pages">
        {credited.length > 0 && (
          <ul className="mb-3 divide-y divide-ink/[0.06] border-y hairline">
            {credited.map((v, i) => (
              <li key={v.id} className="flex items-center gap-3 py-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element -- a thumbnail straight from Storage */}
                {v.photo ? <img src={thumbUrl(v.photo)} alt="" className="size-10 shrink-0 bg-paper-soft object-cover" /> : <span className="size-10 shrink-0 bg-paper-soft" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[1.0625rem] text-ink">{v.name}</span>
                  <span className="block truncate text-[0.8125rem] text-ink-soft">{v.discipline}</span>
                </span>
                <span className="flex shrink-0">
                  <SmallIcon label="Move up" icon="arrow-up" disabled={i === 0} onClick={() => set("vendors", swap(content.vendors, i, i - 1))} />
                  <SmallIcon label="Move down" icon="arrow-down" disabled={i === credited.length - 1} onClick={() => set("vendors", swap(content.vendors, i, i + 1))} />
                  <SmallIcon label={`Remove ${v.name}`} icon="close" onClick={() => set("vendors", content.vendors.filter((x) => x !== v.id))} />
                </span>
              </li>
            ))}
          </ul>
        )}
        <Dropdown
          multiple
          searchable
          options={vendors.map((v) => ({ value: v.id, label: v.name, hint: v.discipline }))}
          value={content.vendors}
          onChange={(ids) => set("vendors", [...content.vendors.filter((id) => ids.includes(id)), ...ids.filter((id) => !content.vendors.includes(id))])}
          placeholder={credited.length ? "Add another vendor" : "Credit the vendors in this story"}
        />
      </Section>

      <Section title="Search and sharing">
        <dl>
          <DetailRow plain label="Address" htmlFor="post-slug">
            <span className="flex items-baseline text-[0.9375rem]">
              <span className="shrink-0 text-ink-soft">/blog/</span>
              <input
                id="post-slug"
                value={content.slug}
                onChange={(e) => {
                  onSlugTouched();
                  set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-/, ""));
                }}
                onBlur={() => set("slug", slugify(content.slug || content.title))}
                placeholder="from-the-title"
                className={clsx(rowInput, "min-w-0 flex-1")}
              />
            </span>
            {slugTaken && <p className="mt-1 text-[0.8125rem] text-bad">Another post uses this address. Choose another before publishing.</p>}
            {live && liveSlug && slug !== liveSlug && !slugTaken && <p className="mt-1 text-[0.8125rem] text-ink-soft">The old address will forward here.</p>}
          </DetailRow>
          <DetailRow plain label="Description" htmlFor="post-description" aside={<span className={clsx("tabular-nums", over && "text-bad")}>{content.description.length} / 160</span>}>
            <textarea
              id="post-description"
              rows={2}
              value={content.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={description || "A sentence or two for Google and share cards"}
              className={clsx(rowInput, "min-h-[2lh] resize-none leading-relaxed [field-sizing:content]")}
            />
          </DetailRow>
        </dl>

        {/* How it turns up in Google, and as a link shared in a message. */}
        <div className="mt-5 border-t hairline pt-5">
          <p className="truncate text-[0.8125rem] text-ink-soft">eastmeetswed.com › blog › {slug || "…"}</p>
          <p className="mt-1 line-clamp-2 text-[1.0625rem] leading-snug text-[#1a0dab]">{content.title || "Title"} · East Meets Wed</p>
          <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-relaxed text-ink-soft">{description || "The opening words of the post show here until you write a description."}</p>
        </div>
        <div className="mt-5 border hairline bg-paper">
          {content.cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- the cover straight from Storage
            <img src={photoUrl(content.cover.src)} alt="" className="aspect-[1.91/1] w-full object-cover" />
          ) : (
            <div className="flex aspect-[1.91/1] w-full items-center justify-center bg-paper-soft text-[0.8125rem] text-ink-soft">The site&rsquo;s own photo, until the post has a cover</div>
          )}
          <div className="px-3.5 py-3">
            <p className="text-[0.75rem] text-ink-soft">eastmeetswed.com</p>
            <p className="mt-0.5 truncate text-[0.9375rem] text-ink">{content.title || "Title"} · East Meets Wed</p>
          </div>
        </div>
      </Section>
    </div>
  );
}

const swap = <T,>(list: T[], a: number, b: number) => {
  const next = [...list];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
};

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface px-5 py-5 sm:px-6">
      <h2 className="font-display text-[1.25rem] text-ink">{title}</h2>
      {note && <p className="mt-0.5 text-[0.8125rem] text-ink-soft">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SmallIcon({ label, icon, onClick, disabled }: { label: string; icon: "arrow-up" | "arrow-down" | "close"; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="flex size-7 items-center justify-center text-ink-mute transition-colors hover:text-ink disabled:opacity-25">
      <Icon name={icon} className="size-3.5" strokeWidth={1.5} />
    </button>
  );
}
