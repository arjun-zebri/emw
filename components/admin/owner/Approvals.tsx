"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import { languages as languageNames, serviceLabels, states } from "@/data/taxonomy";
import { Gallery, GalleryImage } from "@/components/vendor/Gallery";
import { decideDraft, reloadDrafts, reorderPhotos, undoDraft, useDrafts, type Draft, type DraftPhoto, type ReviewNotes, type Verdict } from "@/lib/admin/drafts";
import { pending } from "@/lib/admin/feed";
import { ago, day } from "@/lib/admin/format";
import { reviews, submissions, type Review, type Submission } from "@/lib/admin/people";
import { decide, deletePost, nowIso, savePost, slugify, undecide, useAdmin } from "@/lib/admin/store";
import { toast } from "@/lib/admin/toast";
import { getVendor } from "@/lib/vendors";
import { Drawer } from "../Drawer";
import { Avatar, Badge, Btn, Empty, PageHeader, Panel, Tabs, inputCls } from "../ui";

type Tab = "vendors" | "weddings" | "reviews";
type Item = { kind: "vendor"; data: Draft } | { kind: "wedding"; data: Submission } | { kind: "review"; data: Review };

const tabs: Tab[] = ["vendors", "weddings", "reviews"];
// Vendors come from Supabase (useDrafts); Real Weddings and reviews are still the demo's samples.
const samples: Record<Exclude<Tab, "vendors">, Item[]> = {
  weddings: submissions.map((data) => ({ kind: "wedding", data })),
  reviews: reviews.map((data) => ({ kind: "review", data })),
};

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
const itemTitle = (item: Item) => (item.kind === "vendor" ? item.data.name : item.kind === "wedding" ? item.data.couple : `${item.data.couple} on ${vendorName(item.data.vendor)}`);
const draftId = (s: Submission) => `p-${s.id}`;

