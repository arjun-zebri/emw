import clsx from "clsx";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons/Icon";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Button } from "@/components/ui/Button";
import { Enquire } from "@/components/vendor/Enquire";
import { Gallery, GalleryImage } from "@/components/vendor/Gallery";
import { StickyColumn } from "@/components/vendor/StickyColumn";
import { Story } from "@/components/vendor/Story";
import { VendorCard } from "@/components/vendors/VendorCard";
import { type Slot, vendorImages } from "@/data/images";
import { areaLabel, serviceLabels } from "@/data/taxonomy";
import type { Vendor } from "@/data/types";
import { locationLabel, relatedHeading, socialHandle, youtubeChannel } from "@/lib/vendors";
import { LanguageName } from "@/components/ui/LanguageName";

function displayUrl(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

function contactLinks(vendor: Vendor) {
  const { contact = {}, socials = {} } = vendor;
  return [
    contact.website && { href: contact.website, label: displayUrl(contact.website), site: "Website", icon: "globe" },
    socials.instagram && { href: socials.instagram, label: socialHandle(socials.instagram) ?? "Instagram", site: "Instagram", icon: "instagram" },
    socials.facebook && { href: socials.facebook, label: socialHandle(socials.facebook) ?? "Facebook", site: "Facebook", icon: "facebook" },
    socials.youtube && { href: socials.youtube, label: youtubeChannel(socials.youtube) ?? "YouTube", site: "YouTube", icon: "youtube" },
  ].filter(Boolean) as { href: string; label: string; site: string; icon: IconName }[];
}

const ratioOf = (img: Slot) => img.ratio ?? 0.8;

/**
 * Splits the photos after the cover into justified rows for the image column: every frame in a row
 * shares one height and keeps its own ratio, so nothing is cropped and each row runs edge to edge.
 * Rows fill to a combined ratio of about 2.4; a short last row joins the one before it.
 */
function rows(images: Slot[], target = 2.4) {
  const out: { img: Slot; index: number }[][] = [];
  let row: { img: Slot; index: number }[] = [];
  let sum = 0;
  images.slice(1).forEach((img, i) => {
    row.push({ img, index: i + 1 });
    sum += ratioOf(img);
    if (sum >= target) {
      out.push(row);
      row = [];
      sum = 0;
    }
  });
  if (row.length) {
    if (out.length && sum < target * 0.6) out[out.length - 1].push(...row);
    else out.push(row);
  }
  return out;
}

/**
 * The vendor page itself, from the back link to similar vendors. The public page renders it, and
 * so does the apply flow's preview (`still`): there the reveals and the enquiry form stand down,
 * since the preview has neither the site's motion runtime nor a listing to enquire about.
 */
export function VendorSpread({ vendor, related, still }: { vendor: Vendor; related: Vendor[]; still?: boolean }) {
  const images = vendorImages(vendor);
  const landscape = ratioOf(images[0]) >= 1.2;
  const area = vendor.serviceArea ?? [];
  const tongues = vendor.languages ?? [];
  const otherTongues = vendor.otherLanguages ?? [];
  const links = contactLinks(vendor);
  const gallery = rows(images);
  const more = relatedHeading(vendor, related);
  const intro = (d: number) => (still ? {} : { "data-intro-in": true, style: { "--d": `${d}s` } as React.CSSProperties });

  const details = [
    { label: "Services", value: vendor.services.map((s) => serviceLabels[s]).join(", ") || "On request" },
    { label: "Service area", value: areaLabel(area) },
    vendor.travels ? { label: "Travel", value: vendor.travels } : null,
  ].filter((d) => d?.value) as { label: string; value: React.ReactNode }[];

  return (
    <Gallery images={images} name={vendor.name} slug={vendor.slug}>
      <article className="pt-[var(--header-h)]">
        <div className="shell">
          <Link href="/vendors" transitionTypes={["nav-back"]} className="t-small group my-5 inline-flex items-center gap-2 hover:text-ink">
            <Icon name="arrow-left" className="size-3.5 transition-transform duration-500 ease-out-expo group-hover:-translate-x-1" />
            Vendors
          </Link>

          {/*
            Photographs on the left, the vendor on the right. With more than one photo, the right column
            stays in view while the photos scroll past; with only the cover, it runs the cover's height
            with the story at the top and the details at the foot, so the spread is full either way.
            On phones: cover, then the vendor, then the rest of the photos.
          */}
          <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-[clamp(2rem,4vw,4.5rem)]">
            <GalleryImage
              index={0}
              priority
              sizes="(min-width: 1024px) 58vw, 100vw"
              className={clsx(
                "w-full lg:col-span-7 lg:row-start-1 lg:max-h-[calc(100svh-var(--header-h)-2rem)]",
                landscape ? "aspect-[4/3]" : "aspect-[4/5]",
              )}
            />

            {/* min-w-0 and anywhere-wrapping, so one very long word can't push the page wider than the screen. */}
            <div className={clsx("min-w-0 [overflow-wrap:anywhere] lg:col-span-5 lg:col-start-8 lg:row-start-1", gallery.length > 0 && "lg:row-span-2")}>
              <StickyColumn
                className={clsx(
                  "flex flex-col lg:pt-1",
                  gallery.length > 0 ? "lg:sticky lg:top-[calc(var(--header-h)+1rem)]" : "lg:h-full",
                )}
              >
                <h1 {...intro(0)} className="t-display text-[clamp(2.5rem,4.4vw,4.75rem)] text-balance">
                  {vendor.name}
                </h1>
                <p {...intro(0.06)} className="t-body mt-4 text-ink">
                  {vendor.discipline}, {locationLabel(vendor)}
                </p>
                {tongues.length + otherTongues.length > 0 && (
                  <p {...intro(0.1)} className="t-title mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-ink-soft">
                    {tongues.map((l) => (
                      <LanguageName key={l} name={l} english="font-sans t-small tracking-normal" />
                    ))}
                    {otherTongues.map((l) => (
                      <span key={l}>{l}</span>
                    ))}
                  </p>
                )}

                {vendor.lede && (
                  <p {...intro(0.14)} className="t-title mt-8 text-[1.5rem] leading-[1.3] text-pretty">
                    {vendor.lede}
                  </p>
                )}
                {vendor.story.length > 0 && (
                  <div {...intro(0.18)} className={vendor.lede ? "mt-5" : "mt-8"}>
                    <Story blocks={vendor.story} />
                  </div>
                )}

                <div className={clsx("mt-8", gallery.length === 0 && "lg:mt-auto lg:pt-10")}>
                  <dl className="border-t hairline">
                    {details.map((d) => (
                      <div key={d.label} className="grid grid-cols-[7.5rem_1fr] gap-4 border-b hairline py-3.5">
                        <dt className="t-small">{d.label}</dt>
                        <dd>{d.value}</dd>
                      </div>
                    ))}
                  </dl>

                  {still ? (
                    <Button type="button" tabIndex={-1} className="mt-6 w-full">
                      Enquire
                    </Button>
                  ) : (
                    <Enquire vendorName={vendor.name} greeting={vendor.person?.trim().split(/\s+/)[0] || vendor.name} slug={vendor.slug} className="mt-6 w-full" />
                  )}

                  {links.length > 0 && (
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {links.map((l) => (
                        <li key={l.href}>
                          <a
                            href={l.href}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={l.label === l.site ? l.label : `${l.site}: ${l.label}`}
                            className="t-small inline-flex h-10 items-center gap-2 border hairline px-3.5 text-ink transition-colors duration-300 hover:border-ink"
                          >
                            <Icon name={l.icon} className="size-4" />
                            {l.icon === "globe" ? l.label : <span className="sr-only sm:not-sr-only">{l.label}</span>}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </StickyColumn>
            </div>

            {gallery.length > 0 && (
              <section aria-label="Photographs" className="space-y-[clamp(0.5rem,1vw,1rem)] lg:col-span-7 lg:row-start-2 lg:self-start">
                {gallery.map((row) => {
                  const total = row.reduce((sum, { img }) => sum + ratioOf(img), 0);
                  return (
                    // Stacked on phones. Flex-grow is each frame's share of the row (they must sum to 1 to fill it). A lone frame is kept no taller than 4:5.
                    <div key={row[0].index} className="flex flex-col gap-[clamp(0.5rem,1vw,1rem)] sm:flex-row">
                      {row.map(({ img, index }) => (
                        <div
                          key={index}
                          {...(still ? {} : { "data-reveal-media": true })}
                          suppressHydrationWarning
                          className="min-w-0 sm:[flex:var(--r)_1_0%]"
                          style={
                            {
                              "--r": ratioOf(img) / total,
                              aspectRatio: row.length === 1 ? Math.max(ratioOf(img), 0.8) : ratioOf(img),
                            } as React.CSSProperties
                          }
                        >
                          <GalleryImage
                            index={index}
                            sizes={`(min-width: 1024px) ${Math.round((ratioOf(img) / total) * 58)}vw, 100vw`}
                            className="size-full"
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </section>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-[clamp(4rem,8vw,6rem)] border-t hairline">
            <div className="shell py-[clamp(3rem,6vw,5rem)]">
              <div className="mb-8 flex items-baseline justify-between gap-6">
                <h2 className="t-title">{more.title}</h2>
                <ArrowLink href={more.href} transitionTypes={["nav-back"]} className="shrink-0">
                  View all
                </ArrowLink>
              </div>
              <div className="grid grid-cols-1 gap-x-[clamp(1rem,1.6vw,1.5rem)] gap-y-10 sm:grid-cols-3">
                {related.map((v) => (
                  <VendorCard key={v.slug} data={{ vendor: v, location: locationLabel(v) }} sizes="(min-width: 640px) 33vw, 100vw" />
                ))}
              </div>
            </div>
          </section>
        )}
      </article>
    </Gallery>
  );
}
