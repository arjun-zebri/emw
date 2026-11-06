"use server";

import { createClient as createAdmin } from "@supabase/supabase-js";
import { emailOrigin } from "@/lib/email/config";
import { sendConfirmEmail } from "@/lib/email/send";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { isEmail } from "./application";

/*
 * Accounts for vendors who apply. Email and password accounts are made here, on the server, and
 * start unconfirmed: Supabase sends nothing, and we email our own link (lib/email). Until it's
 * opened the account can't sign in, so no one can hold an address that isn't theirs (and Supabase
 * never links a Google or Microsoft sign-in to an unconfirmed account). Google and Microsoft
 * sign-in happen in the browser and come back through /auth/callback.
 *
 * The link opens /list-your-business/confirm, a page whose script does the confirming. Mail
 * scanners that open every link don't run scripts, so they can't use it up first.
 */

export type AccountResult =
  | { status: "sent" | "signed-in" }
  | { status: "invalid"; message: string }
  | { status: "exists" | "wrong" | "error" };

const MIN_PASSWORD = 8;

const admin = () =>
  createAdmin<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

function check(email: string, password: string): AccountResult | null {
  if (!isEmail(email)) return { status: "invalid", message: "Check your email address." };
  if (typeof password !== "string" || password.length < MIN_PASSWORD) return { status: "invalid", message: `Use at least ${MIN_PASSWORD} characters for your password.` };
  if (password.length > 72) return { status: "invalid", message: "Keep your password under 72 characters." };
  return null;
}

/** A fresh confirmation link, emailed. Only for an account that exists and isn't confirmed yet. */
async function sendLink(email: string, password: string) {
  const { data, error } = await admin().auth.admin.generateLink({ type: "signup", email, password });
  if (error || !data.properties?.hashed_token) {
    console.error(`[account] Couldn't make a confirmation link: ${error?.message ?? "no token"}`);
    return false;
  }
  return sendConfirmEmail(email, `${emailOrigin()}/list-your-business/confirm?token=${encodeURIComponent(data.properties.hashed_token)}`);
}

/**
 * Sign in if the password is right, or send the link again if the account is still waiting for
 * it. Answering only to the right password means this can't be used to find out who has an
 * account, or to fill someone's inbox.
 */
async function signInOrResend(email: string, password: string): Promise<AccountResult> {
  const server = await createClient();
  const { error } = await server.auth.signInWithPassword({ email, password });
  if (!error) return { status: "signed-in" };
  if (error.code === "email_not_confirmed") return (await sendLink(email, password)) ? { status: "sent" } : { status: "error" };
  return { status: "wrong" };
}

export async function createAccount(input: { email: string; password: string }): Promise<AccountResult> {
  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");
  const bad = check(email, password);
  if (bad) return bad;

  const made = await admin().auth.admin.createUser({ email, password, email_confirm: false, app_metadata: { emw_via: "apply" } });
  if (made.error) {
    if (made.error.code !== "email_exists") {
      console.error(`[account] Couldn't create an account: ${made.error.message}`);
      return { status: "error" };
    }
    // They've been here before: let the same password in, or tell them to sign in.
    const again = await signInOrResend(email, password);
    return again.status === "wrong" ? { status: "exists" } : again;
  }
  return (await sendLink(email, password)) ? { status: "sent" } : { status: "error" };
}

/** Password sign-in from the apply flow. Sends the link again if it hasn't been confirmed yet. */
export async function signInToApply(input: { email: string; password: string }): Promise<AccountResult> {
  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");
  if (!isEmail(email) || !password) return { status: "invalid", message: "Enter your email and password." };
  return signInOrResend(email, password);
}

/** Opened from the email: confirms the address and signs them in on this browser. */
export async function confirmAccount(token: string): Promise<{ status: "ok" | "expired" }> {
  if (typeof token !== "string" || !/^[\w-]{20,200}$/.test(token)) return { status: "expired" };
  const server = await createClient();
  const { error } = await server.auth.verifyOtp({ token_hash: token, type: "signup" });
  return { status: error ? "expired" : "ok" };
}

export async function signOutOfApply(): Promise<void> {
  const server = await createClient();
  await server.auth.signOut();
}
