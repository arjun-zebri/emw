import type { Metadata } from "next";
import { Suspense } from "react";
import { ListingSkeleton } from "@/components/admin/vendor/Listing";
import { BackToVendors, VendorListing } from "@/components/admin/owner/VendorListing";

export const metadata: Metadata = { title: "Edit listing" };

// One fixed page for every vendor (`?slug=`), read in the browser as the signed-in team member. A
// page per vendor (/admin/vendors/<slug>) made the host build each one on first visit, about six
// seconds in which "Edit" looked like it did nothing.
export default function VendorAdminPage() {
  return (
    <Suspense
      fallback={
        <>
          <BackToVendors />
          <ListingSkeleton />
        </>
      }
    >
      <VendorListing />
    </Suspense>
  );
}
