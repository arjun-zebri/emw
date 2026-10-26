/*
 * Simulated sign-in. The session is a cookie so proxy.ts can send signed-out visitors to /login
 * before a page renders; there is no password check. "owner" is the East Meets Wed team,
 * "vendor:<slug>" a listed business. Kept free of React so the proxy can import it.
 */

export const SESSION_COOKIE = "emw_session";
export type Session = { role: "owner" } | { role: "vendor"; slug: string };

export function parseSession(value: string | undefined | null): Session | null {
  if (value === "owner") return { role: "owner" };
  if (value?.startsWith("vendor:")) return { role: "vendor", slug: value.slice(7) };
  return null;
}
