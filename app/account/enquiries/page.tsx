import type { Metadata } from "next";
import { Enquiries } from "@/components/admin/vendor/Enquiries";

export const metadata: Metadata = { title: "Enquiries" };

export default function Page() {
  return <Enquiries />;
}
