"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/*
 * The site's own visitor counter: one small message to our server (app/api/v) for each page a
 * couple sees, sent once the page is showing and the browser is idle, without waiting for an
 * answer. No cookies, nothing stored in the browser. Automated browsers aren't counted, and a page
 * opened in a background tab counts only when it's looked at.
 */

const ENDPOINT = "/api/v";

function send(body: Record<string, unknown>) {
  try {
    const data = JSON.stringify(body);
    if (navigator.sendBeacon?.(ENDPOINT, data)) return;
    void fetch(ENDPOINT, { method: "POST", body: data, keepalive: true, credentials: "same-origin" }).catch(() => {});
  } catch {
    // Never trouble the page.
  }
}

const idle = (fn: () => void) => (typeof requestIdleCallback === "function" ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 200));

const automated = () => {
  try {
    return navigator.webdriver === true;
  } catch {
    return false;
  }
};

const searched = new Set<string>();

/** A directory search, once the couple stops typing: the words and how many listings match them. Each search once per page load. */
export function countSearch(query: string, matches: number) {
  const q = query.replace(/\s+/g, " ").trim().toLowerCase();
  if (q.length < 2 || searched.has(q) || automated()) return;
  searched.add(q);
  idle(() => send({ t: "search", q, n: matches }));
}

export function Analytics() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);
  const landing = useRef(true);

  useEffect(() => {
    if (last.current === pathname || automated()) return;
    last.current = pathname;
    // Where they came from and the campaign tag belong to the page they landed on only.
    const first = landing.current;
    landing.current = false;
    const body = {
      t: "view",
      p: pathname,
      r: first ? document.referrer : "",
      c: first ? (new URLSearchParams(location.search).get("utm_source") ?? "") : "",
    };
    if (document.visibilityState === "visible") return void idle(() => send(body));
    const onShow = () => {
      if (document.visibilityState !== "visible") return;
      document.removeEventListener("visibilitychange", onShow);
      idle(() => send(body));
    };
    document.addEventListener("visibilitychange", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onShow);
      // Not shown before the page changed: let a remount count it when it is.
      if (last.current === pathname) last.current = null;
      if (first) landing.current = true;
    };
  }, [pathname]);

  return null;
}
