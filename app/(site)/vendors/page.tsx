import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/PageTransition";
import { VendorDirectory } from "@/components/vendors/VendorDirectory";
import { crafts } from "@/data/taxonomy";
import { areaCounts, craftCounts, languageCounts, locationLabel, serviceCounts, vendors } from "@/lib/vendors";

export const metadata: Metadata = {
  title: "Vendors",
  description: "Wedding vendors for couples bringing two cultures together, searchable by category and language.",
};

export default function VendorsPage() {
  const counts = craftCounts();
  const cards = vendors.map((v) => ({ vendor: v, location: locationLabel(v) }));
  const tabs = [
    { id: null, label: "All", count: vendors.length },
    ...crafts.map((c) => ({ id: c.id, label: c.short, count: counts[c.id] })),
  ];
  const options = { languages: languageCounts(), areas: areaCounts(), services: serviceCounts() };

  return (
    <PageTransition>
      <div className="shell pt-[calc(var(--header-h)+clamp(3rem,8vw,6rem))] pb-[clamp(6rem,12vw,10rem)]">
        <h1 data-intro-in className="t-display mb-[clamp(2.5rem,5vw,4rem)]">
          Vendors
        </h1>
        <Suspense fallback={<div className="h-[80vh]" />}>
          <VendorDirectory cards={cards} tabs={tabs} options={options} />
        </Suspense>
      </div>
    </PageTransition>
  );
}
