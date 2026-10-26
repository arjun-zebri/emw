import type { Metadata } from "next";
import { JournalList } from "@/components/admin/owner/JournalList";

export const metadata: Metadata = { title: "Journal" };

export default function JournalPage() {
  return <JournalList />;
}
