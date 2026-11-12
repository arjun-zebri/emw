import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { emailAdmin, emailFrom, emailOrigin } from "./config";
import { load } from "./send";
import type { SwitchId } from "./switches";
import { applicationAdmin, applicationReceived, confirmEmail, enquiry, listingLive, passwordEmail } from "./templates";

/*
 * Every email the platform sends, rendered exactly as it lands in an inbox, for Admin →
 * Notifications. Server only. Built with a real published vendor (Katrina Lai when she's there),
 * so nothing in a preview is invented.
 */

export type EmailPreview = {
  id: SwitchId | "confirm" | "password";
  audience: "team" | "vendor";
  title: string;
  when: string;
  from: string;
  to: string;
  subject: string;
  html: string;
};

export async function emailPreviews(): Promise<EmailPreview[]> {
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: demo } = await db.from("vendors").select("id").eq("slug", DEMO_VENDOR).eq("status", "published").maybeSingle();
  const { data: any } = demo ? { data: null } : await db.from("vendors").select("id").eq("status", "published").limit(1).maybeSingle();
  const vendorId = demo?.id ?? any?.id;
  const d = vendorId ? await load(vendorId) : null;
  if (!d) return [];

  const { vendor: v } = d;
  const origin = emailOrigin();
  const from = emailFrom();
  const applicant = v.email ?? "The applicant's email";
  const card = { name: v.name, line: v.discipline, photo: d.photos[0] };

  const team = applicationAdmin({
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
  });
  const received = applicationReceived({ origin, first: d.first, card });
  const live = listingLive({ origin, first: d.first, card, url: `${origin}/vendors/${v.slug}` });
  const confirm = confirmEmail({ origin, url: `${origin}/list-your-business/apply` });
  const password = passwordEmail({ origin, url: `${origin}/login` });
  // A made-up couple, clearly a sample: a preview never shows a real couple's enquiry.
  const asked = enquiry({
    origin,
    business: v.name,
    slug: v.slug,
    name: "Sample couple",
    email: "couple@example.com",
    weddingDate: "14 March 2027",
    venue: "The venue, or a suburb or city",
    traditions: "The couple's cultures and traditions",
    guests: "About 120",
    languages: "The languages they need",
    message: "The couple's message appears here, as they wrote it.",
    hasAccount: true,
  });

  return [
    { id: "application-team", audience: "team", title: "New application", when: "As soon as a business applies", from, to: emailAdmin(), ...pick(team) },
    { id: "confirm", audience: "vendor", title: "Confirm your email", when: "When someone makes an account to apply", from, to: applicant, ...pick(confirm) },
    { id: "application-received", audience: "vendor", title: "Application received", when: "As soon as they apply", from, to: applicant, ...pick(received) },
    { id: "listing-live", audience: "vendor", title: "Your listing is live", when: "When you approve their listing", from, to: applicant, ...pick(live) },
    { id: "enquiry-vendor", audience: "vendor", title: "New enquiry", when: "When a couple sends an enquiry from their listing. A listing with no email sends it to the team to pass on", from, to: v.email ?? "The listing's email", ...pick(asked) },
    { id: "password", audience: "vendor", title: "Choose your password", when: "When someone asks for a link to set or reset their password", from, to: "Their sign-in email", ...pick(password) },
  ];
}

/** The vendor the previews show, as in the portal (DEMO_VENDOR in lib/admin/session.ts). */
const DEMO_VENDOR = "katrina-lai";

const pick = (r: { subject: string; html: string }) => ({ subject: r.subject, html: r.html });
