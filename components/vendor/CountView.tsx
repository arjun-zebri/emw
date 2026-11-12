"use client";

import { useEffect } from "react";
import { recordView } from "@/lib/views-actions";

/** Counts this vendor page once per browser session towards the vendor's profile stats. Renders nothing. */
export function CountView({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `emw:viewed:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage blocked: count it anyway.
    }
    void recordView(slug).catch(() => {});
  }, [slug]);
  return null;
}
