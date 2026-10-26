import type { Metadata } from "next";
import { Suspense } from "react";
import { JournalEditor } from "@/components/admin/owner/JournalEditor";
import { seedPosts } from "@/data/journal";

export const metadata: Metadata = { title: "Journal" };

// The seed posts and "new" are prerendered; posts written in the demo live in the browser, so the
// editor reads its id on the client and any other id renders on request.
export function generateStaticParams() {
  return [{ id: "new" }, ...seedPosts.map((p) => ({ id: p.id }))];
}

export default function JournalPostPage() {
  return (
    <Suspense>
      <JournalEditor />
    </Suspense>
  );
}
