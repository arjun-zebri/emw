import type { Metadata } from "next";
import { Account } from "@/components/admin/owner/Account";

export const metadata: Metadata = { title: "Account" };

export default function Page() {
  return <Account />;
}
