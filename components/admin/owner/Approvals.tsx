"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import { languages as languageNames, serviceLabels, states } from "@/data/taxonomy";
import { searches } from "@/lib/admin/analytics";
import { pending } from "@/lib/admin/feed";
import { ago, day, num } from "@/lib/admin/format";
import { applicants, reviews, submissions, type Applicant, type Review, type Submission } from "@/lib/admin/people";
import { addVendor, decide, deletePost, nowIso, removeVendor, savePost, slugify, undecide, useAdmin } from "@/lib/admin/store";
import { toast } from "@/lib/admin/toast";
import { getVendor } from "@/lib/vendors";
import { Drawer } from "../Drawer";
import { Avatar, Badge, Btn, Empty, PageHeader, Panel, Tabs, inputCls } from "../ui";

type Tab = "vendors" | "weddings" | "reviews";
type Item = { kind: "vendor"; data: Applicant } | { kind: "wedding"; data: Submission } | { kind: "review"; data: Review };

const tabs: Tab[] = ["vendors", "weddings", "reviews"];
const all: Record<Tab, Item[]> = {
  vendors: applicants.map((data) => ({ kind: "vendor", data })),
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
const applicantSlug = (a: Applicant) => slugify(a.name);
const draftId = (s: Submission) => `p-${s.id}`;

export function Approvals() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const state = useAdmin();
  const desktop = useDesktop();
  const waiting = pending(state);
  const tab = (tabs.includes(params.get("tab") as Tab) ? params.get("tab") : "vendors") as Tab;
  const open = all[tab].filter((i) => !state.decisions[i.data.id]);
  const decided = all[tab].filter((i) => state.decisions[i.data.id]);
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

  const approve = (item: Item) => {
    const id = item.data.id;
    decide(id, "approved");
    if (item.kind === "vendor") {
      const a = item.data;
      addVendor({
        slug: applicantSlug(a),
        name: a.name,
        person: a.person,
        discipline: a.discipline,
        services: a.services,
        based: a.based,
        serviceArea: a.serviceArea,
        languages: a.languages,
        lede: a.lede,
        email: a.email,
        phone: a.phone,
        website: a.website,
        instagram: a.instagram,
        tier: "essential",
        billing: "monthly",
        photos: [],
        added: nowIso(),
        via: "application",
      });
      toast(`${a.name} is live`, { label: "Undo", run: () => (undecide(id), removeVendor(applicantSlug(a))) });
    } else if (item.kind === "wedding") {
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
    const id = item.data.id;
    decide(id, "declined", note);
    toast(`${itemTitle(item)} declined`, { label: "Undo", run: () => undecide(id) });
    go({ item: nextAfter(id) });
  };

  const undo = (item: Item) => {
    const id = item.data.id;
    const verdict = state.decisions[id]?.verdict;
    undecide(id);
    if (verdict === "approved" && item.kind === "vendor") removeVendor(applicantSlug(item.data));
    if (verdict === "approved" && item.kind === "wedding") deletePost(draftId(item.data));
    go({ item: id });
  };

  const detail = selected && <Detail key={selected.data.id} item={selected} onApprove={() => approve(selected)} onDecline={(note) => decline(selected, note)} />;

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

      {open.length === 0 ? (
        <Panel>
          <Empty title="All clear">{tab === "vendors" ? "New applications will appear here." : tab === "weddings" ? "Couples' Real Wedding submissions will appear here." : "New reviews will appear here."}</Empty>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <Panel flush className="self-start">
            <ul>
              {open.map((item, i) => {
                const on = selected?.data.id === item.data.id;
                return (
                  <li key={item.data.id} className={clsx(i > 0 && "border-t border-ink/[0.06]")}>
                    <button
                      type="button"
                      onClick={() => go({ item: item.data.id })}
                      aria-current={on ? "true" : undefined}
                      className={clsx("relative flex w-full items-center gap-3 px-5 py-4 text-left transition-colors", on ? "bg-paper" : "hover:bg-paper/60")}
                    >
                      {on && <span className="absolute inset-y-0 left-0 w-0.5 bg-ink" aria-hidden />}
                      <ListThumb item={item} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.875rem]">{itemTitle(item)}</span>
                        <span className="block truncate text-[0.75rem] text-ink-mute">
                          {item.kind === "vendor" ? item.data.discipline : item.kind === "wedding" ? item.data.title : `${"★".repeat(item.data.rating)} ${item.data.text}`}
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
              {decided.map((item, i) => {
                const d = state.decisions[item.data.id];
                return (
                  <li key={item.data.id} className={clsx("flex items-center gap-3 px-5 py-3 sm:px-6", i > 0 && "border-t border-ink/[0.06]")}>
                    <Badge tone={d.verdict === "approved" ? "good" : "neutral"}>{d.verdict === "approved" ? "Approved" : "Declined"}</Badge>
                    <span className="min-w-0 flex-1 truncate text-[0.8125rem]">
                      {itemTitle(item)}
                      {d.note && <span className="ml-2 text-ink-mute">“{d.note}”</span>}
                    </span>
                    {d.verdict === "approved" && item.kind === "vendor" && (
                      <Btn size="sm" variant="ghost" href={`/admin/vendors/${applicantSlug(item.data)}`}>
                        Open
                      </Btn>
                    )}
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
  return <Avatar name={item.data.name} size={40} />;
}

function Detail({ item, onApprove, onDecline }: { item: Item; onApprove: () => void; onDecline: (note?: string) => void }) {
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState("");

  const actions = (
    <div className="sticky bottom-0 mt-6 border-t hairline bg-surface pt-5">
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
            {item.kind === "vendor" ? "Approve and list" : item.kind === "wedding" ? "Approve as a draft post" : "Publish review"}
          </Btn>
          <Btn onClick={() => setDeclining(true)}>Decline</Btn>
        </div>
      )}
    </div>
  );

  return (
    <Panel>
      <div className="pt-2">
        {item.kind === "vendor" && <ApplicantDetail a={item.data} />}
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

function ApplicantDetail({ a }: { a: Applicant }) {
  const unanswered = a.answers ? searches("day").find((q) => q.label === a.answers) : undefined;
  return (
    <>
      <div className="flex items-start gap-4">
        <Avatar name={a.name} size={56} />
        <div className="min-w-0">
          <h2 className="font-display text-[1.75rem] leading-tight tracking-[-0.02em]">{a.name}</h2>
          <p className="mt-1 text-[0.8125rem] text-ink-mute">
            {a.discipline} · {a.based} · applied {ago(a.submitted)}
          </p>
        </div>
      </div>
      {unanswered && (
        <div className="mt-5 flex gap-3 border border-accent/40 bg-accent/[0.07] p-4">
          <Icon name="search" className="mt-0.5 size-4 text-ink-soft" strokeWidth={1.5} />
          <p className="text-[0.8125rem] text-ink-soft">
            Couples searched for “{unanswered.label}” {num(unanswered.value)} times in the last 30 days and found no one. {a.name} would be the first.
          </p>
        </div>
      )}
      <p className="mt-6 text-[0.9375rem] leading-relaxed">{a.lede}</p>
      <Facts
        rows={[
          ["Contact", a.person],
          ["Email", <a key="e" href={`mailto:${a.email}`} className="link-line">{a.email}</a>],
          ["Phone", a.phone],
          ["Services", a.services.map((s) => serviceLabels[s]).join(", ")],
          ["Travels to", a.serviceArea.map((s) => states[s]).join(", ")],
          [
            "Languages",
            <span key="l" className="flex flex-wrap gap-x-3">
              {a.languages.map((l) => (
                <span key={l} lang={languageNames[l].lang}>
                  {languageNames[l].native}
                </span>
              ))}
            </span>,
          ],
          ...(a.website ? [["Website", <a key="w" href={a.website} target="_blank" rel="noreferrer" className="link-line">{a.website.replace(/^https?:\/\//, "")}</a>] as [string, React.ReactNode]] : []),
          ...(a.instagram ? [["Instagram", <a key="i" href={a.instagram} target="_blank" rel="noreferrer" className="link-line">{a.instagram.replace(/^https?:\/\/(www\.)?/, "")}</a>] as [string, React.ReactNode]] : []),
        ]}
      />
      <p className="t-small mt-4 text-[0.75rem]">Approving lists them on Essential, monthly, and emails them to add photos.</p>
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
