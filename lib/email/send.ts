import { createClient } from "@supabase/supabase-js";
import { areaLabel, languages, serviceLabels } from "@/data/taxonomy";
import type { Language, Service } from "@/data/types";
import type { Database } from "@/lib/supabase/database.types";
import { imageUrl, variantPath } from "@/lib/supabase/storage";
import { EMAILS, emailAdmin, emailFrom, emailOrigin } from "./config";
import { guestsLabel, regionLabel, weddingLabel } from "@/lib/enquiry-fields";
import { emailOn } from "./switches";
import { applicationAdmin, applicationReceived, confirmEmail, enquiry, listingLive, passwordEmail, type Rendered } from "./templates";

/*
 * Sending, through Resend's REST API (no SDK). Server only: it reads the secret Supabase key and
 * the Resend key. Nothing here throws: an email that can't be sent is logged and skipped, so it
 * never breaks an application or an approval.
 */

const admin = () =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

/**
 * Test mode, for staging before eastmeetswed.com is verified in Resend: EMAIL_TEST_INBOX sends
 * every email to that one address instead, with the real recipient at the front of the subject.
 * Pair it with EMAIL_FROM="East Meets Wed <onboarding@resend.dev>", which Resend only delivers to
 * the account's own address. Never on the live site.
 */
function testInbox() {
  const inbox = process.env.EMAIL_TEST_INBOX?.trim();
  return inbox && process.env.VERCEL_ENV !== "production" ? inbox : null;
}

async function deliver(to: string, email: Rendered, replyTo?: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email] RESEND_API_KEY isn't set, so "${email.subject}" to ${to} wasn't sent`);
    return false;
  }
  const inbox = testInbox();
  const subject = inbox ? `[To ${to}] ${email.subject}` : email.subject;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: emailFrom(), to: [inbox ?? to], subject, html: email.html, text: email.text, ...(replyTo ? { reply_to: replyTo } : {}) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`[email] Resend refused "${email.subject}" to ${to}: ${res.status} ${await res.text()}`);
    return res.ok;
  } catch (e) {
    console.error(`[email] Couldn't send "${email.subject}" to ${to}:`, e);
    return false;
  }
}

/** A vendor as the emails show it. Also used by the previews in Admin → Notifications. */
export async function load(vendorId: string) {
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
  return {
    vendor: data,
    photos,
    first: (data.person ?? "").trim().split(/\s+/)[0] ?? "",
    services: data.services.map((s) => serviceLabels[s as Service] ?? s),
    languages: data.languages.map(tongue),
    travels: areaLabel(data.service_area, "Not given").replace("Australia-wide", "Anywhere in Australia"),
    notes: (data.vendor_review_notes?.notes ?? "").split("\n").map((l) => l.trim()).filter(Boolean),
  };
}

/**
 * When someone applies: the team hears about it, and the applicant gets a thank you. Each can be
 * switched off in Admin → Notifications.
 */
export async function sendApplicationEmails(vendorId: string): Promise<void> {
  const [toTeam, toApplicant] = await Promise.all([emailOn("application-team"), emailOn("application-received")]);
  if (!toTeam && !toApplicant) return;
  const d = await load(vendorId);
  if (!d) return;
  const { vendor: v } = d;
  const origin = emailOrigin();
  const applicant = v.email ?? undefined;

  if (toTeam) {
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
  }

  if (toApplicant && applicant) {
    await deliver(applicant, applicationReceived({ origin, first: d.first, card: { name: v.name, line: v.discipline, photo: d.photos[0] } }), emailAdmin());
  }
}

/** When the team approves a listing. Switched on and off in Admin → Notifications. */
export async function sendApprovedEmail(vendorId: string): Promise<void> {
  if (!(await emailOn("listing-live"))) return;
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

/** A link to choose a password (forgotten, or a vendor's first sign-in). Always sent. Returns whether it went. */
export async function sendPasswordEmail(to: string, url: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY && process.env.NODE_ENV === "development") {
    console.info(`[email] Password link for ${to}: ${url}`);
    return true;
  }
  return deliver(to, passwordEmail({ origin: emailOrigin(), url }), emailAdmin());
}

/**
 * A couple's enquiry, to the listing's email with the couple as reply-to. A listing with no email
 * sends it to the team instead, to pass on. Returns where it went, or null if it didn't.
 */
export async function sendEnquiryEmail(
  vendor: { id: string; name: string; slug: string; email: string | null },
  e: { name: string; email: string; wedding_date: string | null; region: string | null; venue: string | null; cultures: string[]; traditions: string | null; guests: string | null; languages: string | null; message: string },
): Promise<string | null> {
  if (!(await emailOn("enquiry-vendor"))) return null;
  const to = vendor.email?.trim() || emailAdmin();
  const { count } = await admin().from("vendor_members").select("user_id", { count: "exact", head: true }).eq("vendor_id", vendor.id);
  const sent = await deliver(
    to,
    enquiry({
      origin: emailOrigin(),
      business: vendor.name,
      slug: vendor.slug,
      name: e.name,
      email: e.email,
      ...enquiryLines(e),
      message: e.message,
      hasAccount: !!count,
      toTeam: !vendor.email?.trim(),
    }),
    e.email,
  );
  return sent ? to : null;
}

/** The structured answers as the email shows them. */
export function enquiryLines(e: { wedding_date: string | null; region: string | null; venue: string | null; cultures: string[]; traditions: string | null; guests: string | null; languages?: string | null }) {
  return {
    weddingDate: weddingLabel(e.wedding_date),
    // The venue now carries its own address; the region alone is for older enquiries without one.
    venue: e.venue || regionLabel(e.region),
    traditions: [e.cultures.join(", "), e.traditions].filter(Boolean).join(". ") || undefined,
    guests: guestsLabel(e.guests),
    languages: e.languages ?? undefined,
  };
}
