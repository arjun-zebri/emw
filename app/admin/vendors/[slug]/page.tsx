import { Suspense } from "react";
import { ListingSkeleton } from "@/components/admin/vendor/Listing";
import { BackToVendors, OldVendorLink } from "@/components/admin/owner/VendorListing";

// The editor's old address, kept so a saved link still opens it.
export default function OldVendorAdminPage() {
  return (
    <>
      <BackToVendors />
      <ListingSkeleton />
      <Suspense>
        <OldVendorLink />
      </Suspense>
    </>
  );
}
