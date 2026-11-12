"use client";

import { useEffect } from "react";
import { reportClient } from "@/lib/observe/client";
import "./globals.css";

/*
 * Only when the root layout itself fails, so nothing of it can be relied on: its own document,
 * system fonts, the paper and ink. Reported like app/error.tsx.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    const digest = error instanceof Error && "digest" in error ? String(error.digest) : undefined;
    if (!digest) reportClient(error, "page");
  }, [error]);

  return (
    <html lang="en-AU">
      <body className="bg-paper text-ink">
        <title>East Meets Wed</title>
        <main className="shell flex min-h-svh flex-col items-start justify-end gap-8 pb-[clamp(4rem,10vw,8rem)]">
          <h1 className="t-display">This page didn’t load</h1>
          <button onClick={retry} className="t-nav inline-flex h-12 items-center justify-center bg-ink px-7 text-paper transition-colors duration-300 hover:bg-ink/85">
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
