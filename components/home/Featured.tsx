import clsx from "clsx";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VendorCard } from "@/components/vendors/VendorCard";
import { getVendor, locationLabel } from "@/lib/vendors";

// Chosen for range: craft, culture and colour.
const picks = ["at-last-film-and-photography", "folkstone-weddings", "sugar-bee-flowers", "katrina-lai", "candy-ng-art"];

/*
 * A wide pair, then a row of three, on a 12-column grid. The wide image is sized to the exact height
 * of its 4:5 neighbour so the pair shares a bottom edge and the names sit on one line. With
 * c = (100cqw - 11g) / 12, a four-column 4:5 image is 1.25 × (4c + 3g) = 41.6667cqw - 0.8333g tall.
 */
const layout = [
  { cell: "md:col-span-8", aspect: "aspect-[4/3] md:aspect-auto md:h-[calc(41.6667cqw-0.8333*var(--g))]", position: "50% 15%" },
  { cell: "md:col-span-4", aspect: "aspect-[4/5]" },
  { cell: "md:col-span-4", aspect: "aspect-[4/5]" },
  { cell: "md:col-span-4", aspect: "aspect-[4/5]" },
  { cell: "md:col-span-4", aspect: "aspect-[4/5]" },
];

export function Featured() {
  return (
    <section className="shell pb-[var(--section)]">
      <SectionHeading link={{ href: "/vendors", label: "View all" }}>Featured vendors</SectionHeading>
      <div className="@container grid grid-cols-1 gap-x-[var(--g)] gap-y-14 [--g:clamp(1rem,2vw,2rem)] md:grid-cols-12">
        {picks.map((slug) => getVendor(slug)!).map((v, i) => (
          <div key={v.slug} data-reveal style={{ "--d": `${(i % 3) * 0.08}s` } as React.CSSProperties} className={clsx(layout[i].cell)}>
            <VendorCard
              data={{ vendor: v, location: locationLabel(v) }}
              aspect={layout[i].aspect}
              position={layout[i].position}
              sizes={i === 0 ? "(min-width: 768px) 66vw, 100vw" : "(min-width: 768px) 33vw, 100vw"}
            />
          </div>
        ))}
      </div>
      <ArrowLink href="/vendors" transitionTypes={["nav-forward"]} className="mt-14 md:hidden">
        View all vendors
      </ArrowLink>
    </section>
  );
}
