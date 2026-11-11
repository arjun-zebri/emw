import type { Metadata } from "next";
import { Suspense } from "react";
import { ChoosePassword } from "@/components/admin/ChoosePassword";

export const metadata: Metadata = {
  title: "Choose your password",
  robots: { index: false, follow: false },
};

/** Opened from the "Choose your password" email. The link is used in the browser (see lib/account/access.ts). */
export default function PasswordPage() {
  return (
    <Suspense>
      <ChoosePassword />
    </Suspense>
  );
}
