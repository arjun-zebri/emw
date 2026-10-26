import type { Metadata } from "next";
import { Settings } from "@/components/admin/owner/Settings";

export const metadata: Metadata = { title: "Team" };

export default function Page() {
  return <Settings />;
}
