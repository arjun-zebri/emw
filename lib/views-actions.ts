"use server";

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { BOT_UA } from "./bots";
import type { Database } from "./supabase/database.types";

/*
 * One view of a vendor page, for the vendor's profile stats. Anyone can view a listing, so the
 * server records it with the secret key (vendor_views has no insert policy). Crawlers and link
 * previews are left out; the page itself counts a browser once per session (CountView).
 */

export async function recordView(slug: string) {
  if (typeof slug !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 120) return;
  const ua = (await headers()).get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return;
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });
  // A failed count must never trouble the visitor, so errors are dropped.
  await db.rpc("record_vendor_view", { vendor_slug: slug });
}
