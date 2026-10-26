import type { Metadata } from "next";
import { VendorsList } from "@/components/admin/owner/VendorsList";

export const metadata: Metadata = { title: "Vendors" };

export default function VendorsPage() {
  return <VendorsList />;
}
