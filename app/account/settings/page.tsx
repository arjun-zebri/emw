import type { Metadata } from "next";
import { Account } from "@/components/admin/vendor/Account";

export const metadata: Metadata = { title: "Your account" };

export default function Page() {
  return <Account />;
}
