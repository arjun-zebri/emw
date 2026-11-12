import type { Metadata } from "next";
import { Vendors } from "@/components/admin/owner/Vendors";

export const metadata: Metadata = { title: "Vendors" };

export default function VendorsPage() {
  return <Vendors />;
}
