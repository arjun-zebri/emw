import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { PageTransition } from "@/components/motion/PageTransition";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Enquire } from "@/components/vendor/Enquire";
import { Gallery, GalleryImage } from "@/components/vendor/Gallery";
import { StickyColumn } from "@/components/vendor/StickyColumn";
import { VendorCard } from "@/components/vendors/VendorCard";
import { type Slot, vendorImages } from "@/data/images";
import { languages, serviceLabels, states } from "@/data/taxonomy";
import type { Vendor } from "@/data/types";
import { getVendor, locationLabel, relatedVendors, vendors } from "@/lib/vendors";

export function generateStaticParams() {
  return vendors.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: PageProps<"/vendors/[slug]">): Promise<Metadata> {
  const vendor = getVendor((await params).slug);
  if (!vendor) return {};
  return { title: vendor.name, description: vendor.lede, openGraph: { title: vendor.name, description: vendor.lede } };
}

function displayUrl(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

function contactLinks(vendor: Vendor) {
  const { contact = {}, socials = {} } = vendor;
  return [
    contact.website && { href: contact.website, label: displayUrl(contact.website), icon: "globe" },
    socials.instagram && { href: socials.instagram, label: "Instagram", icon: "instagram" },
    socials.facebook && { href: socials.facebook, label: "Facebook", icon: "facebook" },
    socials.youtube && { href: socials.youtube, label: "YouTube", icon: "youtube" },
  ].filter(Boolean) as { href: string; label: string; icon: IconName }[];
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

export default function VendorPage({ params }: PageProps<"/vendors/[slug]">) {
  return (
    <PageTransition>
      <Suspense fallback={<div className="min-h-[100svh]" />}>
        <VendorFeature params={params} />
      </Suspense>
    </PageTransition>
  );
}

async function VendorFeature({ params }: { params: PageProps<"/vendors/[slug]">["params"] }) {
  const vendor = getVendor((await params).slug);
  if (!vendor) notFound();

  const images = vendorImages(vendor);
  const landscape = ratioOf(images[0]) >= 1.2;
  const area = vendor.serviceArea ?? [];
  const tongues = vendor.languages ?? [];
  const related = relatedVendors(vendor, 3);
  const links = contactLinks(vendor);
  const gallery = rows(images);

  const details = [
    { label: "Services", value: vendor.services.map((s) => serviceLabels[s]).join(", ") },
    { label: "Service area", value: area.length >= 8 ? "Australia-wide" : area.map((s) => states[s]).join(", ") || "On request" },
    vendor.travels ? { label: "Travel", value: vendor.travels } : null,
  ].filter(Boolean) as { label: string; value: React.ReactNode }[];

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

            <div className={clsx("lg:col-span-5 lg:col-start-8 lg:row-start-1", gallery.length > 0 && "lg:row-span-2")}>
              <StickyColumn
                className={clsx(
                  "flex flex-col lg:pt-1",
                  gallery.length > 0 ? "lg:sticky lg:top-[calc(var(--header-h)+1rem)]" : "lg:h-full",
                )}
              >
                <h1 data-intro-in className="t-display text-[clamp(2.5rem,4.4vw,4.75rem)] text-balance">
                  {vendor.name}
                </h1>
                <p data-intro-in style={{ "--d": "0.06s" } as React.CSSProperties} className="t-body mt-4 text-ink">
                  {vendor.discipline}, {locationLabel(vendor)}
                </p>
                {tongues.length > 0 && (
                  <p
                    data-intro-in
                    style={{ "--d": "0.1s" } as React.CSSProperties}
                    className="t-title mt-3 flex flex-wrap gap-x-4 text-ink-soft"
                  >
                    {tongues.map((l) => (
                      <span key={l} lang={languages[l].lang} title={l}>
                        {languages[l].native}
                      </span>
                    ))}
                  </p>
                )}

                <p
                  data-intro-in
                  style={{ "--d": "0.14s" } as React.CSSProperties}
                  className="t-title mt-8 text-[1.5rem] leading-[1.3] text-pretty"
                >
                  {vendor.lede}
                </p>
                <div data-intro-in style={{ "--d": "0.18s" } as React.CSSProperties} className="t-body mt-5 space-y-4 text-ink">
                  {vendor.story.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>

                <div className={clsx("mt-8", gallery.length === 0 && "lg:mt-auto lg:pt-10")}>
                  <dl className="border-t hairline">
                    {details.map((d) => (
                      <div key={d.label} className="grid grid-cols-[7.5rem_1fr] gap-4 border-b hairline py-3.5">
                        <dt className="t-small">{d.label}</dt>
                        <dd>{d.value}</dd>
                      </div>
                    ))}
                  </dl>

                  <Enquire vendorName={vendor.name} className="mt-6 w-full" />

                  {links.length > 0 && (
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {links.map((l) => (
                        <li key={l.href}>
                          <a
                            href={l.href}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={l.icon === "globe" ? `Website: ${l.label}` : l.label}
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
                          data-reveal-media
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

        <section className="mt-[clamp(4rem,8vw,6rem)] border-t hairline">
          <div className="shell py-[clamp(3rem,6vw,5rem)]">
            <div className="mb-8 flex items-baseline justify-between">
              <h2 className="t-title">Similar vendors</h2>
              <ArrowLink href="/vendors" transitionTypes={["nav-back"]}>
                All vendors
              </ArrowLink>
            </div>
            <div className="grid grid-cols-1 gap-x-[clamp(1rem,1.6vw,1.5rem)] gap-y-10 sm:grid-cols-3">
              {related.map((v) => (
                <VendorCard key={v.slug} data={{ vendor: v, location: locationLabel(v) }} sizes="(min-width: 640px) 33vw, 100vw" />
              ))}
            </div>
          </div>
        </section>
      </article>
    </Gallery>
  );
}
