"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Skeleton, SkeletonLines } from "@/components/ui/Skeleton";
import { reloadListing } from "@/lib/account/listing";
import { ago, plural } from "@/lib/admin/format";
import { changeLabels, type PlacedVendor, type Switch, usePlacement } from "@/lib/admin/placement";
import { toast } from "@/lib/admin/toast";
import { thumbUrl } from "@/lib/supabase/storage";
import { Drawer } from "../Drawer";
import { Badge, Btn, Empty, PageHeader, Tabs, Toggle } from "../ui";

type Tab = "all" | "changed" | "featured" | "largeTile" | "statsOff" | "hidden";

const grid = "grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6";

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

/** Every vendor on the site (and any the team has hidden) as its photo, with the team's switches and a way into their listing in a sheet. */
export function Vendors() {
  const { vendors: all, error, toggle, setShown, markChecked } = usePlacement();
  const [tab, setTab] = useState<Tab>("all");
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
  const shown = { all: vendors ?? [], changed, featured: pinned, largeTile: wide, statsOff, hidden }[tab];

  const flip = (v: PlacedVendor, key: Switch, on: boolean) =>
    void toggle(v.id, key, on).catch((e: Error) => toast(`Couldn't change ${v.name}: ${e.message}`));

  const show = (v: PlacedVendor, on: boolean) =>
    void setShown(v.id, on).then(
      () => toast(on ? `${v.name} is back on the site` : `${v.name} is hidden from the site`, { label: "Undo", run: () => show(v, !on) }),
      (e: Error) => toast(`Couldn't change ${v.name}: ${e.message}`),
    );

  const checked = (v: PlacedVendor) => void markChecked(v.id).catch((e: Error) => toast(`Couldn't save that: ${e.message}`));

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
          onChange={setTab}
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

      {error ? (
        <Empty title="Couldn't load the vendors">{error}</Empty>
      ) : !vendors ? (
        <ul className={grid} aria-busy>
          {Array.from({ length: 12 }, (_, i) => (
            <li key={i}>
              <Skeleton className="aspect-[4/5] w-full" />
              <SkeletonLines lines={2} className="mt-3 w-4/5 text-[0.875rem]" />
            </li>
          ))}
        </ul>
      ) : shown.length === 0 ? (
        <Empty title={empty[tab].title}>{empty[tab].detail}</Empty>
      ) : (
        <ul className={grid}>
          {shown.map((v) => (
            <li key={v.id}>
              <button type="button" onClick={() => {
                  setOpenId(v.id);
                  setSheetId(v.id);
                }} className="group block w-full text-left">
                <span className={clsx("relative block aspect-[4/5] overflow-hidden bg-paper-soft", v.hidden && tab !== "hidden" && "opacity-60")}>
                  {v.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage thumbnails, no image optimisation
                    <img src={thumbUrl(v.cover.src)} alt="" loading="lazy" className="size-full object-cover transition-transform duration-[1200ms] ease-out-expo group-hover:scale-[1.03]" />
                  ) : (
                    <span className="flex size-full items-center justify-center text-[0.8125rem] text-ink-mute">No photo yet</span>
                  )}
                  <span className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {v.hidden && <Badge tone="ink">Hidden</Badge>}
                    {v.changes && (
                      // Solid, so it reads on any photo.
                      <Badge tone="warn" className="bg-surface!">
                        Changed
                      </Badge>
                    )}
                    {v.featured && <Badge tone="ink">Home page</Badge>}
                    {v.largeTile && <Badge className="bg-surface/90">Large tile</Badge>}
                  </span>
                </span>
                <span className="mt-3 block font-display text-[1.125rem] leading-tight tracking-[-0.01em]">{v.name}</span>
                <span className="mt-0.5 block text-[0.8125rem] text-ink-soft">
                  {v.discipline}
                  {!v.statsEnabled && <span className="text-ink-mute"> · Stats off</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Drawer open={!!open} onClose={() => setOpenId(undefined)} title={sheet?.name ?? ""}>
        {sheet && (
          <div>
            {sheet.cover && (
              // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage photo, no image optimisation
              <img src={sheet.cover.src} alt="" className="max-h-[52vh] w-full bg-paper-soft object-cover" style={{ aspectRatio: Math.max(sheet.cover.ratio, 0.8) }} />
            )}
            <div className="px-6 py-6">
              <p className="font-display text-[1.75rem] leading-[1.05] tracking-[-0.015em]">{sheet.name}</p>
              <p className="mt-1 text-[0.875rem] text-ink-soft">{sheet.discipline}</p>
              <Link
                href={`/admin/vendors/${sheet.slug}`}
                // No prefetch={true}: that renders each vendor's page on the server ahead, seconds for one not
                // opened lately, and a click waits on it. The page reads the listing in the browser, so the
                // shared shell every link loads by default opens it at once.
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
