import { ListingSkeleton } from "@/components/admin/vendor/Listing";
import { BackToVendors } from "@/components/admin/owner/VendorListing";

// Shows the moment "Edit listing" is clicked, while the page and the listing load.
export default function Loading() {
  return (
    <>
      <BackToVendors />
      <ListingSkeleton />
    </>
  );
}
