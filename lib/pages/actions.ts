"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { readSession } from "@/lib/supabase/session";
import { PAGES_TAG } from "./live";

/** Drop the cached pages so a saved page shows on the next visit. Team only. */
export async function refreshPages() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (readSession(data?.claims)?.role !== "team") return;
  updateTag(PAGES_TAG);
}
