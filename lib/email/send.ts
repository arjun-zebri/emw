import { createClient } from "@supabase/supabase-js";
import { languages, serviceLabels, states } from "@/data/taxonomy";
import type { Language, Service, StateCode } from "@/data/types";
import type { Database } from "@/lib/supabase/database.types";
import { imageUrl, variantPath } from "@/lib/supabase/storage";
import { EMAILS, emailAdmin, emailFrom, emailOrigin } from "./config";
import { applicationAdmin, applicationReceived, confirmEmail, listingLive, type Rendered } from "./templates";

/*
 * Sending, through Resend's REST API (no SDK). Server only: it reads the secret Supabase key and
 * the Resend key. Nothing here throws: an email that can't be sent is logged and skipped, so it
 * never breaks an application or an approval.
 */

const admin = () =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

async function deliver(to: string, email: Rendered, replyTo?: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email] RESEND_API_KEY isn't set, so "${email.subject}" to ${to} wasn't sent`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: emailFrom(), to: [to], subject: email.subject, html: email.html, text: email.text, ...(replyTo ? { reply_to: replyTo } : {}) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`[email] Resend refused "${email.subject}" to ${to}: ${res.status} ${await res.text()}`);
    return res.ok;
  } catch (e) {
    console.error(`[email] Couldn't send "${email.subject}" to ${to}:`, e);
    return false;
  }
}

async function load(vendorId: string) {
  const { data, error } = await admin()
    .from("vendors")
    .select("*, vendor_photos(path, position, width, height), vendor_review_notes(notes)")
    .eq("id", vendorId)
    .maybeSingle();
  if (error || !data) {
    console.error(`[email] Couldn't load vendor ${vendorId}: ${error?.message ?? "not found"}`);
    return null;
  }
  const photos = [...data.vendor_photos].sort((a, b) => a.position - b.position).map((p) => ({ src: imageUrl("vendor-photos", variantPath(p.path, 1200)), width: p.width, height: p.height }));
  const tongue = (l: string) => (l in languages ? (l === "English" ? "English" : `${languages[l as Language].native} (${l})`) : l);
  const area = data.service_area.filter((s): s is StateCode => s in states);
  return {
    vendor: data,
    photos,
    first: (data.person ?? "").trim().split(/\s+/)[0] ?? "",
    services: data.services.map((s) => serviceLabels[s as Service] ?? s),
    languages: data.languages.map(tongue),
    travels: area.length >= 8 ? "Anywhere in Australia" : area.map((s) => states[s]).join(", ") || "Not given",
    notes: (data.vendor_review_notes?.notes ?? "").split("\n").map((l) => l.trim()).filter(Boolean),
  };
}

/** When someone applies: the team hears about it, and the applicant gets a thank you. */
export async function sendApplicationEmails(vendorId: string): Promise<void> {
  if (!EMAILS.application) return;
  const d = await load(vendorId);
  if (!d) return;
  const { vendor: v } = d;
  const origin = emailOrigin();
  const applicant = v.email ?? undefined;

  await deliver(
    emailAdmin(),
    applicationAdmin({
      origin,
      business: v.name,
      person: v.person ?? "Someone",
      email: v.email ?? "",
      phone: v.phone ?? undefined,
      discipline: v.discipline,
      services: d.services,
      languages: d.languages,
      based: v.based ?? undefined,
      travels: d.travels,
      website: v.website ?? undefined,
      instagram: v.instagram ?? undefined,
      facebook: v.facebook ?? undefined,
      story: v.story,
      notes: d.notes,
      photos: d.photos,
      photoCount: d.photos.length,
    }),
    applicant,
  );

  if (applicant) {
    await deliver(applicant, applicationReceived({ origin, first: d.first, card: { name: v.name, line: v.discipline, photo: d.photos[0] } }), emailAdmin());
  }
}

/** When the team approves a listing. Does nothing while EMAILS.approved is off. */
export async function sendApprovedEmail(vendorId: string): Promise<void> {
  if (!EMAILS.approved) return;
  const d = await load(vendorId);
  if (!d?.vendor.email) return;
  const origin = emailOrigin();
  const url = `${origin}/vendors/${d.vendor.slug}`;
  await deliver(d.vendor.email, listingLive({ origin, first: d.first, url, card: { name: d.vendor.name, line: d.vendor.discipline, photo: d.photos[0] } }), emailAdmin());
}

/** The confirmation link for a new applicant account. Returns whether it went. */
export async function sendConfirmEmail(to: string, url: string): Promise<boolean> {
  if (!EMAILS.confirm) return false;
  // Locally, without a Resend key, the link goes to the terminal so the flow can still be tried.
  if (!process.env.RESEND_API_KEY && process.env.NODE_ENV === "development") {
    console.info(`[email] Confirmation link for ${to}: ${url}`);
    return true;
  }
  return deliver(to, confirmEmail({ origin: emailOrigin(), url }), emailAdmin());
}
