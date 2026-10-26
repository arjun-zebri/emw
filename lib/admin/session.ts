import { useSyncExternalStore } from "react";
import { SESSION_COOKIE, parseSession, type Session } from "./auth";

export { type Session } from "./auth";

const listeners = new Set<() => void>();

export function signIn(session: Session) {
  const value = session.role === "owner" ? "owner" : `vendor:${session.slug}`;
  document.cookie = `${SESSION_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  listeners.forEach((l) => l());
}

export function signOut() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
  listeners.forEach((l) => l());
}

const read = () => document.cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`))?.[1] ?? "";

export function useSession(): Session | null {
  const raw = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => "",
  );
  return parseSession(raw);
}

/** The vendor the portal is showing: the signed-in vendor, or a demo vendor when the team is looking. */
export const DEMO_VENDOR = "katrina-lai";
export function useVendorSlug() {
  const session = useSession();
  return session?.role === "vendor" ? session.slug : DEMO_VENDOR;
}
