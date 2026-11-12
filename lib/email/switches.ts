import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { EMAILS } from "./config";

/*
 * The emails the team can switch on and off in Admin → Notifications, one shared setting for the
 * whole team (table email_switches). Server only: it reads with the secret key, because the
 * person whose action sends the email (an applicant, say) can't read the table.
 */

export const SWITCHES = ["application-team", "application-received", "listing-live", "enquiry-vendor"] as const;
export type SwitchId = (typeof SWITCHES)[number];

export const isSwitch = (id: string): id is SwitchId => (SWITCHES as readonly string[]).includes(id);

/** Used when the table can't be read, or the row is missing. */
const fallback: Record<SwitchId, boolean> = {
  "application-team": EMAILS.application,
  "application-received": EMAILS.application,
  "listing-live": EMAILS.approved,
  "enquiry-vendor": EMAILS.enquiry,
};

export async function emailOn(id: SwitchId): Promise<boolean> {
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.from("email_switches").select("enabled").eq("id", id).maybeSingle();
  if (error) console.error(`[email] Couldn't read the switch for ${id}, using the default: ${error.message}`);
  return data?.enabled ?? fallback[id];
}
