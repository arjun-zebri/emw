import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/PageTransition";
import { DirectorySkeleton } from "@/components/vendors/DirectorySkeleton";
import { VendorDirectory } from "@/components/vendors/VendorDirectory";
import { getListings } from "@/lib/listings";
import { pageMeta } from "@/lib/seo";
import { areaCounts, craftCounts, languageCounts, listedCrafts, locationLabel, serviceCounts } from "@/lib/vendors";

export const metadata: Metadata = pageMeta({
  title: "Vendors",
  description:
    "Celebrants, MCs, photographers, videographers, stylists, florists and more who honour your culture. Search by category, location and language.",
  path: "/vendors",
});

export default async function VendorsPage() {
  const vendors = await getListings();
  const counts = craftCounts(vendors);
  const cards = vendors.map((v) => ({ vendor: v, location: locationLabel(v) }));
  const tabs = [
    { id: null, label: "All", count: vendors.length },
    ...listedCrafts(vendors).map((c) => ({ id: c.id, label: c.short, count: counts[c.id] })),
  ];
  const options = { languages: languageCounts(vendors), areas: areaCounts(vendors), services: serviceCounts(vendors) };

  return (
    <PageTransition>
      <div className="shell pt-[calc(var(--header-h)+clamp(3rem,8vw,6rem))] pb-[clamp(6rem,12vw,10rem)]">
        <h1 data-intro-in className="t-display">
          Vendors
        </h1>
        <p data-intro-in style={{ "--d": "0.12s" } as React.CSSProperties} className="t-body mt-6 mb-[clamp(2.5rem,5vw,4rem)] max-w-[58ch]">
          Every wedding carries a story: your culture, your family, the traditions that matter to you. Maybe you know
          yours by heart, or maybe you&rsquo;re still discovering it. These are vendors who&rsquo;ll honour it and help you
          find your way.
        </p>
        <Suspense fallback={<DirectorySkeleton />}>
          <VendorDirectory cards={cards} tabs={tabs} options={options} />
        </Suspense>
      </div>
    </PageTransition>
  );
}
