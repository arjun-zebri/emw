import type { Metadata } from "next";
import { Listing } from "@/components/admin/vendor/Listing";

export const metadata: Metadata = { title: "Your listing" };

export default function ListingPage() {
  return <Listing />;
}
