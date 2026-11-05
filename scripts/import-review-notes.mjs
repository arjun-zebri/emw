// Loads what the research spreadsheet says about each supplier (confidence, notes to check, events
// attended) into vendor_review_notes, where only the team can read it. The approval screen shows it.
//
//   node --env-file=.env.local scripts/import-review-notes.mjs
//
// Reads the same CSV copy as import-suppliers.mjs (data/imports/supplier-directory.csv). A row is
// matched to its vendor by slug, or, for suppliers who were already on the WordPress site, by that
// listing's address. Safe to run again: each vendor's notes are replaced with the CSV's.

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { parseCsv } from "./lib/csv.mjs";

const CSV = "data/imports/supplier-directory.csv";
const STAGING = "nntjkiknekpolkftejnm";
if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes(STAGING)) throw new Error("This import is for the staging database only.");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const rows = parseCsv(await readFile(CSV, "utf8"));
const { data: vendors, error } = await db.from("vendors").select("id, slug, legacy_slug");
if (error) throw error;
const bySlug = new Map();
for (const v of vendors) {
  bySlug.set(v.slug, v.id);
  if (v.legacy_slug) bySlug.set(v.legacy_slug, v.id);
}

const notes = [];
const unmatched = [];
for (const r of rows) {
  const listed = r.emw_existing_listing.replace(/\/$/, "").split("/").pop();
  const id = bySlug.get(r.slug) ?? (listed ? bySlug.get(listed) : undefined);
  if (!id) {
    unmatched.push(r.name);
    continue;
  }
  notes.push({
    vendor_id: id,
    confidence: ["High", "Medium", "Low"].includes(r.data_confidence) ? r.data_confidence : null,
    notes: r.notes.trim(),
    years_attended: r.years_attended.trim() || null,
    categories_original: r.categories_original.trim() || null,
    registered_emails: r.all_registered_emails.trim() || null,
    source: `Combined.xlsx, Supplier Directory row ${r.source_row}`,
  });
}

const { error: upsertError } = await db.from("vendor_review_notes").upsert(notes, { onConflict: "vendor_id" });
if (upsertError) {
  if (upsertError.code === "PGRST205" || /vendor_review_notes/.test(upsertError.message)) {
    throw new Error("vendor_review_notes doesn't exist yet: run supabase/migrations/20261105010000_vendor_review_notes.sql in the staging SQL editor first.");
  }
  throw upsertError;
}
console.log(`${notes.length} vendors' review notes loaded`);
if (unmatched.length) console.log(`No vendor for: ${unmatched.join(", ")}`);
