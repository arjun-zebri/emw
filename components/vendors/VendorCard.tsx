import clsx from "clsx";
import Link from "next/link";
import { ViewTransition } from "react";
import { Media } from "@/components/media/Media";
import { vendorCover } from "@/data/images";
import { languages } from "@/data/taxonomy";
import type { Vendor } from "@/data/types";

export type VendorCardData = { vendor: Vendor; location: string };

/**
 * Image, name, and one line: the discipline and the languages they work in, set in their own scripts.
 * The image carries a shared view-transition name, so opening a vendor morphs it into the vendor
 * page's cover. `prefetch` resolves the page ahead of the click, so the morph has a target to land on.
 */
export function VendorCard({
  data: { vendor, location },
  aspect = "aspect-[4/5]",
  sizes = "(min-width: 1280px) 25vw, (min-width: 640px) 45vw, 100vw",
  position,
  fill,
  priority,
  className,
}: {
  data: VendorCardData;
  aspect?: string;
  sizes?: string;
  /** Crop focus for the image, e.g. "50% 20%". */
  position?: string;
  /** At lg, let the image grow to fill a taller or wider grid cell instead of keeping its aspect. */
  fill?: boolean;
  /** Load eagerly, for a card that opens the page. */
  priority?: boolean;
  className?: string;
}) {
  const tongues = (vendor.languages ?? []).filter((l) => l !== "English");
  return (
    <Link
      href={`/vendors/${vendor.slug}`}
      prefetch
      transitionTypes={["nav-forward"]}
      className={clsx("group flex flex-col", fill && "lg:h-full", className)}
    >
      <div className={clsx("relative overflow-hidden", aspect, fill && "lg:aspect-auto lg:min-h-[20rem] lg:flex-1")}>
        <ViewTransition name={`vendor-${vendor.slug}`} share="morph" default="none">
          <div className="absolute inset-0 transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.03]">
            <Media {...vendorCover(vendor)} sizes={sizes} position={position} priority={priority} className="size-full" />
          </div>
        </ViewTransition>
      </div>
      <h3 className="t-title mt-4">{vendor.name}</h3>
      <p className="t-small mt-1.5 flex flex-wrap gap-x-2.5" title={location}>
        <span>{vendor.discipline}</span>
        {tongues.map((l) => (
          <span key={l} lang={languages[l].lang} className="text-ink-mute/75">
            {languages[l].native}
          </span>
        ))}
      </p>
    </Link>
  );
}
