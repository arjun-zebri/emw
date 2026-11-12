"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Skeleton, SkeletonLines } from "@/components/ui/Skeleton";
import { plural } from "@/lib/admin/format";
import { type PlacedVendor, type Switch, usePlacement } from "@/lib/admin/placement";
import { toast } from "@/lib/admin/toast";
import { thumbUrl } from "@/lib/supabase/storage";
import { Drawer } from "../Drawer";
import { Badge, Empty, PageHeader, Tabs, Toggle } from "../ui";

type Tab = "all" | "featured" | "largeTile" | "statsOff";

const grid = "grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6";

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

/** Every published vendor as its photo, with the team's switches for it in a sheet. */
export function Vendors() {
  const { vendors, error, toggle } = usePlacement();
  const [tab, setTab] = useState<Tab>("all");
  const [openId, setOpenId] = useState<string>();
  const open = vendors?.find((v) => v.id === openId);

  const pinned = vendors?.filter((v) => v.featured) ?? [];
  const wide = vendors?.filter((v) => v.largeTile) ?? [];
  const statsOff = vendors?.filter((v) => !v.statsEnabled) ?? [];
  const shown = { all: vendors ?? [], featured: pinned, largeTile: wide, statsOff }[tab];

  const flip = (v: PlacedVendor, key: Switch, on: boolean) =>
    void toggle(v.id, key, on).catch((e: Error) => toast(`Couldn't change ${v.name}: ${e.message}`));

  return (
    <>
      <PageHeader
        title="Vendors"
        description={
          vendors
            ? `${plural(vendors.length, "vendor")} on the site · ${pinned.length} pinned to the home page · ${plural(wide.length, "large tile")}`
            : "Every vendor on the site"
        }
      >
        <Tabs
          className="mt-8"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "all", label: "All", count: vendors?.length },
            { id: "featured", label: "Home page", count: vendors && pinned.length },
            { id: "largeTile", label: "Large tile", count: vendors && wide.length },
            { id: "statsOff", label: "Stats off", count: vendors && statsOff.length },
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
        <Empty title={tab === "featured" ? "Nobody is pinned yet" : tab === "largeTile" ? "No large tiles yet" : "Every vendor sees their stats"}>
          {tab === "featured"
            ? "The home page picks five vendors at random on every visit. Open a vendor to pin them to that row."
            : tab === "largeTile"
              ? "Open a vendor to give them a double-width tile in the directory."
              : "Stats are on for everyone during the launch year."}
        </Empty>
      ) : (
        <ul className={grid}>
          {shown.map((v) => (
            <li key={v.id}>
              <button type="button" onClick={() => setOpenId(v.id)} className="group block w-full text-left">
                <span className="relative block aspect-[4/5] overflow-hidden bg-paper-soft">
                  {v.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage thumbnails, no image optimisation
                    <img src={thumbUrl(v.cover.src)} alt="" loading="lazy" className="size-full object-cover transition-transform duration-[1200ms] ease-out-expo group-hover:scale-[1.03]" />
                  ) : (
                    <span className="flex size-full items-center justify-center text-[0.8125rem] text-ink-mute">No photo yet</span>
                  )}
                  <span className="absolute top-2 left-2 flex flex-wrap gap-1">
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

      <Drawer open={!!open} onClose={() => setOpenId(undefined)} title={open?.name ?? ""}>
        {open && (
          <div>
            {open.cover && (
              // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage photo, no image optimisation
              <img src={open.cover.src} alt="" className="max-h-[52vh] w-full bg-paper-soft object-cover" style={{ aspectRatio: Math.max(open.cover.ratio, 0.8) }} />
            )}
            <div className="px-6 py-6">
              <p className="font-display text-[1.75rem] leading-[1.05] tracking-[-0.015em]">{open.name}</p>
              <p className="mt-1 text-[0.875rem] text-ink-soft">{open.discipline}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.875rem]">
                <span className="text-ink">
                  <span className="tabular-nums">{open.views.toLocaleString("en-AU")}</span> page {open.views === 1 ? "view" : "views"} in the last 30 days
                </span>
                <Link href={`/vendors/${open.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-ink-soft transition-colors hover:text-ink">
                  View on the site
                  <Icon name="arrow-up-right" className="size-3.5" strokeWidth={1.5} />
                </Link>
              </div>
            </div>
            <ul className="border-t hairline">
              {switches.map((s) => {
                const blocked = s.needsPhoto && !open.cover;
                return (
                  <li key={s.key} className="flex items-start gap-6 border-b hairline px-6 py-5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.9375rem] text-ink">{s.title}</p>
                      <p className={clsx("mt-1 text-[0.875rem] leading-relaxed text-ink-soft")}>{blocked ? "Needs a photo first." : s.detail}</p>
                    </div>
                    <div className="pt-0.5">
                      <Toggle checked={open[s.key]} onChange={(on) => flip(open, s.key, on)} label={`${s.title}: ${open.name}`} disabled={blocked} />
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
