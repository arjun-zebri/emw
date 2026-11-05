// Adds the suppliers from the team's research spreadsheet (Combined.xlsx, "Supplier Directory" tab)
// to the staging database as draft vendors.
//
//   node --env-file=.env.local scripts/import-suppliers.mjs [--dry-run]
//
// The spreadsheet itself is never touched. It was copied to data/imports/supplier-directory.csv
// (gitignored, as it holds contact details of people who haven't agreed to a public listing yet),
// and the copy is where the columns were mapped onto ours. Edit the copy, not the original.
//
// Only rows marked "yes" in the import column go in. Suppliers who already have an EMW listing are
// marked skip: they come in through migrate-wordpress.mjs with their curated copy.
//
// Insert only. A vendor whose slug is already in the database is left exactly as it is, so the
// script is safe to run again.
//
// No photos. The spreadsheet lists image links on the suppliers' own websites, but we don't take
// photos from a business's site or socials: they come from the business or the EMW team (the
// Drive folder, the live listing, or an upload), so a draft without them waits under "Missing data".

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { parseCsv } from "./lib/csv.mjs";

const CSV = "data/imports/supplier-directory.csv";
const STAGING = "nntjkiknekpolkftejnm";
const dryRun = process.argv.includes("--dry-run");

if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes(STAGING)) {
  throw new Error("This import is for the staging database only.");
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

const list = (s) => s.split(";").map((x) => x.trim()).filter(Boolean);
const orNull = (s) => s.trim() || null;

const suppliers = parseCsv(await readFile(CSV, "utf8"));
const todo = suppliers.filter((s) => s.import === "yes");
console.log(`${suppliers.length} rows in ${CSV}, ${todo.length} to import${dryRun ? " (dry run)" : ""}`);

const existing = new Set(must(await db.from("vendors").select("slug")).map((v) => v.slug));
let added = 0, kept = 0;

for (const s of todo) {
  if (existing.has(s.slug)) {
    kept++;
    continue;
  }
  const row = {
    slug: s.slug,
    name: s.name,
    person: orNull(s.person),
    discipline: s.discipline,
    services: list(s.services),
    service_area: list(s.service_area),
    languages: list(s.languages),
    story: s.story.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
    email: orNull(s.email),
    website: orNull(s.website),
    instagram: orNull(s.instagram),
    facebook: orNull(s.facebook),
    status: "draft",
  };
  if (!dryRun) must(await db.from("vendors").insert(row));
  added++;
}

console.log(`${added} vendors added as drafts, ${kept} already there and left alone`);
