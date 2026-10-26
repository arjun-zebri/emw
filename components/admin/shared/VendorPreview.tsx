"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import { Button } from "@/components/ui/Button";
import { vendorCover } from "@/data/images";
import { languages, serviceLabels, states } from "@/data/taxonomy";
import type { Vendor } from "@/data/types";
import { locationLabel, vendors } from "@/lib/vendors";
import { PreviewFrame } from "./PreviewFrame";
import type { VendorFormValues } from "./VendorForm";

type View = "page" | "directory";

const displayUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

/**
 * The listing as couples will see it, before it's saved: the vendor page, or the card among real
 * vendors in the directory. Same markup and type as the public pages, with the site header for
 * context; nothing in it links anywhere.
 */
export function VendorPreview({ values: v, photos, onClose }: { values: VendorFormValues; photos: string[]; onClose: () => void }) {
  const [view, setView] = useState<View>("page");
  const ratios = useRatios(photos);
  const location = locationLabel({ based: v.based || undefined, serviceArea: v.serviceArea } as Vendor);

  return (
    <PreviewFrame
      views={[
        { id: "page", label: "Vendor page" },
        { id: "directory", label: "In the directory" },
      ]}
      view={view}
      onView={setView}
      onClose={onClose}
    >
      {view === "page" ? <PagePreview v={v} photos={photos} ratios={ratios} location={location} /> : <DirectoryPreview v={v} cover={photos[0]} />}
    </PreviewFrame>
  );
}

