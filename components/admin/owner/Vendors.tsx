"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons/Icon";
import { Skeleton, SkeletonLines } from "@/components/ui/Skeleton";
import { craftOf, crafts } from "@/data/taxonomy";
import type { CraftId } from "@/data/types";
import { reloadListing } from "@/lib/account/listing";
import { ago, plural } from "@/lib/admin/format";
import { changeLabels, type PlacedVendor, type Switch, usePlacement } from "@/lib/admin/placement";
import { toast } from "@/lib/admin/toast";
import { thumbUrl } from "@/lib/supabase/storage";
import { Drawer } from "../Drawer";
import { editHref } from "../nav";
import { usePreloadEditor } from "./VendorListing";
import { Badge, Btn, Empty, PageHeader, Panel, Tabs, Toggle, inputCls } from "../ui";

type Tab = "all" | "changed" | "featured" | "largeTile" | "statsOff" | "hidden";

type View = "tiles" | "list";

const grid = "grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6";

// Tiles or list, as the team member last left it on this device.
const viewListeners = new Set<() => void>();
const savedView = (): View => {
  try {
    return localStorage.getItem("emw-vendors-view") === "list" ? "list" : "tiles";
  } catch {
    return "tiles";
  }
};
const onViewChange = (listener: () => void) => {
  viewListeners.add(listener);
  return () => viewListeners.delete(listener);
};
const chooseView = (v: View) => {
  try {
    localStorage.setItem("emw-vendors-view", v);
  } catch {}
  viewListeners.forEach((l) => l());
};

/** Every word typed appears somewhere in the vendor's name, line or address. */
const matches = (v: PlacedVendor, q: string) => {
  const hay = `${v.name} ${v.discipline} ${v.slug}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
};

const empty: Record<Tab, { title: string; detail: string }> = {
  all: { title: "No vendors on the site", detail: "Approved businesses appear here." },
  changed: { title: "Nothing to check", detail: "When a vendor changes their own listing it's tagged here until someone marks it as checked." },
  featured: { title: "Nobody is pinned yet", detail: "The home page picks five vendors at random on every visit. Open a vendor to pin them to that row." },
  largeTile: { title: "No large tiles yet", detail: "Open a vendor to give them a double-width tile in the directory." },
  statsOff: { title: "Every vendor sees their stats", detail: "Stats are on for everyone during the launch year." },
  hidden: { title: "Nobody is hidden", detail: "Open a vendor and switch off “On the site” to take their listing down without deleting it." },
};

const switches: { key: Switch; title: string; detail: string; needsPhoto?: true }[] = [
  {
    key: "featured",
    title: "Home page",
    detail: "Pinned to “Meet some of our vendors”, ahead of the vendors picked at random. The row shows five.",
    needsPhoto: true,
  },
  {
    key: "largeTile",
    title: "Large tile",
    detail: "A double-width tile in the directory. Suits a landscape cover; a portrait one is cropped.",
    needsPhoto: true,
  },
  {
    key: "statsEnabled",
    title: "Profile stats",
    detail: "The vendor sees their page views and enquiries in their dashboard. Included free during our launch year.",
  },
];

/** "photos and words", "photos, words and contact details". */
const listed = (parts: string[]) => (parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`);

/**
 * Every vendor on the site (and any the team has hidden), as photos or as a list, with search and a
 * category filter. Select several to hide them, show them, or switch their stats in one go; open one
 * for its switches and a way into their listing, in a sheet.
 */
