"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import { Gallery, GalleryImage } from "@/components/vendor/Gallery";
import { languages as languageNames, serviceLabels, states } from "@/data/taxonomy";
import {
  decide as decideVendor,
  flagLabels,
  loadDraft,
  loadMore,
  missingLabels,
  reopen,
  reorderPhotos,
  retry,
  setQuery,
  useQueue,
  type Decision,
  type Draft,
  type DraftPhoto,
  type Flag,
  type QueueRow,
  type ReviewNotes,
  type Sort,
} from "@/lib/admin/drafts";
import { ago, day } from "@/lib/admin/format";
import type { Review, Submission } from "@/lib/admin/people";
import { decide, deletePost, nowIso, savePost, slugify, undecide, useAdmin } from "@/lib/admin/store";
import { toast } from "@/lib/admin/toast";
import { thumbUrl } from "@/lib/supabase/storage";
import { getVendor } from "@/lib/static-vendors";
import type { VendorFormValues } from "../shared/VendorForm";
import { ListingPreview } from "../shared/VendorPreview";
import { Drawer } from "../Drawer";
import { Avatar, Badge, Btn, Empty, PageHeader, Panel, Tabs, inputCls } from "../ui";

type Tab = "ready" | "missing" | "weddings" | "reviews";
const tabs: Tab[] = ["ready", "missing", "weddings", "reviews"];
const isQueueTab = (t: Tab): t is "ready" | "missing" => t === "ready" || t === "missing";

// Couples can't send Real Weddings or reviews until the site is live, so these start empty: no
// sample data. The detail views below are ready for when they arrive.
type Item = { kind: "wedding"; data: Submission } | { kind: "review"; data: Review };
const incoming: Record<"weddings" | "reviews", Item[]> = {
  weddings: [],
  reviews: [],
};

const sorts: { value: Sort; label: string }[] = [
  { value: "ready", label: "Most ready first" },
  { value: "name", label: "A to Z" },
  { value: "newest", label: "Newest first" },
];

const desktopQuery = "(min-width: 1024px)";
const useDesktop = () =>
  useSyncExternalStore(
    (l) => {
      const m = matchMedia(desktopQuery);
      m.addEventListener("change", l);
      return () => m.removeEventListener("change", l);
    },
    () => matchMedia(desktopQuery).matches,
    () => true,
  );

const vendorName = (slug: string) => getVendor(slug)?.name ?? slug;
const itemTitle = (item: Item) => (item.kind === "wedding" ? item.data.couple : `${item.data.couple} on ${vendorName(item.data.vendor)}`);
const draftId = (s: Submission) => `p-${s.id}`;

