import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canOpen, homeOf, readSession, safeNext } from "@/lib/supabase/session";

/*
 * Guards the admin (/admin, team only) and the vendor portal (/account, vendors and the team), and
 * keeps the Supabase session fresh. Signed-out visitors go to /login; signed-in ones who open
 * /login go straight to their portal.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet, headers) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Verifies the token (and refreshes it if it has expired) before anything is trusted.
  const { data } = await supabase.auth.getClaims();
  const session = readSession(data?.claims);
  const { pathname, searchParams } = request.nextUrl;

  const redirect = (path: string, params: Record<string, string> = {}) => {
    const url = new URL(path, request.url);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const to = NextResponse.redirect(url);
    // Carry any refreshed session cookies across the redirect.
    response.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
    return to;
  };

  if (pathname === "/login") {
    if (!session) return response;
    const next = safeNext(searchParams.get("next"));
    return redirect(next && canOpen(session, next) ? next : homeOf(session));
  }

  if (!session) return redirect("/login", { next: pathname });
  if (!canOpen(session, pathname)) return redirect(homeOf(session));
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/login"],
};
