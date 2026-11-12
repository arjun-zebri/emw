"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/*
 * Remembers, for this tab only, the last few pages of the site a couple visited and the site that
 * sent them here (sessionStorage, no cookie). Nothing leaves the browser until they send an
 * enquiry, when it says how they found the vendor (lib/enquiries-actions.ts works out which).
 */

const KEY = "emw-trail";

export type Trail = { referrer: string; landing: string; pages: string[] };

export function readTrail(): Trail | null {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "null");
  } catch {
    return null;
  }
}

export function Trail() {
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    const url = `${pathname}${params.size ? `?${params}` : ""}`;
    try {
      const t: Trail = readTrail() ?? { referrer: document.referrer, landing: url, pages: [] };
      // The directory rewrites its address as filters change: keep only the latest per page.
      if (t.pages.at(-1)?.split("?")[0] === pathname) t.pages[t.pages.length - 1] = url;
      else t.pages.push(url);
      t.pages = t.pages.slice(-6);
      sessionStorage.setItem(KEY, JSON.stringify(t));
    } catch {
      // Storage blocked (private browsing): the enquiry goes without it.
    }
  }, [pathname, params]);

  return null;
}
