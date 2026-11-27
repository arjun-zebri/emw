import type { Metadata } from "next";
import { PagesList } from "@/components/admin/pages/PagesList";

export const metadata: Metadata = { title: "Pages" };

export default function PagesPage() {
  return <PagesList />;
}
