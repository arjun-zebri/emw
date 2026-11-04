import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase/browser";
import { readSession, type Session } from "@/lib/supabase/session";

export type { Session } from "@/lib/supabase/session";

/*
 * The signed-in person, for the portal's own UI (names, menus, which listing to show). Access is
 * enforced by the proxy and the database, so this reads the token locally without a network call.
 */

let current: Session | null = null;
let started = false;
const listeners = new Set<() => void>();

export function decodeToken(token: string | undefined) {
  try {
    const payload = token?.split(".")[1];
    return payload ? JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) : null;
  } catch {
    return null;
  }
}

function set(next: Session | null) {
  if (JSON.stringify(next) === JSON.stringify(current)) return;
  current = next;
  listeners.forEach((l) => l());
}

function start() {
  if (started) return;
  started = true;
  const auth = supabase().auth;
  auth.getSession().then(({ data }) => set(readSession(decodeToken(data.session?.access_token))));
  auth.onAuthStateChange((_event, session) => set(readSession(decodeToken(session?.access_token))));
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const useSession = () =>
  useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );

/** Ends the session and goes to /login with a full load, so no portal page stays alive in memory. */
export async function signOut() {
  await supabase().auth.signOut();
  set(null);
  // A full load on purpose: portal pages are kept alive with <Activity>, and none should survive sign-out.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  location.assign("/login");
}

/** The vendor the portal is showing: the signed-in vendor's own, or a demo listing when the team is looking. */
export const DEMO_VENDOR = "katrina-lai";
export function useVendorSlug() {
  const session = useSession();
  return session?.role === "vendor" ? session.slug : DEMO_VENDOR;
}
