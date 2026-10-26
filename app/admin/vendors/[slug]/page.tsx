import type { Metadata } from "next";
import { Suspense } from "react";
import { VendorDetail } from "@/components/admin/owner/VendorDetail";

export const metadata: Metadata = { title: "Vendor" };

// Vendors added in the demo only exist in the browser, so the slug is read on the client.
export default function VendorAdminPage() {
  return (
    <Suspense>
      <VendorDetail />
    </Suspense>
  );
}
