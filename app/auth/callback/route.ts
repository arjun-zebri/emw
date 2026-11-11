import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canOpen, homeOf, readSession, safeNext } from "@/lib/supabase/session";

/*
 * Where Google and Microsoft send people back after they sign in: the one-off code becomes a
 * session (in cookies), then they carry on. Two places to carry on to:
 *   - the apply flow, for applicants;
 *   - the portals, from /login: `next` is a portal page, or "/portal" for wherever this person's
 *     home is. An account with no role (not on the team, not linked to a listing) is signed out
 *     again and told so, rather than left signed in with nowhere to go.
 */
const APPLY = /^\/list-your-business\/apply(\?|$)/;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "";
  const portal = next === "/portal" || !!safeNext(next);
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (!portal) return to(APPLY.test(next) ? next : "/list-your-business/apply");
      const { data } = await supabase.auth.getClaims();
      const session = readSession(data?.claims);
      if (!session) {
        await supabase.auth.signOut();
        return to("/login?access=none");
      }
      const wanted = safeNext(next);
      return to(wanted && canOpen(session, wanted) ? wanted : homeOf(session));
    }
    console.error(`[account] Couldn't finish signing in: ${error.message}`);
  }
  return to(portal ? "/login?access=failed" : "/list-your-business/apply?signin=failed");
}
