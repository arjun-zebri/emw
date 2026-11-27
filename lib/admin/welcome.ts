"use server";

import { createHash, randomBytes } from "node:crypto";
import { createClient as createAdmin, type User } from "@supabase/supabase-js";
import { isEmail } from "@/lib/apply/application";
import { emailOrigin } from "@/lib/email/config";
import { load, sendWelcomeEmail } from "@/lib/email/send";
import { reportSoon } from "@/lib/observe/report";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { readSession } from "@/lib/supabase/session";
import { allow, senderIp } from "@/lib/throttle";

/*
 * The welcome email the team sends from Admin → Vendors: it gives the listing's email an account
 * (as scripts/give-access.mjs does: confirmed, no password, linked to the listing) and a way in.
 *
 * The way in is our own link, not a Supabase one, because those last an hour and a welcome may sit
 * in an inbox for days. It holds a random code whose hash is kept on the account
 * (app_metadata.emw_welcome) for WELCOME_DAYS. Opening it (/login/password?welcome=…, used by the
 * page's script so mail scanners can't spend it) makes a one-off Supabase sign-in on the server,
 * then asks for a password and goes on to the listing. It works once.
 */

const WELCOME_DAYS = 14;

const admin = () =>
  createAdmin<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const digest = (code: string) => createHash("sha256").update(code).digest("hex");

type Welcome = { hash?: string; until?: number; sentAt?: number };
const welcomeOf = (u: User | undefined): Welcome => (u?.app_metadata?.emw_welcome as Welcome | undefined) ?? {};

async function isTeam() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return readSession(data?.claims)?.role === "team";
}

async function accounts() {
  // Few enough accounts to look through in one page; revisit past a thousand.
  const { data, error } = await admin().auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users;
}

export type WelcomeTarget = { id: string; email: string | null; sentAt: number | null; why?: string };

/** For the sheet before sending: each listing's email, and when a welcome last went to it. */
export async function welcomeStatus(ids: string[]): Promise<WelcomeTarget[]> {
  if (!(await isTeam())) return [];
  const db = admin();
  const [{ data: vendors }, users, { data: team }] = await Promise.all([
    db.from("vendors").select("id, email").in("id", ids),
    accounts(),
    db.from("team_members").select("user_id"),
  ]);
  const staff = new Set(team?.map((t) => t.user_id));
  return ids.map((id) => {
    const email = vendors?.find((v) => v.id === id)?.email?.trim().toLowerCase() || null;
    const user = email ? users.find((u) => u.email?.toLowerCase() === email) : undefined;
    const why = !email ? "No email on the listing" : !isEmail(email) ? "The listing's email isn't valid" : user && staff.has(user.id) ? "That email is on the team" : undefined;
    return { id, email, sentAt: welcomeOf(user).sentAt ?? null, why };
  });
}

/**
 * Sends the welcome to each listing's email, one at a time. Team only. Skips a listing with no
 * email, a team member's email, and an account already looking after another listing (which
 * would be moved otherwise; do that on purpose with scripts/give-access.mjs).
 */
export async function sendWelcome(ids: string[]): Promise<{ sent: string[]; skipped: { id: string; why: string }[] }> {
  const sent: string[] = [];
  const skipped: { id: string; why: string }[] = [];
  if (!Array.isArray(ids) || !(await isTeam())) return { sent, skipped };
  const db = admin();
  const users = await accounts();
  const { data: team } = await db.from("team_members").select("user_id");
  const staff = new Set(team?.map((t) => t.user_id));

  for (const id of ids.slice(0, 200)) {
    try {
      const d = await load(id);
      const email = d?.vendor.email?.trim().toLowerCase();
      if (!d || !email || !isEmail(email)) {
        skipped.push({ id, why: "No email on the listing" });
        continue;
      }

      let user = users.find((u) => u.email?.toLowerCase() === email);
      if (user && staff.has(user.id)) {
        skipped.push({ id, why: "That email is on the team" });
        continue;
      }
      if (!user) {
        // An unguessable password nobody knows: they choose their own on the way in.
        const made = await db.auth.admin.createUser({ email, password: randomBytes(32).toString("base64url"), email_confirm: true, app_metadata: { emw_via: "team" } });
        if (made.error) throw made.error;
        user = made.data.user;
        users.push(user);
      }

      const { data: links, error: linkError } = await db.from("vendor_members").select("vendor_id").eq("user_id", user.id);
      if (linkError) throw linkError;
      if (links.some((l) => l.vendor_id !== id)) {
        skipped.push({ id, why: "That email already looks after another listing" });
        continue;
      }
      if (!links.length) {
        const linked = await db.from("vendor_members").insert({ vendor_id: id, user_id: user.id });
        if (linked.error) throw linked.error;
      }

      const code = randomBytes(32).toString("base64url");
      const welcome: Welcome = { hash: digest(code), until: Date.now() + WELCOME_DAYS * 86_400_000, sentAt: Date.now() };
      const marked = await db.auth.admin.updateUserById(user.id, { app_metadata: { ...user.app_metadata, emw_welcome: welcome } });
      if (marked.error) throw marked.error;
      user.app_metadata = { ...user.app_metadata, emw_welcome: welcome };

      const went = await sendWelcomeEmail(email, {
        first: d.first,
        name: d.vendor.name,
        line: d.vendor.discipline,
        photos: d.photos,
        url: `${emailOrigin()}/login/password?welcome=${encodeURIComponent(code)}`,
        days: WELCOME_DAYS,
      });
      if (went) sent.push(id);
      else skipped.push({ id, why: "The email didn't go" });
    } catch (e) {
      reportSoon(e, { area: "email", severity: "urgent", route: "/admin/vendors", context: { step: "sending a welcome", vendor: id } });
      skipped.push({ id, why: "Something went wrong" });
    }
  }
  return { sent, skipped };
}

/** Opened from the welcome email: signs them in on this browser so they can choose a password. Works once. */
export async function openWelcomeLink(code: string): Promise<{ status: "ok" | "expired"; email?: string }> {
  if (typeof code !== "string" || !/^[\w-]{20,200}$/.test(code)) return { status: "expired" };
  if (!(await allow("password-link", [{ key: await senderIp(), perHour: 30 }]))) return { status: "expired" };
  try {
    const hash = digest(code);
    const user = (await accounts()).find((u) => welcomeOf(u).hash === hash);
    const w = welcomeOf(user);
    if (!user?.email || !w.until || w.until < Date.now()) return { status: "expired" };

    const db = admin();
    const link = await db.auth.admin.generateLink({ type: "recovery", email: user.email });
    const token = link.data.properties?.hashed_token;
    if (link.error || !token) throw link.error ?? new Error("No recovery token came back");
    const server = await createClient();
    const { error } = await server.auth.verifyOtp({ token_hash: token, type: "recovery" });
    if (error) throw error;

    // Spent: keep when it was sent, for Admin, and drop the code.
    const spent = await db.auth.admin.updateUserById(user.id, { app_metadata: { ...user.app_metadata, emw_welcome: { sentAt: w.sentAt } } });
    if (spent.error) reportSoon(spent.error, { area: "account", route: "/login/password", context: { step: "spending a welcome link" } });
    return { status: "ok", email: user.email };
  } catch (e) {
    reportSoon(e, { area: "account", severity: "urgent", route: "/login/password", context: { step: "opening a welcome link" } });
    return { status: "expired" };
  }
}
