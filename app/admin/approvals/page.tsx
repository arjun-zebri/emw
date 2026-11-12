import type { Metadata } from "next";
import { Suspense } from "react";
import { Approvals, QueueSkeleton } from "@/components/admin/owner/Approvals";

export const metadata: Metadata = { title: "Approvals" };

export default function ApprovalsPage() {
  return (
    <Suspense fallback={<QueueSkeleton />}>
      <Approvals />
    </Suspense>
  );
}
