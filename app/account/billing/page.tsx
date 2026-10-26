import type { Metadata } from "next";
import { Billing } from "@/components/admin/vendor/Billing";

export const metadata: Metadata = { title: "Plan & billing" };

export default function Page() {
  return <Billing />;
}
