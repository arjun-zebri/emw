// Makes the smaller copies (480 and 1200px) of every photo already in the vendor-photos bucket.
// It works from our own stored copies only. Photos uploaded by the import scripts get them as they
// go; this fills in the rest. Safe to run again: copies that exist are skipped.
//
//   node --env-file=.env.local scripts/make-photo-variants.mjs

import { createClient } from "@supabase/supabase-js";
import { WIDTHS, uploadVariants, variantKey } from "./lib/variants.mjs";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data: photos, error } = await db.from("vendor_photos").select("path").range(0, 9999);
if (error) throw error;

let made = 0, skipped = 0;
for (const { path } of photos) {
  const folder = path.split("/")[0];
  const { data: files } = await db.storage.from("vendor-photos").list(folder, { limit: 1000 });
  const names = new Set((files ?? []).map((f) => `${folder}/${f.name}`));
  if (WIDTHS.every((w) => names.has(variantKey(path, w)))) {
    skipped++;
    continue;
  }
  const { data: blob, error: e } = await db.storage.from("vendor-photos").download(path);
  if (e) throw new Error(`${path}: ${e.message}`);
  await uploadVariants(db, path, Buffer.from(await blob.arrayBuffer()));
  made++;
}
console.log(`${made} photos given smaller copies, ${skipped} already had them`);