function PagePreview({ v, photos, ratios, location }: { v: VendorFormValues; photos: string[]; ratios: Record<string, number>; location: string }) {
  const tongues = v.languages.filter((l) => l !== "English");
  const ratio = (src: string) => ratios[src] ?? 0.8;
  const landscape = photos[0] ? ratio(photos[0]) >= 1.2 : false;
  const gallery = rows(photos.slice(1), ratio);
  const area = v.serviceArea;
  const details = [
    v.services.length > 0 && { label: "Services", value: v.services.map((s) => serviceLabels[s]).join(", ") },
    { label: "Service area", value: area.length >= 8 ? "Australia-wide" : area.map((s) => states[s]).join(", ") || "On request" },
  ].filter(Boolean) as { label: string; value: string }[];
  const links = [
    v.website && { label: displayUrl(v.website), icon: "globe" },
    v.instagram && { label: "Instagram", icon: "instagram" },
    v.facebook && { label: "Facebook", icon: "facebook" },
  ].filter(Boolean) as { label: string; icon: IconName }[];

  return (
    <article className="shell pb-[clamp(4rem,8vw,6rem)]">
      <p className="t-small my-5 inline-flex items-center gap-2">
        <Icon name="arrow-left" className="size-3.5" />
        Vendors
      </p>
      <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-[clamp(2rem,4vw,4.5rem)]">
        <div
          className={clsx(
            "relative w-full overflow-hidden lg:col-span-7 lg:row-start-1 lg:max-h-[calc(100svh-var(--header-h)-5.5rem)]",
            landscape ? "aspect-[4/3]" : "aspect-[4/5]",
          )}
        >
          <Photo src={photos[0]} brief={`${v.name || "The vendor"}. Signature image.`} sizes="(min-width: 1024px) 58vw, 100vw" />
        </div>

        <div className={clsx("lg:col-span-5 lg:col-start-8 lg:row-start-1", gallery.length > 0 && "lg:row-span-2")}>
          <div className={clsx("flex flex-col lg:pt-1", gallery.length > 0 ? "lg:sticky lg:top-6" : "lg:h-full")}>
            <h1 className={clsx("t-display text-[clamp(2.5rem,4.4vw,4.75rem)] text-balance", !v.name && "text-ink-mute/35")}>{v.name || "Business name"}</h1>
            <p className="t-body mt-4 text-ink">{[v.discipline || "What they do", location].join(", ")}</p>
            {tongues.length > 0 && (
              <p className="t-title mt-3 flex flex-wrap gap-x-4 text-ink-soft">
                {tongues.map((l) => (
                  <span key={l} lang={languages[l].lang}>
                    {languages[l].native}
                  </span>
                ))}
              </p>
            )}
            {v.lede && <p className="t-title mt-8 text-[1.5rem] leading-[1.3] text-pretty">{v.lede}</p>}

            <div className={clsx("mt-8", gallery.length === 0 && "lg:mt-auto lg:pt-10")}>
              <dl className="border-t hairline">
                {details.map((d) => (
                  <div key={d.label} className="grid grid-cols-[7.5rem_1fr] gap-4 border-b hairline py-3.5">
                    <dt className="t-small">{d.label}</dt>
                    <dd>{d.value}</dd>
                  </div>
                ))}
              </dl>
              <Button type="button" tabIndex={-1} className="pointer-events-none mt-6 w-full">
                Enquire
              </Button>
              {links.length > 0 && (
                <ul className="mt-5 flex flex-wrap gap-2">
                  {links.map((l) => (
                    <li key={l.icon} className="t-small inline-flex h-10 items-center gap-2 border hairline px-3.5 text-ink">
                      <Icon name={l.icon} className="size-4" />
                      {l.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {gallery.length > 0 && (
          <section aria-label="Photographs" className="space-y-[clamp(0.5rem,1vw,1rem)] lg:col-span-7 lg:row-start-2 lg:self-start">
            {gallery.map((row) => (
              <div key={row[0]} className="flex flex-col gap-[clamp(0.5rem,1vw,1rem)] sm:flex-row">
                {row.map((src) => (
                  <div
                    key={src.slice(-40)}
                    className="relative min-w-0 overflow-hidden sm:[flex:var(--r)_1_0%]"
                    style={{ "--r": ratio(src), aspectRatio: ratio(src) } as React.CSSProperties}
                  >
                    <Photo src={src} brief="" sizes="40vw" />
                  </div>
                ))}
              </div>
            ))}
          </section>
        )}
      </div>
    </article>
  );
}

/** The card first, then real vendors who offer the same services, as the directory grid lays them out. */
function DirectoryPreview({ v, cover }: { v: VendorFormValues; cover?: string }) {
  const alike = vendors.filter((x) => x.cover && x.services.some((s) => v.services.includes(s)));
  const neighbours = [...alike, ...vendors.filter((x) => x.cover && !alike.includes(x))].slice(0, 7);
  const tongues = v.languages.filter((l) => l !== "English");

  return (
    <div className="shell pt-6 pb-[clamp(4rem,8vw,6rem)]">
      <h1 className="t-display mb-10">Vendors</h1>
      <div className="grid grid-cols-1 gap-x-[clamp(1rem,1.6vw,1.5rem)] gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Card name={v.name || "Business name"} line={v.discipline || "What they do"} tongues={tongues} faint={!v.name}>
          <Photo src={cover} brief={`${v.name || "The vendor"}. Signature image.`} sizes="25vw" />
        </Card>
        {neighbours.map((x) => (
          <Card key={x.slug} name={x.name} line={x.discipline} tongues={(x.languages ?? []).filter((l) => l !== "English")} quiet>
            <Media {...vendorCover(x)} sizes="25vw" className="size-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function Card({
  name,
  line,
  tongues,
  faint,
  quiet,
  children,
}: {
  name: string;
  line: string;
  tongues: VendorFormValues["languages"];
  faint?: boolean;
  /** The other vendors step back a little so the new card is the one you look at. */
  quiet?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx("flex flex-col transition-opacity", quiet && "opacity-55")}>
      <div className="relative aspect-[4/5] overflow-hidden">{children}</div>
      <h3 className={clsx("t-title mt-4", faint && "text-ink-mute/40")}>{name}</h3>
      <p className="t-small mt-1.5 flex flex-wrap gap-x-2.5">
        <span>{line}</span>
        {tongues.map((l) => (
          <span key={l} lang={languages[l].lang} className="text-ink-mute/75">
            {languages[l].native}
          </span>
        ))}
      </p>
    </div>
  );
}

function Photo({ src, brief, sizes }: { src?: string; brief: string; sizes: string }) {
  if (src?.startsWith("data:")) {
    // eslint-disable-next-line @next/next/no-img-element -- uploads are data URLs, which next/image can't optimise
    return <img src={src} alt="" className="absolute inset-0 size-full object-cover" />;
  }
  return (
    <span className="absolute inset-0">
      <Media src={src} alt="" brief={brief} sizes={sizes} className="size-full" />
    </span>
  );
}

/** Width ÷ height of each photo, read once it loads, so the rows below the cover keep every photo uncropped. */
function useRatios(srcs: string[]) {
  const [ratios, setRatios] = useState<Record<string, number>>({});
  useEffect(() => {
    let live = true;
    for (const src of srcs) {
      const img = new Image();
      img.onload = () => live && setRatios((r) => (r[src] ? r : { ...r, [src]: img.naturalWidth / img.naturalHeight }));
      img.src = src;
    }
    return () => {
      live = false;
    };
  }, [srcs]);
  return ratios;
}

/** The vendor page's justified rows: fill each to a combined ratio of about 2.4; a short last row joins the one before. */
function rows(srcs: string[], ratio: (src: string) => number, target = 2.4) {
  const out: string[][] = [];
  let row: string[] = [];
  let sum = 0;
  for (const src of srcs) {
    row.push(src);
    sum += ratio(src);
    if (sum >= target) {
      out.push(row);
      row = [];
      sum = 0;
    }
  }
  if (row.length) {
    if (out.length && sum < target * 0.6) out[out.length - 1].push(...row);
    else out.push(row);
  }
  return out;
}
