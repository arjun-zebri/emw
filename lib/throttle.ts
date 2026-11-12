import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { after } from "next/server";
import type { Database } from "./supabase/database.types";

/*
 * Caps on the public forms, so no one can flood them: each attempt is a row in form_attempts, keyed
 * by a hash of who made it (the sender's IP, or the address an email goes to; never stored as is).
 * Server only: it uses the secret key. Not a "use server" file, so the browser can't call it.
 */

export type Kind = "enquiry" | "account" | "confirm-email" | "password-link";

const db = () =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const hash = (key: string) => createHash("sha256").update(`${process.env.SUPABASE_SECRET_KEY}:${key}`).digest("hex");

/** The sender's IP. Vercel sets these headers itself, so a sender can't choose their own. */
export async function senderIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * True, and the attempt counted, if every key is under `perHour` attempts of this kind in the last
 * hour. False, and nothing counted, if any key has reached it. If the count can't be read the
 * attempt goes ahead: a real person is never turned away because the throttle is down.
 */
export async function allow(kind: Kind, keys: string[], perHour: number): Promise<boolean> {
  const supabase = db();
  const hashes = [...new Set(keys)].map(hash);
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const counts = await Promise.all(
    hashes.map((h) => supabase.from("form_attempts").select("key_hash", { count: "exact", head: true }).eq("kind", kind).eq("key_hash", h).gte("created_at", hourAgo)),
  );
  if (counts.some((c) => (c.count ?? 0) >= perHour)) return false;
  const { error } = await supabase.from("form_attempts").insert(hashes.map((key_hash) => ({ kind, key_hash })));
  if (error) console.error(`[throttle] Couldn't count a ${kind} attempt: ${error.message}`);
  after(async () => {
    await supabase.from("form_attempts").delete().lt("created_at", new Date(Date.now() - 86_400_000).toISOString());
  });
  return true;
}