export function Approvals() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const state = useAdmin();
  const desktop = useDesktop();
  const queue = useDrafts();
  const [busy, setBusy] = useState(false);
  const waiting = pending(state, queue.drafts);
  const tab = (tabs.includes(params.get("tab") as Tab) ? params.get("tab") : "vendors") as Tab;
  const open: Item[] = tab === "vendors" ? queue.drafts.map((data) => ({ kind: "vendor", data })) : samples[tab].filter((i) => !state.decisions[i.data.id]);
  const decided: { item: Item; verdict: Verdict; note?: string }[] =
    tab === "vendors"
      ? queue.decided.map((d) => ({ item: { kind: "vendor", data: d.draft }, verdict: d.verdict }))
      : samples[tab].filter((i) => state.decisions[i.data.id]).map((item) => ({ item, ...state.decisions[item.data.id] }));
  const loading = tab === "vendors" && (queue.status === "idle" || queue.status === "loading");
  const failed = tab === "vendors" && queue.status === "error";
  const requested = params.get("item");
  const selected = open.find((i) => i.data.id === requested) ?? (desktop ? open[0] : undefined);

  const go = (next: { tab?: Tab; item?: string | null }) => {
    const p = new URLSearchParams();
    const t = next.tab ?? tab;
    if (t !== "vendors") p.set("tab", t);
    const item = next.item === undefined ? requested : next.item;
    if (item) p.set("item", item);
    router.replace(p.size ? `${pathname}?${p}` : pathname, { scroll: false });
  };

  const counts = { vendors: waiting.applicants.length, weddings: waiting.submissions.length, reviews: waiting.reviews.length };
  const nextAfter = (id: string) => {
    const i = open.findIndex((x) => x.data.id === id);
    return open[i + 1]?.data.id ?? open[i - 1]?.data.id ?? null;
  };

  // Vendors are written to the database; the queue only moves on once it has the change.
  const decideVendor = async (d: Draft, verdict: Verdict) => {
    if (busy) return;
    setBusy(true);
    const next = nextAfter(d.id);
    try {
      await decideDraft(d, verdict);
      toast(verdict === "approved" ? `${d.name} approved` : `${d.name} declined`, { label: "Undo", run: () => void undoVendor(d) });
      go({ item: next });
    } catch (e) {
      toast(`Couldn't save that: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const undoVendor = async (d: Draft) => {
    try {
      await undoDraft(d);
      go({ tab: "vendors", item: d.id });
    } catch (e) {
      toast(`Couldn't undo that: ${(e as Error).message}`);
    }
  };

  const approve = (item: Item) => {
    if (item.kind === "vendor") return void decideVendor(item.data, "approved");
    const id = item.data.id;
    decide(id, "approved");
    if (item.kind === "wedding") {
      const s = item.data;
      savePost({
        id: draftId(s),
        slug: slugify(s.title),
        title: s.title,
        standfirst: `${s.couple}, ${s.place}`,
        category: "Real weddings",
        cover: { src: s.photos[0], alt: `${s.couple} on their wedding day` },
        body: [
          { id: "b1", type: "p", text: s.story },
          ...s.photos.slice(1).map((src, i) => ({ id: `img${i}`, type: "img" as const, src, alt: `${s.couple}, photo ${i + 2}` })),
        ],
        vendors: s.vendors,
        status: "draft",
        date: s.date,
        updated: nowIso(),
        author: "East Meets Wed",
        description: s.title,
      });
      toast(`${s.couple}'s wedding saved as a draft`, { label: "Open draft", run: () => router.push(`/admin/journal/${draftId(s)}`) });
    } else {
      toast(`Review published on ${vendorName(item.data.vendor)}`, { label: "Undo", run: () => undecide(id) });
    }
    go({ item: nextAfter(id) });
  };

  const decline = (item: Item, note?: string) => {
    if (item.kind === "vendor") return void decideVendor(item.data, "declined");
    const id = item.data.id;
    decide(id, "declined", note);
    toast(`${itemTitle(item)} declined`, { label: "Undo", run: () => undecide(id) });
    go({ item: nextAfter(id) });
  };

  const undo = (item: Item) => {
    if (item.kind === "vendor") return void undoVendor(item.data);
    const id = item.data.id;
    const verdict = state.decisions[id]?.verdict;
    undecide(id);
    if (verdict === "approved" && item.kind === "wedding") deletePost(draftId(item.data));
    go({ item: id });
  };

  const detail = selected && <Detail key={selected.data.id} item={selected} busy={busy} onApprove={() => approve(selected)} onDecline={(note) => decline(selected, note)} />;

  return (
    <>
      <PageHeader title="Approvals" description="New businesses, Real Weddings and reviews wait here until you approve them." />
      <Tabs
        className="mb-6"
        value={tab}
        onChange={(t) => go({ tab: t, item: null })}
        tabs={[
          { id: "vendors", label: "Vendors", count: counts.vendors },
          { id: "weddings", label: "Real weddings", count: counts.weddings },
          { id: "reviews", label: "Reviews", count: counts.reviews },
        ]}
      />

      {loading ? (
        <Panel>
          <Empty title="Loading">Fetching the businesses waiting for approval.</Empty>
        </Panel>
      ) : failed ? (
        <Panel>
          <Empty title="Couldn't load the queue">
            {queue.error}{" "}
            <button type="button" onClick={() => void reloadDrafts()} className="link-line">
              Try again
            </button>
          </Empty>
        </Panel>
      ) : open.length === 0 ? (
        <Panel>
          <Empty title="All clear">{tab === "vendors" ? "Businesses waiting to be listed will appear here." : tab === "weddings" ? "Couples' Real Wedding submissions will appear here." : "New reviews will appear here."}</Empty>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          {/* The list scrolls on its own at desktop, so the chosen item's detail stays in view. */}
          <Panel flush className="self-start lg:sticky lg:top-[5.5rem] lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
            <ul>
              {open.map((item, i) => {
                const on = selected?.data.id === item.data.id;
                return (
                  <li key={item.data.id} className={clsx(i > 0 && "border-t border-ink/[0.06]")}>
                    <button
                      type="button"
                      onClick={() => {
                        go({ item: item.data.id });
                        // A long profile may have scrolled the page; bring the next one's top back into view.
                        if (desktop && scrollY > 0) scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      aria-current={on ? "true" : undefined}
                      className={clsx("relative flex w-full items-center gap-3 px-5 py-4 text-left transition-colors", on ? "bg-paper" : "hover:bg-paper/60")}
                    >
                      {on && <span className="absolute inset-y-0 left-0 w-0.5 bg-ink" aria-hidden />}
                      <ListThumb item={item} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.875rem]">{itemTitle(item)}</span>
                        <span className="block truncate text-[0.75rem] text-ink-mute">
                          {item.kind === "vendor" ? [item.data.discipline, item.data.review?.confidence === "Low" && "Low confidence"].filter(Boolean).join(" · ") : item.kind === "wedding" ? item.data.title : `${"★".repeat(item.data.rating)} ${item.data.text}`}
                        </span>
                      </span>
                      <span className="self-start text-[0.6875rem] text-ink-mute">{ago(item.data.submitted)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>
          {desktop && detail}
        </div>
      )}

      {!desktop && (
        <Drawer open={!!selected} onClose={() => go({ item: null })} title={selected ? itemTitle(selected) : ""}>
          <div className="p-4">{detail}</div>
        </Drawer>
      )}

      {decided.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-[0.875rem] font-medium">Recently decided</h2>
          <Panel flush>
            <ul>
              {decided.map((d, i) => {
                const item = d.item;
                return (
                  <li key={item.data.id} className={clsx("flex items-center gap-3 px-5 py-3 sm:px-6", i > 0 && "border-t border-ink/[0.06]")}>
                    <Badge tone={d.verdict === "approved" ? "good" : "neutral"}>{d.verdict === "approved" ? "Approved" : "Declined"}</Badge>
                    <span className="min-w-0 flex-1 truncate text-[0.8125rem]">
                      {itemTitle(item)}
                      {d.note && <span className="ml-2 text-ink-mute">“{d.note}”</span>}
                    </span>
                    {d.verdict === "approved" && item.kind === "wedding" && (
                      <Btn size="sm" variant="ghost" href={`/admin/journal/${draftId(item.data)}`}>
                        Open draft
                      </Btn>
                    )}
                    <Btn size="sm" variant="ghost" onClick={() => undo(item)}>
                      Undo
                    </Btn>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </section>
      )}
    </>
  );
}

function ListThumb({ item }: { item: Item }) {
  if (item.kind === "wedding") {
    return (
      <span className="relative size-10 shrink-0 overflow-hidden bg-paper-soft">
        <Media src={item.data.photos[0]} alt="" brief="" sizes="40px" className="size-full" />
      </span>
    );
  }
  if (item.kind === "review") {
    const v = getVendor(item.data.vendor);
    return <Avatar name={v?.name ?? item.data.couple} src={v?.cover} size={40} />;
  }
  return <Avatar name={item.data.name} src={item.data.photos[0]?.src} size={40} />;
}

function Detail({ item, busy, onApprove, onDecline }: { item: Item; busy?: boolean; onApprove: () => void; onDecline: (note?: string) => void }) {
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState("");

  const actions = (
    <div className="sticky bottom-0 mt-6 border-t hairline bg-surface pt-5">
      {item.kind === "vendor" ? (
        // A declined draft is hidden, not deleted, and nothing is sent, so there's no note to write.
        <div className="flex flex-wrap gap-2">
          <Btn variant="primary" icon="check" onClick={onApprove} disabled={busy}>
            Approve and publish
          </Btn>
          <Btn onClick={() => onDecline()} disabled={busy}>
            Decline
          </Btn>
        </div>
      ) : declining ? (
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
  );

  return (
    <Panel>
      <div className="pt-2">
        {item.kind === "vendor" && <DraftDetail d={item.data} />}
        {item.kind === "wedding" && <SubmissionDetail s={item.data} />}
        {item.kind === "review" && <ReviewDetail r={item.data} />}
      </div>
      {actions}
    </Panel>
  );
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
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

const confidenceTone = { High: "good", Medium: "neutral", Low: "warn" } as const;
const confidenceMeaning = {
  High: "Website or Instagram found and confirmed.",
  Medium: "Strong indirect evidence, usually a confirmed Instagram but no website.",
  Low: "Rests on the email address or business name alone. Verify before publishing.",
};

/** The research spreadsheet's verdict, kept apart from the listing itself. */
function Research({ r }: { r: ReviewNotes }) {
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
      <p className="mt-3 text-[0.75rem] text-ink-mute">They registered for a networking event, not the directory. Check they’re happy to be listed, with these details and photos.</p>
    </section>
  );
}

const ratioOf = (p: DraftPhoto) => (p.width && p.height ? p.width / p.height : 1);

/**
 * Every photo, uncropped, in listing order. Drag one to move it, or use its buttons; the first is
 * the cover, previewed beside them as the directory card crops it. Click a photo to see it full size.
 */
function Photos({ d }: { d: Draft }) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const n = d.photos.length;

  if (n === 0) {
    return <div className="flex h-32 items-center justify-center border border-dashed border-ink/15 text-[0.8125rem] text-ink-mute">No photos yet</div>;
  }

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...d.photos];
    const [photo] = next.splice(from, 1);
    next.splice(to, 0, photo);
    reorderPhotos(d, next).catch((e: Error) => toast(`Couldn't save the new order: ${e.message}`));
  };
  const endDrag = () => {
    setDragging(null);
    setOver(null);
  };
  const slots = d.photos.map((p, i) => ({ src: p.src, alt: `${d.name}, photo ${i + 1}`, brief: "", ratio: ratioOf(p) }));
  const cover = d.photos[0];

  return (
    <Gallery images={slots} name={d.name} slug={`approval-${d.slug}`}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
        <figure className="max-w-[9.5rem]">
          <div className="relative aspect-[4/5] overflow-hidden bg-paper-soft">
            <Media src={cover.src} alt={`${d.name}, cover`} brief="" sizes="152px" className="size-full" />
          </div>
          <figcaption className="mt-2 text-[0.6875rem] leading-snug text-ink-mute">The cover, as the directory card crops it</figcaption>
        </figure>
        <div className="min-w-0">
          <p className="mb-2 text-[0.75rem] text-ink-mute">
            {n === 1 ? "1 photo" : `${n} photos. Drag to reorder; the first is the cover.`}
          </p>
          <ul className="flex flex-wrap gap-2">
            {d.photos.map((p, i) => (
              <li
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
                  endDrag();
                }}
                onDragEnd={endDrag}
                className={clsx(
                  "group/tile relative h-28 shrink-0 bg-paper-soft transition-opacity sm:h-32",
                  n > 1 && "cursor-grab active:cursor-grabbing",
                  dragging === i && "opacity-40",
                  over === i && dragging !== null && dragging !== i && "outline-2 outline-offset-2 outline-ink",
                )}
                style={{ aspectRatio: ratioOf(p) }}
              >
                <GalleryImage index={i} sizes="200px" className="size-full" />
                {i === 0 && <span className="pointer-events-none absolute top-1.5 left-1.5 bg-ink px-1.5 py-0.5 text-[0.6875rem] text-paper">Cover</span>}
                {n > 1 && (
                  <span className="absolute inset-x-1.5 bottom-1.5 flex justify-end gap-1 opacity-0 transition-opacity group-focus-within/tile:opacity-100 group-hover/tile:opacity-100 [@media(hover:none)]:opacity-100">
                    {i > 0 && (
                      <TileButton onClick={() => move(i, 0)} label={`Make photo ${i + 1} the cover`}>
                        Cover
                      </TileButton>
                    )}
                    {i > 0 && <TileButton onClick={() => move(i, i - 1)} label={`Move photo ${i + 1} earlier`} icon="arrow-left" />}
                    {i < n - 1 && <TileButton onClick={() => move(i, i + 1)} label={`Move photo ${i + 1} later`} icon="arrow" />}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
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
      className="flex h-6 min-w-6 items-center justify-center bg-surface/95 px-1.5 text-[0.6875rem] text-ink shadow-sm transition-colors hover:bg-surface"
    >
      {icon ? <Icon name={icon} className="size-3" strokeWidth={1.6} /> : children}
    </button>
  );
}

function DraftDetail({ d }: { d: Draft }) {
  return (
    <>
      <Photos d={d} />
      <h2 className="mt-6 font-display text-[1.75rem] leading-tight tracking-[-0.02em]">{d.name}</h2>
      <p className="mt-1 text-[0.8125rem] text-ink-mute">{[d.discipline, d.person].filter(Boolean).join(" · ")}</p>
      {d.story.length > 0 && (
        <div className="mt-5 max-w-[62ch] space-y-3 text-[0.9375rem] leading-relaxed">
          {d.story.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      )}
      {d.review && <Research r={d.review} />}
      <Facts
        rows={[
          ...(d.email ? [["Email", link(`mailto:${d.email}`, d.email)] as [string, React.ReactNode]] : []),
          ...(d.phone ? [["Phone", d.phone] as [string, React.ReactNode]] : []),
          ["Services", d.services.map((s) => serviceLabels[s] ?? s).join(", ") || "None yet"],
          ["Service area", d.serviceArea.map((s) => states[s] ?? s).join(", ") || "On request"],
          [
            "Languages",
            <span key="l" className="flex flex-wrap gap-x-3">
              {d.languages.map((l) => (
                <span key={l} lang={languageNames[l]?.lang}>
                  {languageNames[l]?.native ?? l}
                </span>
              ))}
            </span>,
          ],
          ...(d.website ? [["Website", link(d.website, bare(d.website))] as [string, React.ReactNode]] : []),
          ...(d.instagram ? [["Instagram", link(d.instagram, bare(d.instagram))] as [string, React.ReactNode]] : []),
          ...(d.facebook ? [["Facebook", link(d.facebook, bare(d.facebook))] as [string, React.ReactNode]] : []),
        ]}
      />
      <p className="t-small mt-4 text-[0.75rem]">Approving publishes the listing. Declining hides it. Nothing is sent to the business, and either can be undone.</p>
    </>
  );
}

function SubmissionDetail({ s }: { s: Submission }) {
  return (
    <>
      <p className="text-[0.8125rem] text-ink-mute">
        {s.couple} · {s.place} · {day(s.date, { year: true })}
      </p>
      <h2 className="mt-2 font-display text-[1.75rem] leading-tight tracking-[-0.02em] text-balance">{s.title}</h2>
      <div className="mt-5 grid h-[clamp(18rem,30vw,28rem)] grid-cols-3 grid-rows-2 gap-2">
        {s.photos.map((src, i) => (
          <div key={src} className={clsx("relative overflow-hidden bg-paper-soft", i === 0 ? "col-span-2 row-span-2" : s.photos.length === 2 ? "row-span-2" : "")}>
            <Media src={src} alt={`${s.couple}, photo ${i + 1}`} brief="" sizes="(min-width: 1024px) 30vw, 60vw" className="size-full" />
          </div>
        ))}
      </div>
      <p className="mt-6 max-w-[62ch] text-[0.9375rem] leading-relaxed">{s.story}</p>
      <Facts
        rows={[
          ["Sent by", <a key="e" href={`mailto:${s.email}`} className="link-line">{s.email}</a>],
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