export function Approvals() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const state = useAdmin();
  const desktop = useDesktop();
  const queue = useQueue();
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<PanelView>("listing");

  const raw = params.get("tab");
  const tab: Tab = raw === "vendors" ? "ready" : tabs.includes(raw as Tab) ? (raw as Tab) : "ready";
  const requested = params.get("item");
  const onQueue = isQueueTab(tab);

  useEffect(() => {
    if (isQueueTab(tab)) setQuery({ tab });
  }, [tab]);

  const rows = onQueue && queue.query.tab === tab ? queue.list.rows : [];
  const row = onQueue ? rows.find((r) => r.id === requested) : undefined;
  const rowIndex = row ? rows.indexOf(row) : -1;
  const draft = row ? queue.details[row.id] : undefined;
  useEffect(() => {
    if (row) void loadDraft(row.id);
  }, [row]);

  const open = onQueue ? [] : incoming[tab].filter((i) => !state.decisions[i.data.id]);
  const decidedItems = onQueue ? [] : incoming[tab].filter((i) => state.decisions[i.data.id]);
  const item = !onQueue ? (open.find((i) => i.data.id === requested) ?? (desktop ? open[0] : undefined)) : undefined;

  const go = (next: { tab?: Tab; item?: string | null }) => {
    const p = new URLSearchParams();
    const t = next.tab ?? tab;
    if (t !== "ready") p.set("tab", t);
    const id = next.item === undefined ? requested : next.item;
    if (id) p.set("item", id);
    router.replace(p.size ? `${pathname}?${p}` : pathname, { scroll: false });
  };

  const counts = {
    ready: queue.counts?.ready,
    missing: queue.counts?.missing,
    weddings: incoming.weddings.length,
    reviews: incoming.reviews.length,
  };

  // ── Vendors: saved to the database; the queue moves on once it has the change.
  const neighbour = (id: string) => {
    const i = rows.findIndex((r) => r.id === id);
    return rows[i + 1]?.id ?? rows[i - 1]?.id ?? null;
  };
  const decideRow = async (r: QueueRow, verdict: "approved" | "declined", note?: string) => {
    if (busy) return;
    setBusy(true);
    const next = neighbour(r.id);
    try {
      await decideVendor(r, verdict, note);
      toast(verdict === "approved" ? `${r.name} approved` : `${r.name} declined`, { label: "Undo", run: () => void undoVendor(r.id) });
      go({ item: next });
    } catch (e) {
      toast(`Couldn't save that: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };
  const undoVendor = async (vendorId: string) => {
    try {
      await reopen(vendorId);
    } catch (e) {
      toast(`Couldn't undo that: ${(e as Error).message}`);
    }
  };

  // ── Real Weddings and reviews: decided in the browser store until they come from the database.
  const nextAfter = (id: string) => {
    const i = open.findIndex((x) => x.data.id === id);
    return open[i + 1]?.data.id ?? open[i - 1]?.data.id ?? null;
  };
  const approveItem = (it: Item) => {
    const id = it.data.id;
    decide(id, "approved");
    if (it.kind === "wedding") {
      const s = it.data;
      savePost({
        id: draftId(s),
        slug: slugify(s.title),
        title: s.title,
        standfirst: `${s.couple}, ${s.place}`,
        category: "Real weddings",
        cover: { src: s.photos[0], alt: `${s.couple} on their wedding day` },
        body: [
          { id: "b1", type: "p", text: s.story },
          ...s.photos.slice(1).map((src, i) => ({
            id: `img${i}`,
            type: "img" as const,
            src,
            alt: `${s.couple}, photo ${i + 2}`,
          })),
        ],
        vendors: s.vendors,
        status: "draft",
        date: s.date,
        updated: nowIso(),
        author: "East Meets Wed",
        description: s.title,
      });
      toast(`${s.couple}'s wedding saved as a draft`, {
        label: "Open draft",
        run: () => router.push(`/admin/journal/${draftId(s)}`),
      });
    } else {
      toast(`Review published on ${vendorName(it.data.vendor)}`, {
        label: "Undo",
        run: () => undecide(id),
      });
    }
    go({ item: nextAfter(id) });
  };
  const declineItem = (it: Item, note?: string) => {
    const id = it.data.id;
    decide(id, "declined", note);
    toast(`${itemTitle(it)} declined`, {
      label: "Undo",
      run: () => undecide(id),
    });
    go({ item: nextAfter(id) });
  };
  const undoItem = (it: Item) => {
    const id = it.data.id;
    const verdict = state.decisions[id]?.verdict;
    undecide(id);
    if (verdict === "approved" && it.kind === "wedding") deletePost(draftId(it.data));
    go({ item: id });
  };

  // Previous and next within the queue, fetching the next page when the end of the loaded rows is near.
  const step = (dir: 1 | -1) => {
    const target = rows[rowIndex + dir];
    if (target) go({ item: target.id });
    if (dir === 1 && rowIndex >= rows.length - 3) void loadMore();
  };
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });
  const openId = row?.id;
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      // Not while typing, and not while a lightbox or preview is open over the panel (it has its own arrows).
      if (el.closest("input, textarea, select, [contenteditable]") || document.querySelectorAll('[aria-modal="true"]').length > 1) return;
      if (e.key === "ArrowRight" || e.key === "j") stepRef.current(1);
      if (e.key === "ArrowLeft" || e.key === "k") stepRef.current(-1);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [openId]);

  const detail = !onQueue && item && <ItemDetail key={item.data.id} item={item} onApprove={() => approveItem(item)} onDecline={(note) => declineItem(item, note)} />;

  const title = onQueue ? row?.name : item && itemTitle(item);

  return (
    <>
      <PageHeader title="Approvals" description="New businesses, Real Weddings and reviews wait here until you approve them." />
      <Tabs
        className="mb-6"
        value={tab}
        onChange={(t) => go({ tab: t, item: null })}
        tabs={[
          { id: "ready", label: "Ready for approval", count: counts.ready },
          { id: "missing", label: "Missing data", count: counts.missing },
          { id: "weddings", label: "Real weddings", count: counts.weddings },
          { id: "reviews", label: "Reviews", count: counts.reviews },
        ]}
      />

      {onQueue ? (
        <>
          <Toolbar key={tab} />
          <QueueList rows={rows} selected={row?.id} tab={tab} onSelect={(id) => go({ item: id })} />
          <Decided decisions={queue.decisions} onUndo={(id) => void undoVendor(id)} />
        </>
      ) : open.length === 0 ? (
        <Panel>
          <Empty title="All clear">{tab === "weddings" ? "Couples' Real Wedding submissions will appear here." : "New reviews will appear here."}</Empty>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <Panel flush className="self-start">
            <ul>
              {open.map((it, i) => (
                <li key={it.data.id} className={clsx(i > 0 && "border-t border-ink/[0.06]")}>
                  <button
                    type="button"
                    onClick={() => go({ item: it.data.id })}
                    aria-current={item?.data.id === it.data.id ? "true" : undefined}
                    className={clsx(
                      "relative flex w-full items-center gap-3 px-5 py-4 text-left transition-colors",
                      item?.data.id === it.data.id ? "bg-paper" : "hover:bg-paper/60",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.875rem]">{itemTitle(it)}</span>
                      <span className="block truncate text-[0.75rem] text-ink-mute">
                        {it.kind === "wedding" ? it.data.title : `${"★".repeat(it.data.rating)} ${it.data.text}`}
                      </span>
                    </span>
                    <span className="self-start text-[0.6875rem] text-ink-mute">{ago(it.data.submitted)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
          {desktop && detail}
        </div>
      )}

      {!onQueue && decidedItems.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-[0.875rem] font-medium">Recently decided</h2>
          <Panel flush>
            <ul>
              {decidedItems.map((it, i) => {
                const d = state.decisions[it.data.id];
                return (
                  <li key={it.data.id} className={clsx("flex items-center gap-3 px-5 py-3 sm:px-6", i > 0 && "border-t border-ink/[0.06]")}>
                    <Badge tone={d.verdict === "approved" ? "good" : "neutral"}>{d.verdict === "approved" ? "Approved" : "Declined"}</Badge>
                    <span className="min-w-0 flex-1 truncate text-[0.8125rem]">{itemTitle(it)}</span>
                    <Btn size="sm" variant="ghost" onClick={() => undoItem(it)}>
                      Undo
                    </Btn>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </section>
      )}

      {/* A business opens in a wide panel over the list: one scrollbar at a time, and the list stays where it was. */}
      {onQueue && (
        <Drawer
          open={!!row}
          onClose={() => go({ item: null })}
          footer={row && <DraftActions key={row.id} row={row} busy={busy} onApprove={() => void decideRow(row, "approved")} onDecline={(note) => void decideRow(row, "declined", note)} />}
          width="max-w-[min(96rem,calc(100vw-3rem))]"
          title={
            row && (
              <span className="flex items-center gap-4">
                <span className="min-w-0 truncate">{row.name}</span>
                <span className="flex shrink-0 items-center text-[0.75rem] font-normal text-ink-mute tabular-nums">
                  <StepButton dir={-1} disabled={rowIndex <= 0} onClick={() => step(-1)} />
                  <span className="px-1">
                    {rowIndex + 1} of {queue.list.total ?? rows.length}
                  </span>
                  <StepButton dir={1} disabled={rowIndex >= rows.length - 1 && queue.list.done} onClick={() => step(1)} />
                </span>
              </span>
            )
          }
        >
          {row && <DraftPanel row={row} draft={draft} view={view} onView={setView} />}
        </Drawer>
      )}
      {!onQueue && !desktop && (
        <Drawer open={!!item} onClose={() => go({ item: null })} title={title ?? ""}>
          <div className="p-4">{detail}</div>
        </Drawer>
      )}

    </>
  );
}

/** A quiet chevron beside the "10 of 72" count: previous or next business in the queue. */
function StepButton({ dir, disabled, onClick }: { dir: 1 | -1; disabled: boolean; onClick: () => void }) {
  const label = dir === 1 ? "Next business (→)" : "Previous business (←)";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex size-6 items-center justify-center text-ink-mute transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon name={dir === 1 ? "chevron-right" : "chevron-left"} className="size-3.5" strokeWidth={1.25} />
    </button>
  );
}

// ── The vendor queue ────────────────────────────────────────────────────

/** Search, the second-look filters, and the order. All of it runs in the database. */
function Toolbar() {
  const { query } = useQueue();
  const [text, setText] = useState(query.q);
  useEffect(() => {
    const t = setTimeout(() => setQuery({ q: text }), 250);
    return () => clearTimeout(t);
  }, [text]);
  const toggle = (f: Flag) =>
    setQuery({
      flags: query.flags.includes(f) ? query.flags.filter((x) => x !== f) : [...query.flags, f],
    });

  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
      <label className="relative block lg:w-72">
        <span className="sr-only">Search the queue</span>
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-ink-mute" strokeWidth={1.4} />
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search by name or category"
          className={clsx(inputCls, "pl-6")}
        />
      </label>
      <div className="flex flex-wrap gap-1.5 lg:flex-1" role="group" aria-label="Show only">
        {(Object.keys(flagLabels) as Flag[]).map((f) => {
          const on = query.flags.includes(f);
          return (
            <button
              key={f}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(f)}
              title={flagLabels[f].detail}
              className={clsx(
                "border px-2.5 py-1 text-[0.75rem] transition-colors duration-200",
                on ? "border-ink bg-ink text-paper" : "border-ink/15 bg-surface text-ink-soft hover:border-ink/40 hover:text-ink",
              )}
            >
              {flagLabels[f].label}
            </button>
          );
        })}
      </div>
      <label className="relative flex items-center gap-2 text-[0.75rem] text-ink-mute">
        <span>Order</span>
        <select
          value={query.sort}
          onChange={(e) => setQuery({ sort: e.target.value as Sort })}
          className="cursor-pointer appearance-none bg-transparent pr-5 text-[0.8125rem] text-ink"
        >
          {sorts.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" className="pointer-events-none absolute top-1/2 right-0 size-3.5 -translate-y-1/2" strokeWidth={1.4} />
      </label>
    </div>
  );
}

/** The list runs the length of the page and fetches the next 30 as its end comes into view. */
function QueueList({ rows, selected, tab, onSelect }: { rows: QueueRow[]; selected?: string; tab: "ready" | "missing"; onSelect: (id: string) => void }) {
  const { list, query } = useQueue();
  const end = useRef<HTMLDivElement>(null);
  const filtered = !!query.q.trim() || query.flags.length > 0;

  useEffect(() => {
    const el = end.current;
    if (!el || list.done) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && void loadMore(), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [list.done, rows.length]);

  if (list.error && rows.length === 0) {
    return (
      <Panel>
        <Empty title="Couldn't load the queue">
          {list.error}{" "}
          <button type="button" onClick={retry} className="link-line">
            Try again
          </button>
        </Empty>
      </Panel>
    );
  }
  if (rows.length === 0) {
    return (
      <Panel>
        {list.total === null || list.loading ? (
          <Empty title="Loading">Fetching the businesses waiting for approval.</Empty>
        ) : filtered ? (
          <Empty title="No matches">Nothing in {tab === "ready" ? "Ready for approval" : "Missing data"} matches that.</Empty>
        ) : (
          <Empty title="All clear">
            {tab === "ready" ? "Businesses with everything a listing needs will appear here." : "Nothing is waiting on photos or details."}
          </Empty>
        )}
      </Panel>
    );
  }

  return (
    <div>
      <Panel flush>
        <ul>
          {rows.map((r, i) => {
            const on = selected === r.id;
            return (
              <li key={r.id} className={clsx(i > 0 && "border-t border-ink/[0.06]")}>
                <button
                  type="button"
                  onClick={() => onSelect(r.id)}
                  aria-current={on ? "true" : undefined}
                  className={clsx(
                    "group relative flex w-full items-center gap-4 px-5 py-3 text-left transition-colors sm:px-6",
                    on ? "bg-paper" : "hover:bg-paper/60",
                  )}
                >
                  {on && <span className="absolute inset-y-0 left-0 w-0.5 bg-ink" aria-hidden />}
                  <span className="relative size-14 shrink-0 overflow-hidden bg-paper-soft">
                    {r.cover && (
                      // eslint-disable-next-line @next/next/no-img-element -- served from Supabase at 480px, never next/image
                      <img src={thumbUrl(r.cover)} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem]">{r.name}</span>
                    <span className="block truncate text-[0.75rem] text-ink-mute">
                      {r.missing.length ? (
                        <span className="text-warn">{r.missing.map((m) => missingLabels[m]).join(", ")}</span>
                      ) : (
                        r.discipline || "No category"
                      )}
                    </span>
                  </span>
                  <span className="hidden max-w-[40%] flex-wrap justify-end gap-1.5 md:flex">
                    {r.flags.map((f) => (
                      <Badge key={f} tone="warn">
                        {flagLabels[f].label}
                      </Badge>
                    ))}
                  </span>
                  <span className="hidden w-20 shrink-0 text-right text-[0.75rem] text-ink-mute tabular-nums sm:block">
                    {r.photoCount > 0 && `${r.photoCount} ${r.photoCount === 1 ? "photo" : "photos"}`}
                  </span>
                  <Icon name="arrow" className="size-3.5 shrink-0 text-ink-mute transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>
      <div ref={end} className="py-4 text-center text-[0.75rem] text-ink-mute" aria-live="polite">
        {list.loading ? (
          "Loading more"
        ) : list.error ? (
          <button type="button" onClick={() => void loadMore()} className="link-line">
            Couldn&rsquo;t load more. Try again
          </button>
        ) : list.done ? (
          `All ${list.total ?? rows.length} shown`
        ) : (
          `${rows.length} of ${list.total}`
        )}
      </div>
    </div>
  );
}

function Decided({ decisions, onUndo }: { decisions: Decision[]; onUndo: (vendorId: string) => void }) {
  if (decisions.length === 0) return null;
  const tone = {
    approved: "good",
    declined: "neutral",
    reopened: "neutral",
  } as const;
  const label = {
    approved: "Approved",
    declined: "Declined",
    reopened: "Back in the queue",
  };
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-[0.875rem] font-medium">Recently decided</h2>
      <Panel flush>
        <ul>
          {decisions.map((d, i) => (
            <li key={d.id} className={clsx("flex items-center gap-3 px-5 py-3 sm:px-6", i > 0 && "border-t border-ink/[0.06]")}>
              <Badge tone={tone[d.verdict]}>{label[d.verdict]}</Badge>
              <span className="min-w-0 flex-1 text-[0.8125rem]">
                <span className="block truncate">
                  {d.vendorName}
                  {d.note && <span className="ml-2 text-ink-mute">“{d.note}”</span>}
                </span>
                <span className="block text-[0.6875rem] text-ink-mute">{[d.by, ago(d.at)].filter(Boolean).join(", ")}</span>
              </span>
              {d.latest && d.verdict !== "reopened" && (
                <Btn size="sm" variant="ghost" onClick={() => onUndo(d.vendorId)}>
                  Undo
                </Btn>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </section>
  );
}

type PanelView = "listing" | "photos" | "details";

const previewValues = (d: Draft): VendorFormValues => ({
  name: d.name,
  person: d.person ?? "",
  discipline: d.discipline,
  lede: "",
  services: d.services,
  based: "",
  serviceArea: d.serviceArea,
  languages: d.languages,
  email: d.email ?? "",
  phone: d.phone ?? "",
  website: d.website ?? "",
  instagram: d.instagram ?? "",
  facebook: d.facebook ?? "",
  photos: [],
  tier: "essential",
  billing: "monthly",
});

/**
 * What the panel shows: the listing as couples will see it, then the photos to arrange and the
 * details and research to check. Anything missing or worth a
 * second look sits above, whichever view is open.
 */
function DraftPanel({ row, draft, view, onView }: { row: QueueRow; draft?: Draft; view: PanelView; onView: (v: PanelView) => void }) {
  return (
    <div>
      <div className="sticky top-0 z-10 bg-paper/95 px-6 pt-4 backdrop-blur">
        <Tabs
          value={view}
          onChange={onView}
          tabs={[
            { id: "listing", label: "Listing" },
            { id: "photos", label: "Photos", count: draft?.photos.length ?? row.photoCount },
            { id: "details", label: "Details and research" },
          ]}
        />
      </div>

      {(row.missing.length > 0 || row.flags.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-6 pt-4 text-[0.8125rem]">
          {row.missing.length > 0 && (
            <span className="flex items-center gap-2 text-ink-soft">
              <Icon name="alert" className="size-4 text-warn" strokeWidth={1.5} />
              <span>
                <span className="font-medium text-ink">Can&rsquo;t be published yet:</span> {row.missing.map((m) => missingLabels[m].toLowerCase()).join(", ")}.
              </span>
            </span>
          )}
          {row.flags.map((f) => (
            <span key={f} title={flagLabels[f].detail}>
              <Badge tone="warn">{flagLabels[f].label}</Badge>
            </span>
          ))}
        </div>
      )}

      {!draft ? (
        <div className="space-y-3 p-6" aria-busy="true">
          <div className="h-[28rem] animate-pulse bg-paper-soft" />
          <div className="h-4 w-2/3 animate-pulse bg-paper-soft" />
        </div>
      ) : view === "listing" ? (
        // Exactly the public markup; nothing in it links anywhere.
        <div className="pointer-events-none pt-2 select-none [&_.shell]:max-w-none">
          <ListingPreview values={previewValues(draft)} photos={draft.photos.map((p) => p.src)} story={draft.story} view="page" />
        </div>
      ) : view === "photos" ? (
        <div className="p-6">
          <Photos d={draft} />
        </div>
      ) : (
        <div className="max-w-[56rem] p-6">
          {draft.review && <Research r={draft.review} name={draft.name} />}
          <Facts
            rows={[
              ...(draft.person ? [["Contact", draft.person] as Row] : []),
              ...(draft.email ? [["Email", link(`mailto:${draft.email}`, draft.email)] as Row] : []),
              ...(draft.phone ? [["Phone", draft.phone] as Row] : []),
              ["Services", draft.services.map((s) => serviceLabels[s] ?? s).join(", ") || "None yet"],
              ["Service area", draft.serviceArea.map((s) => states[s] ?? s).join(", ") || "On request"],
              [
                "Languages",
                <span key="l" className="flex flex-wrap gap-x-3">
                  {draft.languages.map((l) => (
                    <span key={l} lang={languageNames[l]?.lang}>
                      {languageNames[l]?.native ?? l}
                    </span>
                  ))}
                </span>,
              ],
              ...(draft.website ? [["Website", link(draft.website, bare(draft.website))] as Row] : []),
              ...(draft.instagram ? [["Instagram", link(draft.instagram, bare(draft.instagram))] as Row] : []),
              ...(draft.facebook ? [["Facebook", link(draft.facebook, bare(draft.facebook))] as Row] : []),
            ]}
          />
        </div>
      )}
    </div>
  );
}

/** The decision, in the panel's footer so it's always in reach. */
function DraftActions({ row, busy, onApprove, onDecline }: { row: QueueRow; busy: boolean; onApprove: () => void; onDecline: (note?: string) => void }) {
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState("");
  const blocked = row.missing.length > 0;

  if (declining) {
    return (
      <div className="flex w-full flex-wrap items-center gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onDecline(note)}
          placeholder="Why? For the team, optional"
          aria-label="Why it was declined"
          className={clsx(inputCls, "min-w-0 flex-1")}
          autoFocus
        />
        <Btn variant="ghost" onClick={() => setDeclining(false)}>
          Cancel
        </Btn>
        <Btn variant="danger" onClick={() => onDecline(note)} disabled={busy}>
          Decline
        </Btn>
      </div>
    );
  }
  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <p className="t-small mr-auto text-[0.75rem]">
        {blocked ? "Approving opens up once nothing is missing." : "Publishing doesn't email the business. Either can be undone."}
      </p>
      <Btn onClick={() => setDeclining(true)} disabled={busy}>
        Decline
      </Btn>
      <Btn variant="primary" icon="check" onClick={onApprove} disabled={busy || blocked}>
        Approve and publish
      </Btn>
    </div>
  );
}

const ratioOf = (p: DraftPhoto) => (p.width && p.height ? p.width / p.height : 1);

/** Rows of photos whose ratios add up to about `target`, like the vendor page's gallery. */
function photoRows<T>(items: T[], ratio: (x: T) => number, target: number) {
  const out: T[][] = [];
  let row: T[] = [];
  let sum = 0;
  for (const x of items) {
    row.push(x);
    sum += ratio(x);
    if (sum >= target) {
      out.push(row);
      row = [];
      sum = 0;
    }
  }
  if (row.length) out.push(row);
  return out;
}

/**
 * The photos at a size you can judge them by: the cover large and uncropped, the rest in full-width
 * rows below, never cropped either. Drag a photo onto another to move it there, or use its buttons;
 * click one to see it full screen.
 */
function Photos({ d }: { d: Draft }) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const n = d.photos.length;

  if (n === 0) {
    return <div className="flex h-48 items-center justify-center border border-dashed border-ink/15 text-[0.8125rem] text-ink-mute">No photos yet</div>;
  }

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...d.photos];
    const [photo] = next.splice(from, 1);
    next.splice(to, 0, photo);
    reorderPhotos(d, next).catch((e: Error) => toast(`Couldn't save the new order: ${e.message}`));
  };
  const slots = d.photos.map((p, i) => ({
    src: p.src,
    alt: `${d.name}, photo ${i + 1}`,
    brief: "",
    ratio: ratioOf(p),
  }));
  const TARGET = 3;
  const rest = photoRows(
    d.photos.slice(1).map((p, k) => ({ p, i: k + 1 })),
    (x) => ratioOf(x.p),
    TARGET,
  );

  const tile = (p: DraftPhoto, i: number, style: React.CSSProperties, sizes: string) => (
    <div
      key={p.id}
      draggable={n > 1}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        setDragging(i);
      }}
      onDragOver={(e) => {
        if (dragging === null) return;
        e.preventDefault();
        setOver(i);
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (dragging !== null) move(dragging, i);
        setDragging(null);
        setOver(null);
      }}
      onDragEnd={() => {
        setDragging(null);
        setOver(null);
      }}
      className={clsx(
        "group/tile relative min-w-0 bg-paper-soft transition-opacity",
        n > 1 && "cursor-grab active:cursor-grabbing",
        dragging === i && "opacity-40",
        over === i && dragging !== null && dragging !== i && "outline-2 outline-offset-2 outline-ink",
      )}
      style={style}
    >
      <GalleryImage index={i} sizes={sizes} className="size-full" />
      {i === 0 && <span className="pointer-events-none absolute top-3 left-3 bg-ink px-2 py-1 text-[0.75rem] text-paper">Cover</span>}
      {n > 1 && (
        <span className="absolute right-3 bottom-3 flex gap-1.5 opacity-0 transition-opacity group-focus-within/tile:opacity-100 group-hover/tile:opacity-100 [@media(hover:none)]:opacity-100">
          {i > 0 && (
            <TileButton onClick={() => move(i, 0)} label={`Make photo ${i + 1} the cover`}>
              Make cover
            </TileButton>
          )}
          {i > 0 && <TileButton onClick={() => move(i, i - 1)} label={`Move photo ${i + 1} earlier`} icon="arrow-left" />}
          {i < n - 1 && <TileButton onClick={() => move(i, i + 1)} label={`Move photo ${i + 1} later`} icon="arrow" />}
        </span>
      )}
    </div>
  );

  const cover = d.photos[0];
  const coverRatio = ratioOf(cover);

  return (
    <Gallery images={slots} name={d.name} slug={`approval-${d.slug}`}>
      <div className="space-y-2">
        {/* As wide as the panel, up to 34rem tall, at the photo's own shape. */}
        <div className="flex justify-center bg-paper-soft">
          {tile(
            cover,
            0,
            {
              aspectRatio: coverRatio,
              width: `min(100%, calc(34rem * ${coverRatio}))`,
            },
            "(min-width: 1024px) 50vw, 100vw",
          )}
        </div>
        {rest.map((row) => {
          const sum = row.reduce((a, x) => a + ratioOf(x.p), 0);
          const full = sum >= TARGET;
          return (
            <div key={row[0].p.id} className="flex gap-2">
              {row.map(({ p, i }) =>
                tile(
                  p,
                  i,
                  // A full row fills the width; a short last row keeps the same height instead of blowing up.
                  full
                    ? { aspectRatio: ratioOf(p), flex: `${ratioOf(p)} 1 0%` }
                    : {
                        aspectRatio: ratioOf(p),
                        width: `calc(${(ratioOf(p) / TARGET) * 100}% - 0.25rem)`,
                      },
                  "(min-width: 1024px) 25vw, 50vw",
                ),
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[0.75rem] text-ink-mute">
        {n === 1 ? "1 photo." : `${n} photos. Drag one onto another to move it, or hover for its buttons. The first is the cover.`}
      </p>
    </Gallery>
  );
}

function TileButton({ onClick, label, icon, children }: { onClick: () => void; label: string; icon?: "arrow" | "arrow-left"; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 min-w-8 items-center justify-center bg-surface/95 px-2.5 text-[0.75rem] text-ink shadow-sm backdrop-blur transition-colors hover:bg-surface"
    >
      {icon ? <Icon name={icon} className="size-3.5" strokeWidth={1.6} /> : children}
    </button>
  );
}

const confidenceTone = {
  High: "good",
  Medium: "neutral",
  Low: "warn",
} as const;
const confidenceMeaning = {
  High: "Website or Instagram found and confirmed.",
  Medium: "Strong indirect evidence, usually a confirmed Instagram but no website.",
  Low: "Rests on the email address or business name alone. Verify before publishing.",
};

/** An ABN quoted in the research notes, as 11 digits. */
const abnIn = (notes: string) => notes.match(/\bABN[:\s]*((?:\d\s?){11})/i)?.[1].replace(/\s/g, "");
const spaced = (abn: string) => `${abn.slice(0, 2)} ${abn.slice(2, 5)} ${abn.slice(5, 8)} ${abn.slice(8)}`;

/** The research spreadsheet's verdict, kept apart from the listing itself, and a way to check the business. */
function Research({ r, name }: { r: ReviewNotes; name: string }) {
  const abn = abnIn(r.notes);
  const facts: [string, string][] = [
    ...(r.yearsAttended ? [["Events attended", r.yearsAttended] as [string, string]] : []),
    ...(r.categoriesOriginal ? [["Research categories", r.categoriesOriginal] as [string, string]] : []),
    ...(r.registeredEmails ? [["Registered with", r.registeredEmails] as [string, string]] : []),
  ];
  return (
    <section className="mt-6 border border-ink/[0.08] bg-paper/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[0.8125rem] font-medium">From the research</h3>
        {r.confidence && <Badge tone={confidenceTone[r.confidence]}>{r.confidence} confidence</Badge>}
      </div>
      {r.confidence && <p className="mt-1.5 text-[0.75rem] text-ink-mute">{confidenceMeaning[r.confidence]}</p>}
      {r.notes && <p className="mt-3 max-w-[62ch] text-[0.8125rem] leading-relaxed text-ink-soft">{r.notes}</p>}
      {facts.length > 0 && (
        <dl className="mt-3 space-y-1 text-[0.75rem]">
          {facts.map(([k, v]) => (
            <div key={k} className="grid grid-cols-1 gap-x-3 sm:grid-cols-[9rem_1fr]">
              <dt className="text-ink-mute">{k}</dt>
              <dd className="min-w-0 break-words">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-3 text-[0.75rem]">
        {abn
          ? link(`https://abr.business.gov.au/ABN/View?abn=${abn}`, `Check ABN ${spaced(abn)} on ABN Lookup`)
          : link(`https://abr.business.gov.au/Search/ResultsActive?SearchText=${encodeURIComponent(name)}`, "Search ABN Lookup for this business")}
      </p>
      <p className="mt-3 text-[0.75rem] text-ink-mute">
        They registered for a networking event, not the directory. Check they&rsquo;re happy to be listed, with these details and photos.
      </p>
    </section>
  );
}

// ── Real Weddings and reviews ───────────────────────────────────────────

function ItemDetail({ item, onApprove, onDecline }: { item: Item; onApprove: () => void; onDecline: (note?: string) => void }) {
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState("");

  return (
    <Panel>
      <div className="pt-2">
        {item.kind === "wedding" && <SubmissionDetail s={item.data} />}
        {item.kind === "review" && <ReviewDetail r={item.data} />}
      </div>
      <div className="sticky bottom-0 mt-6 border-t hairline bg-surface pt-5 pb-5">
        {declining ? (
          <div className="space-y-3">
            <label className="block text-[0.8125rem] font-medium" htmlFor="decline-note">
              A note for them <span className="font-normal text-ink-mute">(optional)</span>
            </label>
            <textarea id="decline-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={clsx(inputCls, "resize-none")} autoFocus />
            <div className="flex gap-2">
              <Btn variant="danger" onClick={() => onDecline(note.trim() || undefined)}>
                Decline
              </Btn>
              <Btn variant="ghost" onClick={() => setDeclining(false)}>
                Cancel
              </Btn>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Btn variant="primary" icon="check" onClick={onApprove}>
              {item.kind === "wedding" ? "Approve as a draft post" : "Publish review"}
            </Btn>
            <Btn onClick={() => setDeclining(true)}>Decline</Btn>
          </div>
        )}
      </div>
    </Panel>
  );
}

type Row = [string, React.ReactNode];

function Facts({ rows }: { rows: Row[] }) {
  return (
    <dl className="mt-6 border-t hairline">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-1 gap-1 border-b border-ink/[0.06] py-3 text-[0.8125rem] sm:grid-cols-[9rem_1fr] sm:gap-3">
          <dt className="text-ink-mute">{k}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const link = (href: string, label: string) => (
  <a href={href} target="_blank" rel="noreferrer" className="link-line">
    {label}
  </a>
);
const bare = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

function SubmissionDetail({ s }: { s: Submission }) {
  return (
    <>
      <p className="text-[0.8125rem] text-ink-mute">
        {s.couple} · {s.place} · {day(s.date, { year: true })}
      </p>
      <h2 className="mt-2 font-display text-[1.75rem] leading-tight tracking-[-0.02em] text-balance">{s.title}</h2>
      <div className="mt-5 grid h-[clamp(18rem,30vw,28rem)] grid-cols-3 grid-rows-2 gap-2">
        {s.photos.map((src, i) => (
          <div
            key={src}
            className={clsx("relative overflow-hidden bg-paper-soft", i === 0 ? "col-span-2 row-span-2" : s.photos.length === 2 ? "row-span-2" : "")}
          >
            <Media src={src} alt={`${s.couple}, photo ${i + 1}`} brief="" sizes="(min-width: 1024px) 30vw, 60vw" className="size-full" />
          </div>
        ))}
      </div>
      <p className="mt-6 max-w-[62ch] text-[0.9375rem] leading-relaxed">{s.story}</p>
      <Facts
        rows={[
          ["Sent by", link(`mailto:${s.email}`, s.email)],
          [
            "Vendors credited",
            <span key="v" className="flex flex-wrap gap-x-3 gap-y-1">
              {s.vendors.map((slug) => (
                <Link key={slug} href={`/admin/vendors/${slug}`} className="link-line">
                  {vendorName(slug)}
                </Link>
              ))}
            </span>,
          ],
          ["Photos", `${s.photos.length}, credited to the photographer`],
        ]}
      />
    </>
  );
}

function ReviewDetail({ r }: { r: Review }) {
  const v = getVendor(r.vendor);
  return (
    <>
      <div className="flex items-center gap-1 text-ink" aria-label={`${r.rating} out of 5`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Icon key={i} name="star" className={clsx("size-4", i < r.rating ? "fill-current" : "text-ink/20")} strokeWidth={1.2} />
        ))}
      </div>
      <blockquote className="mt-4 font-display text-[1.625rem] leading-snug tracking-[-0.01em] text-balance">“{r.text}”</blockquote>
      <Facts
        rows={[
          ["From", r.couple],
          ["Wedding", day(r.weddingDate, { year: true })],
          [
            "For",
            <Link key="v" href={`/admin/vendors/${r.vendor}`} className="flex items-center gap-2">
              <Avatar name={v?.name ?? r.vendor} src={v?.cover} size={22} />
              <span className="link-line">{vendorName(r.vendor)}</span>
            </Link>,
          ],
          ["Sent", ago(r.submitted)],
        ]}
      />
      <p className="t-small mt-4 text-[0.75rem]">Publishing shows it on their listing and lets them know.</p>
    </>
  );
}
