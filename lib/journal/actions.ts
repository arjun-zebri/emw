"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { readSession } from "@/lib/supabase/session";
import { JOURNAL_TAG } from "./posts";

/** Drop the cached posts so the journal and the home page show a change on the next visit. Team only. */
export async function refreshJournal() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (readSession(data?.claims)?.role !== "team") return;
  updateTag(JOURNAL_TAG);
}
