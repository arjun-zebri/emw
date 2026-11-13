"use client";

import clsx from "clsx";
import { AnimatePresence, motion, Reorder } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import type { CreditVendor, PostContent } from "@/lib/admin/journal";
import { describe, photoUrl, slugify } from "@/lib/journal/blocks";
import { thumbUrl } from "@/lib/supabase/storage";
import { Dropdown } from "../shared/Dropdown";

/*
 * The post's details beside it: its category and byline, the vendors it credits (with their photos,
 * dragged into order), its address, and how it looks in Google and when shared, drawn as they'll
 * appear rather than described. Whatever can be changed sits in a box; the previews are just shown.
 * Where the post stands is in the bar above, so it isn't repeated here.
 */

/** A box around anything that can be typed in. */
const box = "border border-ink/15 bg-surface transition-colors hover:border-ink/30 focus-within:border-ink/40";
const field = "w-full bg-transparent text-[0.9375rem] text-ink placeholder:text-ink-mute/50 focus:outline-none";

export function Settings({
  content,
  update,
  onSlugTouched,
  slugTaken,
  live,
  liveSlug,
  categories,
  vendors,
}: {
  content: PostContent;
  update: (fn: (c: PostContent) => PostContent) => void;
  onSlugTouched: () => void;
  slugTaken: boolean;
  /** The post is in the journal now. */
  live: boolean;
  liveSlug: string;
  /** Every category in use, and the house ones. */
  categories: string[];
  vendors: CreditVendor[];
}) {
  const set = <K extends keyof PostContent>(k: K, v: PostContent[K]) => update((c) => ({ ...c, [k]: v }));
  const credited = content.vendors.map((id) => vendors.find((v) => v.id === id)).filter((v): v is CreditVendor => !!v);
  const slug = content.slug || slugify(content.title);
  const description = describe(content.description, content.standfirst, content.body);
  const over = content.description.length > 160;
  const categoryOptions = useMemo(
    () => [...new Set([...categories, content.category])].sort((a, b) => a.localeCompare(b)).map((c) => ({ value: c, label: c })),
    [categories, content.category],
  );

  return (
    <div className="space-y-6">
      <Section title="Details">
        <div className="space-y-4">
          <Field label="Category" htmlFor="post-category">
            <Dropdown
              id="post-category"
              boxed
              single
              searchable
              create="Add"
              options={categoryOptions}
              value={content.category}
              onChange={(c) => set("category", c.trim().replace(/\s+/g, " ").slice(0, 40))}
              placeholder="Choose a category"
            />
          </Field>
          <Field label="Written by" htmlFor="post-author">
            <span className={clsx("flex h-10 items-center px-3", box)}>
              <input id="post-author" value={content.author} onChange={(e) => set("author", e.target.value)} placeholder="East Meets Wed" className={field} />
            </span>
          </Field>
        </div>
      </Section>

      <Section title="In this story" note="Credited at the end of the post, linked to their pages">
        <VendorPicker vendors={vendors} chosen={content.vendors} onAdd={(id) => set("vendors", [...content.vendors.filter((x) => x !== id), id])} />
        {credited.length > 1 && <p className="mt-4 text-[0.8125rem] text-ink-soft">Drag to change the order.</p>}
        <Reorder.Group
          axis="y"
          values={credited.map((v) => v.id)}
          onReorder={(ids) => set("vendors", [...ids, ...content.vendors.filter((id) => !ids.includes(id))])}
          className={credited.length > 1 ? "mt-2" : "mt-3"}
        >
          <AnimatePresence initial={false}>
            {credited.map((v) => (
              <Reorder.Item
                key={v.id}
                value={v.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                whileDrag={{ scale: 1.02, boxShadow: "0 18px 36px -18px rgb(22 20 18 / 0.3)" }}
                className="group/vendor relative cursor-grab bg-surface active:cursor-grabbing"
              >
                <div className="flex items-center gap-3 border-t hairline py-2.5">
                  <Icon name="grip" className="-ml-1 size-3.5 shrink-0 text-ink-mute/60 transition-colors group-hover/vendor:text-ink-soft" strokeWidth={1.5} />
                  {/* eslint-disable-next-line @next/next/no-img-element -- a thumbnail straight from Storage */}
                  {v.photo ? <img src={thumbUrl(v.photo)} alt="" draggable={false} className="size-10 shrink-0 bg-paper-soft object-cover" /> : <span className="size-10 shrink-0 bg-paper-soft" />}
                  <span className="min-w-0 flex-1 select-none">
                    <span className="block truncate font-display text-[1.0625rem] text-ink">{v.name}</span>
                    <span className="block truncate text-[0.8125rem] text-ink-soft">{v.discipline}</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${v.name}`}
                    title="Remove"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => set("vendors", content.vendors.filter((x) => x !== v.id))}
                    className="flex size-7 shrink-0 items-center justify-center text-ink-mute opacity-0 transition hover:text-ink focus-visible:opacity-100 group-hover/vendor:opacity-100 max-lg:opacity-100"
                  >
                    <Icon name="close" className="size-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </Section>

      <Section title="Search and sharing">
        <div className="space-y-4">
          <Field label="Address" htmlFor="post-slug">
            <span className={clsx("flex h-10 items-center px-3 text-[0.9375rem]", box)}>
              <span className="shrink-0 text-ink-soft">/journal/</span>
              <input
                id="post-slug"
                value={content.slug}
                onChange={(e) => {
                  onSlugTouched();
                  set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-/, ""));
                }}
                onBlur={() => set("slug", slugify(content.slug || content.title))}
                placeholder="from-the-title"
                className={clsx(field, "min-w-0 flex-1")}
              />
            </span>
            {slugTaken && <p className="mt-1.5 text-[0.8125rem] text-bad">Another post uses this address. Choose another before publishing.</p>}
            {live && liveSlug && slug !== liveSlug && !slugTaken && <p className="mt-1.5 text-[0.8125rem] text-ink-soft">The old address will forward here.</p>}
          </Field>
          <Field label="Description" htmlFor="post-description" aside={<span className={clsx("tabular-nums", over && "text-bad")}>{content.description.length} / 160</span>}>
            <span className={clsx("block px-3 py-2", box)}>
              <textarea
                id="post-description"
                rows={2}
                value={content.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder={description || "A sentence or two for Google and share cards"}
                className={clsx(field, "block min-h-[2lh] resize-none leading-relaxed [field-sizing:content]")}
              />
            </span>
          </Field>
        </div>

        {/* How it turns up in Google, and as a link shared in a message. */}
        <p className="mt-6 text-[0.8125rem] text-ink-soft">How it shows in Google, and shared as a link</p>
        <div className="mt-3 border-t hairline pt-4">
          <p className="truncate text-[0.8125rem] text-ink-soft">eastmeetswed.com › journal › {slug || "…"}</p>
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

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface px-5 py-5 sm:px-6">
      <h2 className="font-display text-[1.25rem] text-ink">{title}</h2>
      {note && <p className="mt-0.5 text-[0.8125rem] text-ink-soft">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Find a vendor by name and add them. The list opens over what's below, and the field never moves,
 * so several can be added in a row; the ones already credited aren't offered again.
 */
function VendorPicker({ vendors, chosen, onAdd }: { vendors: CreditVendor[]; chosen: string[]; onAdd: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();
  const q = query.trim().toLowerCase();
  const shown = vendors.filter((v) => !chosen.includes(v.id) && (!q || v.name.toLowerCase().includes(q) || v.discipline.toLowerCase().includes(q)));

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (root.current?.contains(e.target as Node)) return;
      setOpen(false);
      setQuery("");
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const add = (v: CreditVendor | undefined) => {
    if (!v) return;
    onAdd(v.id);
    setActive((i) => Math.max(0, Math.min(i, shown.length - 2)));
  };

  return (
    <div ref={root} className="relative">
      <label className={clsx("flex h-10 items-center gap-2.5 border bg-surface px-3 transition-colors", open ? "border-ink/40" : "border-ink/15 hover:border-ink/30")}>
        <Icon name="search" className="size-3.5 shrink-0 text-ink-mute" strokeWidth={1.5} />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(shown.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              add(shown[active]);
            } else if (e.key === "Escape" || e.key === "Tab") {
              setOpen(false);
              setQuery("");
            }
          }}
          placeholder="Add a vendor"
          aria-label="Add a vendor"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          className="w-full bg-transparent text-[0.875rem] text-ink placeholder:text-ink-mute/60 focus:outline-none"
        />
      </label>
      <AnimatePresence>
        {open && (
          <motion.ul
            ref={list}
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={(e) => e.preventDefault()}
            className="absolute inset-x-0 top-[calc(100%+0.375rem)] z-40 max-h-72 overflow-y-auto overscroll-contain border border-ink/10 bg-surface py-1.5 shadow-[0_24px_48px_-20px_rgb(22_20_18/0.22)]"
          >
            {shown.map((v, i) => (
              <li
                key={v.id}
                role="option"
                aria-selected={i === active}
                data-index={i}
                onPointerMove={() => setActive(i)}
                onClick={() => add(v)}
                className={clsx("flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors duration-150", i === active && "bg-paper")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a thumbnail straight from Storage */}
                {v.photo ? <img src={thumbUrl(v.photo)} alt="" className="size-8 shrink-0 bg-paper-soft object-cover" /> : <span className="size-8 shrink-0 bg-paper-soft" />}
                <span className="min-w-0 flex-1 truncate text-[0.875rem] text-ink">{v.name}</span>
                <span className="shrink-0 text-[0.75rem] text-ink-mute">{v.discipline}</span>
              </li>
            ))}
            {shown.length === 0 && <li className="px-3 py-2.5 text-[0.8125rem] text-ink-soft">{q ? `No vendor called ‘${query.trim()}’` : "Every vendor is credited"}</li>}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, htmlFor, aside, children }: { label: string; htmlFor: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-4 text-[0.8125rem]">
        <label htmlFor={htmlFor} className="text-ink-soft">
          {label}
        </label>
        {aside && <span className="text-ink-mute">{aside}</span>}
      </div>
      {children}
    </div>
  );
}
