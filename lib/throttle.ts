import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { after } from "next/server";
import { reportSoon } from "./observe/report";
import type { Database } from "./supabase/database.types";

/*
 * Caps on the public forms, so no one can flood them: each attempt is a row in form_attempts, keyed
 * by a hash of who made it or who it's aimed at (the sender's IP, the address an email goes to, the
 * vendor an enquiry is for; never stored as is). Rows are kept a day.
 * Server only: it uses the secret key. Not a "use server" file, so the browser can't call it.
 */

export type Kind = "enquiry" | "account" | "confirm-email" | "password-link" | "client-error";
export type Cap = { key: string; perHour: number; perDay?: number };

const db = () =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const hash = (key: string) => createHash("sha256").update(`${process.env.SUPABASE_SECRET_KEY}:${key}`).digest("hex");
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

/** The sender's IP. Vercel sets these headers itself, so a sender can't choose their own. */
export async function senderIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Counts this attempt against each cap and says whether it's within all of them. The attempt is
 * recorded before counting, so a burst sent all at once can't slip through together: of any
 * number arriving at the same moment, at most the cap get a yes. Refused attempts count too, so
 * a flood stays refused until it stops. If the throttle can't be reached the attempt goes ahead:
 * a real person is never turned away because it's down.
 */
export async function allow(kind: Kind, caps: Cap[]): Promise<boolean> {
  const supabase = db();
  const keyed = caps.map((c) => ({ ...c, hash: hash(c.key) }));
  const { error } = await supabase.from("form_attempts").insert(keyed.map((c) => ({ kind, key_hash: c.hash })));
  after(async () => {
    await supabase.from("form_attempts").delete().lt("created_at", ago(86_400_000));
  });
  if (error) {
    // Not for the error reports' own cap, which would report itself in a loop.
    if (kind !== "client-error") reportSoon(error, { area: "throttle", context: { kind } });
    return true;
  }
  const count = (h: string, ms: number) =>
    supabase.from("form_attempts").select("key_hash", { count: "exact", head: true }).eq("kind", kind).eq("key_hash", h).gte("created_at", ago(ms)).then((r) => r.count ?? 0);
  const over = await Promise.all(
    keyed.flatMap((c) => [count(c.hash, 3_600_000).then((n) => n > c.perHour), ...(c.perDay ? [count(c.hash, 86_400_000).then((n) => n > c.perDay!)] : [])]),
  );
  return !over.some(Boolean);
}
