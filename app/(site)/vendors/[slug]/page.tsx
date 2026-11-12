import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/PageTransition";
import { VendorSpread } from "@/components/vendor/VendorSpread";
import { JsonLd } from "@/components/site/JsonLd";
import { getListing, getListings } from "@/lib/listings";
import { vendorLd, vendorMeta } from "@/lib/seo";
import { VendorSkeleton } from "@/components/vendor/VendorSkeleton";
import { relatedVendors } from "@/lib/vendors";

export async function generateStaticParams() {
  return (await getListings()).map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: PageProps<"/vendors/[slug]">): Promise<Metadata> {
  const vendor = await getListing((await params).slug);
  return vendor ? vendorMeta(vendor) : {};
}

export default function VendorPage({ params }: PageProps<"/vendors/[slug]">) {
  return (
    <PageTransition>
      <Suspense fallback={<VendorSkeleton />}>
        <VendorFeature params={params} />
        <VendorSchema params={params} />
      </Suspense>
    </PageTransition>
  );
}

async function VendorFeature({ params }: { params: PageProps<"/vendors/[slug]">["params"] }) {
  const { slug } = await params;
  const vendors = await getListings();
  const vendor = vendors.find((v) => v.slug === slug);
  if (!vendor) notFound();

  return <VendorSpread vendor={vendor} related={relatedVendors(vendors, vendor, 3)} />;
}

async function VendorSchema({ params }: { params: PageProps<"/vendors/[slug]">["params"] }) {
  const vendor = await getListing((await params).slug);
  return vendor ? <JsonLd data={vendorLd(vendor)} /> : null;
}
