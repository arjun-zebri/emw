import type { Metadata } from "next";
import { NewVendor } from "@/components/admin/owner/NewVendor";

export const metadata: Metadata = { title: "Add a vendor" };

export default function NewVendorPage() {
  return <NewVendor />;
}
