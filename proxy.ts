import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, parseSession } from "@/lib/admin/auth";

/** Simulated auth: the admin needs the team session, the vendor portal a vendor one. Anyone else goes to /login. */
export function proxy(request: NextRequest) {
  const session = parseSession(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;
  const needs = pathname.startsWith("/admin") ? "owner" : "vendor";
  // The team can also open the vendor portal, to see it as a vendor does.
  if (session?.role === needs || (session?.role === "owner" && needs === "vendor")) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("as", needs);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
