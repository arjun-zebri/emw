import type { Area } from "./scrub";

/*
 * Reports an error from someone's browser to app/api/e, without waiting for an answer and without
 * ever troubling the page. Noise that isn't ours (browser extensions, cross-site scripts, aborted
 * requests, the chunk reload Next does after a deploy) is dropped here; each message is sent once
 * per page load, five at most.
 */

const ENDPOINT = "/api/e";
const MAX_PER_LOAD = 5;
const sent = new Set<string>();

const NOISE = [
  /^Script error\.?$/,
  /ResizeObserver loop/,
  /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed/,
  /^NEXT_(REDIRECT|NOT_FOUND|HTTP_ERROR)/,
  /The (user aborted a|operation was aborted)|signal is aborted/i,
  /^(Load failed|Failed to fetch|NetworkError when attempting to fetch resource\.)$/,
];
const FOREIGN = /(chrome|moz|safari(-web)?)-extension:\/\/|webkit-masked-url:/;

export function reportClient(error: unknown, area: Area = "browser", opts: { digest?: string } = {}) {
  try {
    if (navigator.webdriver) return;
    const e = error instanceof Error ? error : new Error(typeof error === "string" ? error : "A value that isn't an error was thrown");
    const message = (e.message || "(no message)").slice(0, 500);
    if (e.name === "AbortError" || NOISE.some((n) => n.test(message)) || FOREIGN.test(e.stack ?? "")) return;
    if (sent.size >= MAX_PER_LOAD || sent.has(message)) return;
    sent.add(message);
    const body = JSON.stringify({ n: e.name.slice(0, 60), m: message, s: (e.stack ?? "").slice(0, 2500), p: location.pathname.slice(0, 200), a: area, d: opts.digest?.slice(0, 100) });
    if (navigator.sendBeacon?.(ENDPOINT, body)) return;
    void fetch(ENDPOINT, { method: "POST", body, keepalive: true, credentials: "same-origin" }).catch(() => {});
  } catch {
    // Never trouble the page.
  }
}
