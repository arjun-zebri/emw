"use client";

import clsx from "clsx";
import { useEffect } from "react";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Button } from "@/components/ui/Button";
import { reportClient } from "@/lib/observe/client";

/**
 * What a page that failed shows, in the 404's shape: one line, try again, or go to the vendors.
 * Server errors were reported when they happened (instrumentation.ts; their digest ties the two
 * together). One with no digest broke in the browser, and is reported from here.
 */
export function ErrorScreen({ error, retry, className }: { error: unknown; retry: () => void; className?: string }) {
  useEffect(() => {
    const digest = error instanceof Error && "digest" in error ? String(error.digest) : undefined;
    if (!digest) reportClient(error, "page");
  }, [error]);

  return (
    <section className={clsx("shell flex min-h-[80svh] flex-col items-start justify-end gap-8 pb-[clamp(4rem,10vw,8rem)]", className)}>
      <h1 className="t-display">This page didn’t load</h1>
      <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
        <Button onClick={retry}>Try again</Button>
        <ArrowLink href="/vendors">Browse vendors</ArrowLink>
      </div>
    </section>
  );
}
