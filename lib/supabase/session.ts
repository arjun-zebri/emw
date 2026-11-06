/*
 * Who is signed in, read from the claims Supabase puts in the access token. The database adds
 * `emw_role` and `vendor_slug` when it issues the token (custom_access_token_hook in
 * supabase/migrations), so routing needs no extra query. Kept free of React and Next so the proxy,
 * the server and the browser can all use it.
 */

export type Session = { role: "team"; email: string } | { role: "vendor"; email: string; slug: string };

type Claims = { email?: unknown; emw_role?: unknown; vendor_slug?: unknown };

export function readSession(claims: Claims | null | undefined): Session | null {
  if (!claims) return null;
  const email = typeof claims.email === "string" ? claims.email : "";
  if (claims.emw_role === "team") return { role: "team", email };
  if (claims.emw_role === "vendor" && typeof claims.vendor_slug === "string") return { role: "vendor", email, slug: claims.vendor_slug };
  return null;
}

/** Where a signed-in person lands, and whether a requested page is theirs to open. */
export const homeOf = (session: Session) => (session.role === "team" ? "/admin/approvals" : "/account");

export function canOpen(session: Session, path: string) {
  if (path.startsWith("/admin")) return session.role === "team";
  // The team can open the vendor portal too, to see it as a vendor does.
  if (path.startsWith("/account")) return true;
  return false;
}

/** A `next` value from a URL, kept only if it is one of our own portal pages. */
export function safeNext(value: string | null | undefined) {
  return value && /^\/(admin|account)(\/|$)/.test(value) ? value : undefined;
}
