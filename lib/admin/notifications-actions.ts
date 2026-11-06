"use server";

import { isSwitch } from "@/lib/email/switches";
import { createClient } from "@/lib/supabase/server";
import { readSession } from "@/lib/supabase/session";

/**
 * Switch an email on or off for the whole team. Owners only: row level security refuses anyone
 * else, so an update that changes no row means it wasn't allowed.
 */
export async function setEmailSwitch(id: string, enabled: boolean): Promise<{ ok: boolean; at?: string }> {
  if (!isSwitch(id) || typeof enabled !== "boolean") return { ok: false };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (readSession(auth?.claims)?.role !== "team" || !auth?.claims.sub) return { ok: false };
  const { data, error } = await supabase
    .from("email_switches")
    .update({ enabled, updated_by: auth.claims.sub })
    .eq("id", id)
    .select("updated_at");
  if (error || !data?.length) return { ok: false };
  return { ok: true, at: data[0].updated_at };
}
