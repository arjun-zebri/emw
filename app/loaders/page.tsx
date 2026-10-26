import type { Metadata } from "next";
import { Suspense } from "react";
import { LoaderLab } from "./LoaderLab";

/* TEMPORARY: loader options for review. Delete before deploying. */
export const metadata: Metadata = { title: "Loader options", robots: { index: false } };

export default function LoadersPage() {
  return (
    <Suspense>
      <LoaderLab />
    </Suspense>
  );
}
