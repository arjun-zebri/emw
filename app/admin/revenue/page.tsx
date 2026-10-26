import type { Metadata } from "next";
import { Revenue } from "@/components/admin/owner/Revenue";

export const metadata: Metadata = { title: "Revenue" };

export default function RevenuePage() {
  return <Revenue />;
}
