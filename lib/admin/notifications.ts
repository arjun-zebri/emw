import { emailPreviews, type EmailPreview } from "@/lib/email/previews";
import { SWITCHES, type SwitchId } from "@/lib/email/switches";
import { createClient } from "@/lib/supabase/server";
import { readSession } from "@/lib/supabase/session";

/*
 * What Admin → Notifications shows: every email with its real preview, whether it's switched on,
 * and who last changed it. Server only. Read as the signed-in team member, so row level security
 * decides what they see; only owners can change a switch (lib/admin/notifications-actions.ts).
 */

export type Switch = { enabled: boolean; changed?: { by: string; at: string } };
export type NotificationsData = { emails: EmailPreview[]; switches: Partial<Record<SwitchId, Switch>>; canEdit: boolean };

export async function loadNotifications(): Promise<NotificationsData | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (readSession(auth?.claims)?.role !== "team") return null;

  const [emails, { data: rows }, { data: team }] = await Promise.all([
    emailPreviews(),
    supabase.from("email_switches").select("id, enabled, updated_at, updated_by"),
    supabase.from("team_members").select("user_id, name, role"),
  ]);
  const names = new Map((team ?? []).map((m) => [m.user_id, m.name]));
  const switches: NotificationsData["switches"] = {};
  for (const r of rows ?? []) {
    if (!(SWITCHES as readonly string[]).includes(r.id)) continue;
    const by = r.updated_by ? names.get(r.updated_by) : undefined;
    switches[r.id as SwitchId] = { enabled: r.enabled, changed: r.updated_by ? { by: by ?? "Someone on the team", at: r.updated_at } : undefined };
  }
  const me = team?.find((m) => m.user_id === auth?.claims.sub);
  return { emails, switches, canEdit: me?.role === "owner" };
}
