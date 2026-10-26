import type { Metadata } from "next";
import { Traffic } from "@/components/admin/owner/Traffic";

export const metadata: Metadata = { title: "Traffic" };

export default function TrafficPage() {
  return <Traffic />;
}
