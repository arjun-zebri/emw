import type { Metadata } from "next";
import { Suspense } from "react";
import { JournalEditor } from "@/components/admin/journal/Editor";

export const metadata: Metadata = { title: "Journal" };

// Posts live in the database and the editor reads its id in the browser, so only "new" is
// prerendered; any other id renders on request.
export function generateStaticParams() {
  return [{ id: "new" }];
}

export default function JournalPostPage() {
  return (
    <Suspense>
      <JournalEditor />
    </Suspense>
  );
}
