"use server";

import { updateTag } from "next/cache";
import { LISTINGS_TAG } from "./listings";
import { createClient } from "./supabase/server";
import { readSession } from "./supabase/session";

/** Drop the cached listings so the public pages show a change on the next visit. Signed-in people only. */
export async function refreshListings() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!readSession(data?.claims)) return;
  updateTag(LISTINGS_TAG);
}
