import type { Metadata } from "next";
import { Suspense } from "react";
import { ListingSkeleton } from "@/components/admin/vendor/Listing";
import { BackToVendors, VendorListing } from "@/components/admin/owner/VendorListing";

export const metadata: Metadata = { title: "Edit listing" };

// The listing loads in the browser as the signed-in team member, so the slug is read there too.
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
