import clsx from "clsx";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VendorCard } from "@/components/vendors/VendorCard";
import { photoRatio } from "@/data/images";
import type { Vendor } from "@/data/types";
import { getListings } from "@/lib/listings";
import { locationLabel } from "@/lib/vendors";

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

const grid = "@container grid grid-cols-1 gap-x-[var(--g)] gap-y-14 [--g:clamp(1rem,2vw,2rem)] md:grid-cols-12";

function shuffle<T>(list: T[]) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Five published vendors with photos, picked afresh on every visit. A landscape cover leads when there is one, as it fills the wide tile best. */
async function Picks() {
  await connection();
  const pool = shuffle((await getListings()).filter((v): v is Vendor & { cover: string } => !!v.cover));
  const lead = pool.find((v) => (photoRatio(v, v.cover) ?? 0) >= 1.2) ?? pool[0];
  const chosen = lead ? [lead, ...pool.filter((v) => v !== lead)].slice(0, layout.length) : [];

  return chosen.map((v, i) => (
    <div key={v.slug} data-reveal suppressHydrationWarning style={{ "--d": `${(i % 3) * 0.08}s` } as React.CSSProperties} className={clsx(layout[i].cell)}>
      <VendorCard
        data={{ vendor: v, location: locationLabel(v) }}
        aspect={layout[i].aspect}
        position={layout[i].position}
        sizes={i === 0 ? "(min-width: 768px) 66vw, 100vw" : "(min-width: 768px) 33vw, 100vw"}
      />
    </div>
  ));
}

/** Holds the grid's shape while the picks arrive, so nothing below it jumps. */
function Placeholder() {
  return layout.map((l, i) => (
    <div key={i} aria-hidden className={l.cell}>
      <div className={l.aspect} />
      <div className="h-[4.25rem]" />
    </div>
  ));
}

export function Featured() {
  return (
    <section className="shell pb-[var(--section)]">
      <SectionHeading link={{ href: "/vendors", label: "View all" }} lede="From every background. All here because culture matters to them.">
        Meet some of our vendors
      </SectionHeading>
      <div className={grid}>
        <Suspense fallback={<Placeholder />}>
          <Picks />
        </Suspense>
      </div>
      <ArrowLink href="/vendors" transitionTypes={["nav-forward"]} className="mt-14 md:hidden">
        View all vendors
      </ArrowLink>
    </section>
  );
}
