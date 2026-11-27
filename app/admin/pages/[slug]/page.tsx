import type { Metadata } from "next";
import { Suspense } from "react";
import { PageEditor } from "@/components/admin/pages/PageEditor";
import { PAGE_SLUGS } from "@/lib/pages/pages";

export const metadata: Metadata = { title: "Pages" };

export function generateStaticParams() {
  return PAGE_SLUGS.map((slug) => ({ slug }));
}

// The editor reads the page in the browser, as the signed-in team member.
export default function EditPagePage() {
  return (
    <Suspense>
      <PageEditor />
    </Suspense>
  );
}
