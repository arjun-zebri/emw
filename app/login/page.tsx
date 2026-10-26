import type { Metadata } from "next";
import { Suspense } from "react";
import { SignIn } from "@/components/admin/SignIn";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}
