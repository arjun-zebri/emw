import type { Metadata } from "next";
import { Suspense } from "react";
import { Confirm } from "@/components/apply/Confirm";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false },
};

/** Opened from the confirmation email. The confirming happens in the browser (see lib/apply/account.ts). */
export default function ConfirmPage() {
  return (
    <Suspense>
      <Confirm />
    </Suspense>
  );
}
