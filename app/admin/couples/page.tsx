import type { Metadata } from "next";
import { Couples } from "@/components/admin/owner/Couples";

export const metadata: Metadata = { title: "Couples" };

export default function CouplesPage() {
  return <Couples />;
}
