"use client";

import { useEffect } from "react";
import { reportClient } from "@/lib/observe/client";
import { Btn, PageHeader } from "./ui";

/**
 * A page in /admin or /account that failed, inside the shell so the menu still works. Server
 * errors were reported when they happened; one with no digest broke in the browser and is
 * reported from here.
 */
export function PageError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    const digest = error instanceof Error && "digest" in error ? String(error.digest) : undefined;
    if (!digest) reportClient(error, "page");
  }, [error]);

  return <PageHeader title="This page didn’t load" description="It’s been reported. Try again in a moment." actions={<Btn variant="primary" onClick={retry}>Try again</Btn>} />;
}
