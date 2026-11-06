import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/*
 * Where Google and Microsoft send people back after they sign in: the one-off code becomes a
 * session (in cookies), then they carry on. Only our own apply flow is a place to carry on to.
 */
const ALLOWED = /^\/list-your-business\/apply(\?|$)/;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "";
  const back = ALLOWED.test(next) ? next : "/list-your-business/apply";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(back, request.url));
    console.error(`[account] Couldn't finish signing in: ${error.message}`);
  }
  return NextResponse.redirect(new URL("/list-your-business/apply?signin=failed", request.url));
}
