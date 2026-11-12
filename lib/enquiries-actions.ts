"use server";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { after } from "next/server";
import { cultureNames } from "@/data/taxonomy";
import { sendEnquiryEmail } from "./email/send";
import { classifySource, GUESTS, isGuestCount, isoDay, isRegion } from "./enquiry-fields";
import type { Database } from "./supabase/database.types";

/*
 * A couple's enquiry from a vendor page: checked, saved, then emailed to the vendor once the couple
 * has their answer. Anyone can send one, so the server writes it with the secret key (there's no
 * insert policy) and refuses floods: a hidden field bots fill in, and a cap per sender per hour.
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
};

export type EnquiryResult = { status: "ok" } | { status: "error"; message: string };

/** Per sender (IP, and email) per hour. Generous for a couple writing to several vendors in one sitting. */
const PER_HOUR = 12;

const db = () =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

/** NT's wording for a failed send. */
const UNSENT = "That didn't send. Please check your email address and try again.";

const tidy = (s: unknown, max: number) => (typeof s === "string" ? s.trim().replace(/\s+/g, " ").slice(0, max) : "");

export async function sendEnquiry(input: EnquiryInput): Promise<EnquiryResult> {
  // A bot filled in the hidden field: say thanks and drop it.
  if (tidy(input.website, 200)) return { status: "ok" };

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
  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, name, slug, email")
    .eq("slug", tidy(input.slug, 200))
    .eq("status", "published")
    .maybeSingle();
  if (!vendor) return { status: "error", message: "This listing isn't taking enquiries." };

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "eastmeetswed.com"}`;
  const found = classifySource(input.trail, origin, vendor.slug);
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const ipHash = createHash("sha256").update(`${process.env.SUPABASE_SECRET_KEY}:${ip}`).digest("hex");
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const [{ count: fromIp }, { count: fromEmail }] = await Promise.all([
    supabase.from("enquiry_attempts").select("ip_hash", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", hourAgo),
    supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", hourAgo),
  ]);
  if ((fromIp ?? 0) >= PER_HOUR || (fromEmail ?? 0) >= PER_HOUR)
    return { status: "error", message: "You've sent a lot of enquiries in the last hour. Try again a little later." };

  await supabase.from("enquiry_attempts").insert({ ip_hash: ipHash });

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
    console.error(`[enquiry] Couldn't save an enquiry for ${vendor.slug}: ${error.message}`);
    return { status: "error", message: UNSENT };
  }

  after(async () => {
    await supabase.from("enquiry_attempts").delete().lt("created_at", new Date(Date.now() - 86_400_000).toISOString());
    const to = await sendEnquiryEmail(vendor, row);
    if (to) await supabase.from("enquiries").update({ emailed_to: to }).eq("id", saved.id);
  });

  return { status: "ok" };
}
