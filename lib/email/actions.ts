"use server";

import { createClient } from "@/lib/supabase/server";
import { readSession } from "@/lib/supabase/session";
import { sendApprovedEmail } from "./send";

/**
 * Tell a vendor their listing is live, after the team approves it in Admin → Approvals. Team only,
 * and only for a listing that really is published. Does nothing while EMAILS.approved is off
 * (lib/email/config.ts).
 */
export async function notifyApproved(vendorId: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (readSession(data?.claims)?.role !== "team") return;
  const { data: vendor } = await supabase.from("vendors").select("status").eq("id", vendorId).maybeSingle();
  if (vendor?.status !== "published") return;
  await sendApprovedEmail(vendorId);
}
