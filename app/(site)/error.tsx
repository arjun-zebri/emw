"use client";

import { ErrorScreen } from "@/components/site/ErrorScreen";

/** A public page that failed, inside the site's header and footer. */
export default function SiteError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorScreen error={error} retry={retry} className="pt-[var(--header-h)]" />;
}
