// Rewrites the line under each vendor's name from the services they offer, as the listing editor
// now does ("Photography & videography"), for listings written before the line followed them.
// Prints what would change; nothing is written without --apply.
//
//   node --env-file=.env.local scripts/services-line.mjs            # staging, dry run
//   node --env-file=.env.local scripts/services-line.mjs --apply
//
// For the live database, pull its settings first:
//   vercel env pull .env.production.local --environment production
//   node --env-file=.env.production.local scripts/services-line.mjs --apply
//
// Vendors with no services keep their line. The public pages refresh on the next listing change
// or deploy (tag `vendors`).

import { createClient } from "@supabase/supabase-js";
import { servicesLine } from "../data/taxonomy.ts";

const LINE_MAX = 120; // lib/account/listing.ts
const apply = process.argv.includes("--apply");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];

const { data, error } = await db.from("vendors").select("id, slug, discipline, services").order("slug");
if (error) throw error;

const changes = data.flatMap((v) => {
  if (!v.services?.length) return [];
  const line = servicesLine(v.services, LINE_MAX);
  return line === v.discipline ? [] : [{ ...v, line }];
});

for (const v of changes) console.log(`${v.slug}\n  ${v.discipline}\n→ ${v.line}`);
console.log(`\n${changes.length} of ${data.length} vendors in ${project} ${apply ? "updated" : "would change (run with --apply)"}.`);

if (apply) {
  for (const v of changes) {
    const { error: e } = await db.from("vendors").update({ discipline: v.line }).eq("id", v.id);
    if (e) throw e;
  }
}
