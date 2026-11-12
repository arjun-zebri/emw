"use server";

import { createClient as createAdmin } from "@supabase/supabase-js";
import { isEmail } from "@/lib/apply/application";
import { emailOrigin } from "@/lib/email/config";
import { sendPasswordEmail } from "@/lib/email/send";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { allow, senderIp } from "@/lib/throttle";
import { homeOf, readSession } from "@/lib/supabase/session";

/*
 * Choosing a password without Supabase sending anything: we make a one-off recovery link with the
 * secret key and email it ourselves (lib/email). The same link serves someone who has forgotten
 * their password and a vendor signing in for the first time (the team gives them access with
 * scripts/give-access.mjs, with no password). The link opens /login/password, whose script uses
 * it, so mail scanners that open every link can't spend it first.
 */

const MIN_PASSWORD = 8;
const WAIT_SECONDS = 120;
/** Requests from one IP. */
const PER_HOUR = 10;

const admin = () =>
  createAdmin<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

/**
 * Email a link to choose a password. Always answers "sent", whether or not there's an account, so
 * it can't be used to find out who has one; and sends at most one link every two minutes per
 * account, so it can't be used to fill someone's inbox; and answers at most ten requests an hour
 * from one IP, so it can't be used to try addresses in bulk.
 */
export async function requestPasswordLink(input: { email: string }): Promise<{ status: "sent" | "invalid" }> {
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!isEmail(email)) return { status: "invalid" };
  if (!(await allow("password-link", [await senderIp()], PER_HOUR))) return { status: "sent" };
  const db = admin();

  // Few enough accounts to look through in one page; revisit past a thousand.
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    console.error(`[access] Couldn't look up accounts: ${error.message}`);
    return { status: "sent" };
  }
  const user = data.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) return { status: "sent" };

  const last = Number(user.app_metadata?.emw_password_link_at ?? 0);
  if (Date.now() - last < WAIT_SECONDS * 1000) return { status: "sent" };
  await db.auth.admin.updateUserById(user.id, { app_metadata: { ...user.app_metadata, emw_password_link_at: Date.now() } });

  const link = await db.auth.admin.generateLink({ type: "recovery", email });
  if (link.error || !link.data.properties?.hashed_token) {
    console.error(`[access] Couldn't make a password link: ${link.error?.message ?? "no token"}`);
    return { status: "sent" };
  }
  await sendPasswordEmail(email, `${emailOrigin()}/login/password?token=${encodeURIComponent(link.data.properties.hashed_token)}`);
  return { status: "sent" };
}

/** Opened from the email: uses the link, which signs them in on this browser so they can choose a password. */
export async function openPasswordLink(token: string): Promise<{ status: "ok" | "expired"; email?: string }> {
  if (typeof token !== "string" || !/^[\w-]{20,200}$/.test(token)) return { status: "expired" };
  const server = await createClient();
  const { data, error } = await server.auth.verifyOtp({ token_hash: token, type: "recovery" });
  return error ? { status: "expired" } : { status: "ok", email: data.user?.email };
}

/**
 * Set a new password for the person signed in: after opening the link, or from Your account.
 * Answers with where to go next: their portal, or the application if they have no listing yet.
 */
export async function choosePassword(input: { password: string }): Promise<{ status: "ok"; next: string } | { status: "invalid"; message: string } | { status: "signed-out" | "error" }> {
  const password = String(input.password ?? "");
  if (password.length < MIN_PASSWORD) return { status: "invalid", message: `Use at least ${MIN_PASSWORD} characters.` };
  if (password.length > 72) return { status: "invalid", message: "Keep it under 72 characters." };
  const server = await createClient();
  const { data: claims } = await server.auth.getClaims();
  if (!claims?.claims) return { status: "signed-out" };
  const { error } = await server.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { status: "invalid", message: "That’s your current password. Choose a new one." };
    if (error.code === "weak_password") return { status: "invalid", message: "Choose a stronger password: longer, or less common." };
    console.error(`[access] Couldn't set a password: ${error.message}`);
    return { status: "error" };
  }
  const session = readSession(claims.claims);
  return { status: "ok", next: session ? homeOf(session) : "/list-your-business/apply" };
}