export function Vendors() {
  usePreloadEditor();
  const { vendors: all, error, toggle, setShown, markChecked } = usePlacement();
  const [tab, setTab] = useState<Tab>("all");
  const view = useSyncExternalStore(onViewChange, savedView, () => "tiles" as View);
  const [query, setQuery] = useState("");
  const [craft, setCraft] = useState<CraftId | "all">("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string>();
  // The vendor in the sheet, kept while it slides away so it doesn't empty as it goes.
  const [sheetId, setSheetId] = useState<string>();
  const open = all?.find((v) => v.id === openId);
  const sheet = all?.find((v) => v.id === sheetId);


  const vendors = all?.filter((v) => !v.hidden);
  const hidden = all?.filter((v) => v.hidden) ?? [];
  const changed = all?.filter((v) => v.changes) ?? [];
  const pinned = vendors?.filter((v) => v.featured) ?? [];
  const wide = vendors?.filter((v) => v.largeTile) ?? [];
  const statsOff = vendors?.filter((v) => !v.statsEnabled) ?? [];
  const inTab = { all: vendors ?? [], changed, featured: pinned, largeTile: wide, statsOff, hidden }[tab];
  const shown = inTab.filter((v) => (craft === "all" || v.services.some((s) => craftOf(s).id === craft)) && (!query.trim() || matches(v, query)));
  const filtered = craft !== "all" || !!query.trim();
  // The categories anyone on the site is in, for the filter.
  const present = crafts.filter((c) => all?.some((v) => v.services.some((s) => craftOf(s).id === c.id)));

  const selection = all?.filter((v) => picked.has(v.id)) ?? [];
  const pick = (id: string) =>
    setPicked((p) => {
      const next = new Set(p);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const allPicked = shown.length > 0 && shown.every((v) => picked.has(v.id));
  const pickAll = () => setPicked(allPicked ? new Set() : new Set(shown.map((v) => v.id)));

  // The bar under the page lifts the toasts while it's showing.
  const barShown = selection.length > 0;
  useEffect(() => {
    document.documentElement.style.setProperty("--toast-lift", barShown ? "4.5rem" : "0px");
    return () => {
      document.documentElement.style.removeProperty("--toast-lift");
    };
  }, [barShown]);

  const flip = (v: PlacedVendor, key: Switch, on: boolean) =>
    void toggle(v.id, key, on).catch((e: Error) => toast(`Couldn't change ${v.name}: ${e.message}`));

  const show = (v: PlacedVendor, on: boolean) =>
    void setShown(v.id, on).then(
      () => toast(on ? `${v.name} is back on the site` : `${v.name} is hidden from the site`, { label: "Undo", run: () => show(v, !on) }),
      (e: Error) => toast(`Couldn't change ${v.name}: ${e.message}`),
    );

  const checked = (v: PlacedVendor) => void markChecked(v.id).catch((e: Error) => toast(`Couldn't save that: ${e.message}`));

  /** One change to every selected vendor it applies to, one at a time, then one note of how it went. */
  const bulk = async (targets: PlacedVendor[], run: (v: PlacedVendor) => Promise<void>, done: (n: number) => string) => {
    if (!targets.length || busy) return;
    setBusy(true);
    let ok = 0;
    const failed: string[] = [];
    for (const v of targets) {
      try {
        await run(v);
        ok++;
      } catch {
        failed.push(v.name);
      }
    }
    setBusy(false);
    setPicked(new Set());
    toast(failed.length ? `${done(ok)}. Couldn't change ${failed.join(", ")}.` : done(ok));
  };
  const visible = selection.filter((v) => !v.hidden);
  const off = selection.filter((v) => v.hidden);
  const actions = [
    { label: "Hide from the site", icon: undefined, targets: visible, run: (v: PlacedVendor) => setShown(v.id, false), done: (n: number) => `${plural(n, "vendor")} hidden from the site` },
    { label: "Put back on the site", icon: "eye" as const, targets: off, run: (v: PlacedVendor) => setShown(v.id, true), done: (n: number) => `${plural(n, "vendor")} back on the site` },
    { label: "Stats off", icon: undefined, targets: selection.filter((v) => v.statsEnabled), run: (v: PlacedVendor) => toggle(v.id, "statsEnabled", false), done: (n: number) => `Stats off for ${plural(n, "vendor")}` },
    { label: "Stats on", icon: undefined, targets: selection.filter((v) => !v.statsEnabled), run: (v: PlacedVendor) => toggle(v.id, "statsEnabled", true), done: (n: number) => `Stats on for ${plural(n, "vendor")}` },
    { label: "Mark as checked", icon: "check" as const, targets: selection.filter((v) => v.changes), run: (v: PlacedVendor) => markChecked(v.id), done: (n: number) => `${plural(n, "vendor")} marked as checked` },
  ].filter((a) => a.targets.length > 0);

  const openSheet = (v: PlacedVendor) => {
    setOpenId(v.id);
    setSheetId(v.id);
  };

  const badges = (v: PlacedVendor, onPhoto: boolean) => (
    <>
      {v.hidden && <Badge tone="ink">Hidden</Badge>}
      {v.changes && (
        // Solid on a photo, so it reads on any photo.
        <Badge tone="warn" className={clsx(onPhoto && "bg-surface!")}>
          Changed
        </Badge>
      )}
      {v.featured && <Badge tone="ink">Home page</Badge>}
      {v.largeTile && <Badge className={clsx(onPhoto && "bg-surface/90")}>Large tile</Badge>}
    </>
  );

  return (
    <>
      <PageHeader
        title="Vendors"
        description={
          vendors
            ? `${plural(vendors.length, "vendor")} on the site · ${pinned.length} pinned to the home page · ${plural(wide.length, "large tile")}${hidden.length ? ` · ${hidden.length} hidden` : ""}`
            : "Every vendor on the site"
        }
      >
        <Tabs
          className="mt-8"
          value={tab}
          onChange={(t) => {
            setTab(t);
            setPicked(new Set());
          }}
          tabs={[
            { id: "all", label: "All", count: vendors?.length },
            { id: "changed", label: "Changed", count: all && changed.length },
            { id: "featured", label: "Home page", count: vendors && pinned.length },
            { id: "largeTile", label: "Large tile", count: vendors && wide.length },
            { id: "statsOff", label: "Stats off", count: vendors && statsOff.length },
            { id: "hidden", label: "Hidden", count: all && hidden.length },
          ]}
        />
      </PageHeader>

      {/* Search, the categories, and tiles or a list. */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative block lg:w-72">
          <span className="sr-only">Search vendors</span>
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-ink-mute" strokeWidth={1.4} />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or service" className={clsx(inputCls, "pl-6")} />
        </label>
        <div className="flex flex-wrap gap-1.5 lg:flex-1" role="group" aria-label="Category">
          {[{ id: "all" as const, short: "All categories" }, ...present].map((c) => {
            const on = craft === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => setCraft(on && c.id !== "all" ? "all" : c.id)}
                className={clsx(
                  "border px-2.5 py-1 text-[0.75rem] transition-colors duration-200",
                  on ? "border-ink bg-ink text-paper" : "border-ink/15 bg-surface text-ink-soft hover:border-ink/40 hover:text-ink",
                )}
              >
                {c.short}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Show as">
          {(["tiles", "list"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              aria-label={v === "tiles" ? "Photos" : "List"}
              title={v === "tiles" ? "Photos" : "List"}
              onClick={() => chooseView(v)}
              className={clsx("flex size-8 items-center justify-center transition-colors", view === v ? "bg-ink text-paper" : "text-ink-soft hover:bg-ink/[0.05] hover:text-ink")}
            >
              <Icon name={v === "tiles" ? "grid" : "list"} className="size-4" strokeWidth={1.5} />
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <Empty title="Couldn't load the vendors">{error}</Empty>
      ) : !vendors ? (
        view === "list" ? (
          <Panel flush>
            <ul aria-busy>
              {Array.from({ length: 10 }, (_, i) => (
                <li key={i} className={clsx("flex items-center gap-4 px-5 py-3 sm:px-6", i > 0 && "border-t border-ink/[0.06]")}>
                  <Skeleton className="size-4" />
                  <Skeleton className="size-14 shrink-0" />
                  <SkeletonLines lines={2} className="w-1/3 text-[0.875rem]" />
                </li>
              ))}
            </ul>
          </Panel>
        ) : (
          <ul className={grid} aria-busy>
            {Array.from({ length: 12 }, (_, i) => (
              <li key={i}>
                <Skeleton className="aspect-[4/5] w-full" />
                <SkeletonLines lines={2} className="mt-3 w-4/5 text-[0.875rem]" />
              </li>
            ))}
          </ul>
        )
      ) : shown.length === 0 ? (
        filtered ? (
          <Empty title="No matches">Nobody in this view matches that. Try another word or category.</Empty>
        ) : (
          <Empty title={empty[tab].title}>{empty[tab].detail}</Empty>
        )
      ) : view === "list" ? (
        <Panel flush>
          <div className="flex items-center gap-4 border-b border-ink/[0.06] px-5 py-2.5 text-[0.75rem] text-ink-mute sm:px-6">
            <Tick on={allPicked} onClick={pickAll} label={allPicked ? "Clear the selection" : "Select everyone shown"} />
            <span className="flex-1">{plural(shown.length, "vendor")}</span>
            <span className="hidden w-28 text-right md:block">Views, 30 days</span>
            <span className="w-3.5" aria-hidden />
          </div>
          <ul>
            {shown.map((v, i) => (
              <li key={v.id} className={clsx("flex items-center gap-4 px-5 transition-colors sm:px-6", i > 0 && "border-t border-ink/[0.06]", picked.has(v.id) ? "bg-paper" : "hover:bg-paper/60")}>
                <Tick on={picked.has(v.id)} onClick={() => pick(v.id)} label={`Select ${v.name}`} />
                <button type="button" onClick={() => openSheet(v)} className="group flex min-w-0 flex-1 items-center gap-4 py-3 text-left">
                  <span className={clsx("relative size-14 shrink-0 overflow-hidden bg-paper-soft", v.hidden && "opacity-60")}>
                    {v.cover && (
                      // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage thumbnails, no image optimisation
                      <img src={thumbUrl(v.cover.src)} alt="" loading="lazy" decoding="async" className="size-full object-cover" style={{ objectPosition: v.cover.focus }} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[1.0625rem] leading-tight tracking-[-0.01em]">{v.name}</span>
                    <span className="mt-0.5 block truncate text-[0.8125rem] text-ink-soft">
                      {v.discipline}
                      {!v.statsEnabled && <span className="text-ink-mute"> · Stats off</span>}
                    </span>
                  </span>
                  <span className="hidden max-w-[40%] flex-wrap justify-end gap-1.5 sm:flex">{badges(v, false)}</span>
                  <span className="hidden w-28 shrink-0 text-right text-[0.875rem] text-ink tabular-nums md:block">{v.views.toLocaleString("en-AU")}</span>
                  <Icon name="arrow" className="size-3.5 shrink-0 text-ink-mute transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      ) : (
        <ul className={grid}>
          {shown.map((v) => {
            const on = picked.has(v.id);
            return (
              <li key={v.id} className="group/tile relative">
                <button type="button" onClick={() => openSheet(v)} className="group block w-full text-left">
                  <span className={clsx("relative block aspect-[4/5] overflow-hidden bg-paper-soft outline-2 outline-offset-[3px] transition-[outline-color] duration-300", on ? "outline-ink" : "outline-transparent", v.hidden && tab !== "hidden" && "opacity-60")}>
                    {v.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage thumbnails, no image optimisation
                      <img src={thumbUrl(v.cover.src)} alt="" loading="lazy" className="size-full object-cover transition-transform duration-[1200ms] ease-out-expo group-hover:scale-[1.03]" style={{ objectPosition: v.cover.focus }} />
                    ) : (
                      <span className="flex size-full items-center justify-center text-[0.8125rem] text-ink-mute">No photo yet</span>
                    )}
                    <span className="absolute top-2 left-2 flex flex-wrap gap-1 pr-9">{badges(v, true)}</span>
                  </span>
                  <span className="mt-3 block font-display text-[1.125rem] leading-tight tracking-[-0.01em]">{v.name}</span>
                  <span className="mt-0.5 block text-[0.8125rem] text-ink-soft">
                    {v.discipline}
                    {!v.statsEnabled && <span className="text-ink-mute"> · Stats off</span>}
                  </span>
                </button>
                {/* The tick shows on hover, and stays on every tile once anything is selected. */}
                <span className={clsx("absolute top-2 right-2 transition-opacity duration-300", on || selection.length ? "opacity-100" : "opacity-0 group-hover/tile:opacity-100 focus-within:opacity-100")}>
                  <Tick on={on} onClick={() => pick(v.id)} label={`Select ${v.name}`} solid />
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* What can be done to everyone selected, under the page. */}
      <AnimatePresence>
        {selection.length > 0 && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 bottom-0 z-40 border-t hairline bg-surface shadow-[0_-24px_48px_-28px_rgb(22_20_18/0.25)] lg:left-[15rem]"
          >
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4 sm:px-8">
              <p className="text-[0.9375rem] text-ink">{plural(selection.length, "vendor")} selected</p>
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {actions.map((a) => (
                  <Btn key={a.label} icon={a.icon} disabled={busy} onClick={() => void bulk(a.targets, a.run, a.done)}>
                    {a.label}
                    {a.targets.length !== selection.length && <span className="text-ink-mute tabular-nums">{a.targets.length}</span>}
                  </Btn>
                ))}
              </div>
              <Btn variant="ghost" onClick={() => setPicked(new Set())} disabled={busy}>
                Clear
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Drawer open={!!open} onClose={() => setOpenId(undefined)} title={sheet?.name ?? ""}>
        {sheet && (
          <div>
            {sheet.cover && (
              // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage photo, no image optimisation
              <img src={sheet.cover.src} alt="" className="max-h-[52vh] w-full bg-paper-soft object-cover" style={{ aspectRatio: Math.max(sheet.cover.ratio, 0.8), objectPosition: sheet.cover.focus }} />
            )}
            <div className="px-6 py-6">
              <p className="font-display text-[1.75rem] leading-[1.05] tracking-[-0.015em]">{sheet.name}</p>
              <p className="mt-1 text-[0.875rem] text-ink-soft">{sheet.discipline}</p>
              <Link
                href={editHref(sheet.slug)}
                onClick={() => {
                  // Starts from what's saved now, not a copy read earlier in this visit, and closes
                  // the sheet so it isn't still open on the way back.
                  reloadListing(sheet.slug);
                  setOpenId(undefined);
                }}
                className="mt-5 inline-flex h-9 items-center gap-2 bg-ink px-4 text-[0.8125rem] font-medium text-paper transition-colors duration-200 hover:bg-ink/85"
              >
                <Icon name="pen" className="size-4" strokeWidth={1.5} />
                Edit listing
              </Link>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.875rem]">
                <span className="text-ink">
                  <span className="tabular-nums">{sheet.views.toLocaleString("en-AU")}</span> page {sheet.views === 1 ? "view" : "views"} in the last 30 days
                </span>
                <Link href={`/vendors/${sheet.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-ink-soft transition-colors hover:text-ink">
                  View on the site
                  <Icon name="arrow-up-right" className="size-3.5" strokeWidth={1.5} />
                </Link>
              </div>
            </div>
            {sheet.changes && (
              <div className="flex items-center gap-4 border-t hairline bg-warn/[0.06] px-6 py-4">
                <p className="min-w-0 flex-1 text-[0.875rem] leading-relaxed text-ink">
                  They changed their {listed(sheet.changes.parts.map((p) => changeLabels[p]))}
                  <span className="text-ink-soft"> · {ago(sheet.changes.at)}</span>
                </p>
                <Btn size="sm" icon="check" onClick={() => checked(sheet)}>
                  Mark as checked
                </Btn>
              </div>
            )}
            <ul className="border-t hairline">
              <li className="flex items-start gap-6 border-b hairline px-6 py-5">
                <div className="min-w-0 flex-1">
                  <p className="text-[0.9375rem] text-ink">On the site</p>
                  <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-soft">
                    {sheet.hidden
                      ? `Hidden ${ago(sheet.hidden.at).toLowerCase()}${sheet.hidden.by ? ` by ${sheet.hidden.by}` : ""}. Couples can't find them or open their page. Their account, photos and enquiries are kept.`
                      : "Couples can find them in the directory and open their page. Off hides the listing; nothing is deleted and their account still works."}
                  </p>
                </div>
                <div className="pt-0.5">
                  <Toggle checked={!sheet.hidden} onChange={(on) => show(sheet, on)} label={`On the site: ${sheet.name}`} />
                </div>
              </li>
              {switches.map((s) => {
                const blocked = s.needsPhoto && !sheet.cover;
                return (
                  <li key={s.key} className="flex items-start gap-6 border-b hairline px-6 py-5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.9375rem] text-ink">{s.title}</p>
                      <p className={clsx("mt-1 text-[0.875rem] leading-relaxed text-ink-soft")}>{blocked ? "Needs a photo first." : s.detail}</p>
                    </div>
                    <div className="pt-0.5">
                      <Toggle checked={sheet[s.key]} onChange={(on) => flip(sheet, s.key, on)} label={`${s.title}: ${sheet.name}`} disabled={blocked} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Drawer>
    </>
  );
}

/** A square tick box for choosing a vendor. `solid` sits on a photo. */
function Tick({ on, onClick, label, solid }: { on: boolean; onClick: () => void; label: string; solid?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={clsx(
        "flex size-[18px] shrink-0 items-center justify-center border transition-colors duration-200",
        on ? "border-ink bg-ink text-paper" : solid ? "border-ink/30 bg-surface hover:border-ink" : "border-ink/25 bg-surface hover:border-ink",
      )}
    >
      {on && <Icon name="check" className="size-3" strokeWidth={2} />}
    </button>
  );
}
