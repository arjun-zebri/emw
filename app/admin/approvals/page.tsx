import type { Metadata } from "next";
import { Suspense } from "react";
import { Approvals } from "@/components/admin/owner/Approvals";

export const metadata: Metadata = { title: "Approvals" };

export default function ApprovalsPage() {
  return (
    <Suspense>
      <Approvals />
    </Suspense>
  );
}
