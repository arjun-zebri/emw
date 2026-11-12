"use server";

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { after } from "next/server";
import { cultureNames } from "@/data/taxonomy";
import { sendEnquiryEmail } from "./email/send";
import { classifySource, GUESTS, isGuestCount, isoDay, isRegion } from "./enquiry-fields";
import type { Database } from "./supabase/database.types";
import { report, reportSoon } from "./observe/report";
import { allow, senderIp } from "./throttle";

/*
 * A couple's enquiry from a vendor page: checked, saved, then emailed to the vendor once the couple
 * has their answer. Anyone can send one, so the server writes it with the secret key (there's no
 * insert policy) and refuses floods: a hidden field bots fill in, a form sent faster than anyone
 * could type it, a cap per sender, and a cap per vendor so no one listing's inbox can be flooded
 * from many places at once (lib/throttle.ts).
 */

export type EnquiryInput = {
  slug: string;
  name: string;
  email: string;
  /** The wedding day, "YYYY-MM-DD". */
  weddingDate?: string;
  /** The venue's state code, when the couple picked an Australian place from the search. */
  region?: string;
  venue?: string;
  /** From the cultures in data/taxonomy.ts. */
  cultures?: string[];
  /** Anything else about their cultures and traditions, in their words. */
  traditions?: string;
  /** An approximate number, as digits. */
  guests?: string;
  /** The languages they need, in their words. */
  languages?: string;
  message?: string;
  /** How they reached the listing (components/site/Trail.tsx). */
  trail?: { pages?: unknown; referrer?: unknown; landing?: unknown };
  /** The hidden field. A person leaves it empty. */
  website?: string;
  /** How long the form was open before it was sent, in ms, timed on the couple's device. */
  filledMs?: number;
};

export type EnquiryResult = { status: "ok" } | { status: "error"; message: string };

/** Per sender (IP, and email) per hour. Generous for a couple writing to several vendors in one sitting. */
const PER_HOUR = 12;
/** Per vendor. Far beyond what any listing gets, so only a flood reaches it. */
const VENDOR_PER_HOUR = 20;
const VENDOR_PER_DAY = 50;

const db = () =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

/** No one types names, a date, a venue and a message faster than this. */
const MIN_MS = 3000;

/** NT's wording for a failed send. */
const UNSENT = "That didn't send. Please check your email address and try again.";
/** When the fault is ours, not theirs: nothing they change would help. */
const DOWN = "That didn't send. Please try again in a few minutes.";

const tidy = (s: unknown, max: number) => (typeof s === "string" ? s.trim().replace(/\s+/g, " ").slice(0, max) : "");

export async function sendEnquiry(input: EnquiryInput): Promise<EnquiryResult> {
  // A bot filled in the hidden field, or raced through: say thanks and drop it.
  if (tidy(input.website, 200)) return { status: "ok" };
  if (typeof input.filledMs === "number" && input.filledMs < MIN_MS) return { status: "ok" };

  const name = tidy(input.name, 200);
  const email = tidy(input.email, 320).toLowerCase();
  const message = typeof input.message === "string" ? input.message.trim().slice(0, 5000) : "";
  const guestText = tidy(input.guests, 10);
  const guests = isGuestCount(guestText) ? guestText : GUESTS.find((g) => g === guestText);
  const [y, m, d] = (typeof input.weddingDate === "string" ? input.weddingDate : "").split("-").map(Number);
  const weddingDate = y && m && d ? isoDay(y, m, d) : null;
  const region = typeof input.region === "string" && isRegion(input.region) ? input.region : null;
  const venue = tidy(input.venue, 300);
  const cultures = Array.isArray(input.cultures) ? cultureNames.filter((c) => input.cultures!.includes(c)) : [];
  if (!name) return { status: "error", message: "Add your names." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: "error", message: UNSENT };
  if (!weddingDate) return { status: "error", message: "Add your wedding date as DD/MM/YYYY." };
  if (!venue) return { status: "error", message: "Add your venue, or the suburb or city." };
  if (!message) return { status: "error", message: "Tell them a little about your wedding." };

  const supabase = db();
  const { data: vendor, error: lookup } = await supabase
    .from("vendors")
    .select("id, name, slug, email")
    .eq("slug", tidy(input.slug, 200))
    .eq("status", "published")
    .maybeSingle();
  if (lookup) {
    reportSoon(lookup, { area: "enquiry", severity: "urgent", route: "/vendors/[slug]", context: { step: "finding the listing" } });
    return { status: "error", message: DOWN };
  }
  if (!vendor) return { status: "error", message: "This listing isn't taking enquiries." };

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "eastmeetswed.com"}`;
  const found = classifySource(input.trail, origin, vendor.slug);
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count: fromEmail, error: counting } = await supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", hourAgo);
  // Couldn't count: let it through, like the throttle, but say so.
  if (counting) reportSoon(counting, { area: "enquiry", route: "/vendors/[slug]", context: { step: "counting recent enquiries" } });
  if ((fromEmail ?? 0) >= PER_HOUR || !(await allow("enquiry", [{ key: await senderIp(), perHour: PER_HOUR }])))
    return { status: "error", message: "You've sent a lot of enquiries in the last hour. Try again a little later." };
  if (!(await allow("enquiry", [{ key: `vendor:${vendor.id}`, perHour: VENDOR_PER_HOUR, perDay: VENDOR_PER_DAY }])))
    return { status: "error", message: `${vendor.name} has had a lot of enquiries today. Try again a little later.` };

  const row = {
    vendor_id: vendor.id,
    name,
    email,
    wedding_date: weddingDate,
    region,
    venue,
    cultures,
    traditions: tidy(input.traditions, 300) || null,
    guests: guests ?? null,
    languages: tidy(input.languages, 300) || null,
    message,
    source: found.source,
    source_detail: found.detail ?? null,
  };
  const { data: saved, error } = await supabase.from("enquiries").insert(row).select("id").single();
  if (error) {
    reportSoon(error, { area: "enquiry", severity: "urgent", route: "/vendors/[slug]", context: { step: "saving", vendor: vendor.slug } });
    return { status: "error", message: DOWN };
  }

  // A failed send is reported by the sender (lib/email/send.ts); it stays in the vendor's inbox in
  // their account either way, with emailed_to empty.
  after(async () => {
    try {
      const to = await sendEnquiryEmail(vendor, row);
      if (!to) return;
      const { error: marking } = await supabase.from("enquiries").update({ emailed_to: to }).eq("id", saved.id);
      if (marking) await report(marking, { area: "enquiry", route: "/vendors/[slug]", context: { step: "marking it emailed", vendor: vendor.slug } });
    } catch (e) {
      await report(e, { area: "enquiry", severity: "urgent", route: "/vendors/[slug]", context: { step: "emailing the vendor", vendor: vendor.slug } });
    }
  });

  return { status: "ok" };
}
