"use client";

import { ErrorScreen } from "@/components/site/ErrorScreen";

/** Pages outside the site's layout (the application, sign-in) that failed. Each has its own top bar, so none here. */
export default function PageError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <main id="main">
      <ErrorScreen error={error} retry={retry} className="pt-16" />
    </main>
  );
}
