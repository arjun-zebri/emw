/*
 * What an error report may carry, and how errors are grouped. Pure, so the browser, the server and
 * the scripts agree. Nothing personal leaves this: email addresses, phone numbers, ids and query
 * strings are replaced before a message is stored or emailed.
 */

export type Severity = "urgent" | "normal";

export type Area =
  | "page" // a page failed to render
  | "action" // a server action threw
  | "route" // an API route threw
  | "proxy" // the sign-in guard
  | "enquiry"
  | "email"
  | "apply"
  | "account"
  | "auth"
  | "throttle"
  | "analytics"
  | "browser"; // an uncaught error in someone's browser

export const AREAS: readonly Area[] = ["page", "action", "route", "proxy", "enquiry", "email", "apply", "account", "auth", "throttle", "analytics", "browser"];

/** A message with nothing personal in it. */
export function scrub(s: string, max = 300) {
  return s
    .replace(/(https?:\/\/[^\s?#"']*)[?#][^\s"']*/g, "$1")
    .replace(/[\w.%+-]+@[\w-]+(\.[\w-]+)*\.[a-z]{2,}/gi, "<email>")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<id>")
    .replace(/eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/g, "<token>")
    .replace(/\+?\d[\d ()-]{7,}\d/g, "<number>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** A stack trace, scrubbed line by line and cut to the frames worth reading. */
export function scrubStack(stack: string | undefined) {
  if (!stack) return null;
  return stack
    .split("\n")
    .slice(0, 16)
    .map((l) => scrub(l, 300))
    .join("\n");
}

/**
 * What decides that two errors are the same bug: where, what kind, and the message with the
 * changing parts (numbers, quoted values) taken out. Not the stack: production code is bundled
 * into chunks whose names change with every release, which would split one bug into many.
 */
export function signature(p: { env: string; source: string; area: string; name: string; message: string; route?: string | null }) {
  const message = p.message
    .toLowerCase()
    .replace(/"[^"]*"|'[^']*'|`[^`]*`/g, "<v>")
    .replace(/\d+/g, "#");
  return [p.env, p.source, p.area, p.name, message, p.route ?? ""].join("|");
}

/** /vendors/kim-photo to /vendors/[slug], so one broken page is one issue, not one per vendor. */
export function routeOf(path: string) {
  const p = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return p
    .replace(/^\/vendors\/[^/]+$/, "/vendors/[slug]")
    .replace(/^\/(blog|journal)\/[^/]+$/, "/$1/[slug]")
    .replace(/^\/admin\/vendors\/(?!new$)[^/]+$/, "/admin/vendors/[slug]")
    .replace(/^\/admin\/journal\/[^/]+$/, "/admin/journal/[id]")
    .slice(0, 120);
}

/** The route as Next names it ("/app/(site)/vendors/[slug]/page") to the address people see ("/vendors/[slug]"). */
export function routeFromFile(routePath: string) {
  const p = routePath
    .replace(/^\/?app(?=\/|$)/, "")
    .replace(/\/\([^)]+\)/g, "")
    .replace(/\/(page|route|layout)$/, "");
  return p || "/";
}

/** Pages couples and vendors reach without signing in. */
export const isPublic = (route: string) => !/^\/(admin|account)(\/|$)/.test(route) && !route.startsWith("/api/");

/** "Safari on a phone", from a user agent. Never the whole string. */
export function browserOf(ua: string) {
  const name = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\/|FxiOS/.test(ua)
        ? "Firefox"
        : /SamsungBrowser/.test(ua)
          ? "Samsung Internet"
          : /Chrome\/|CriOS/.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : "Other";
  const kind = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua) ? "a tablet" : /Mobi|iPhone|Android/i.test(ua) ? "a phone" : "a computer";
  return `${name} on ${kind}`;
}
