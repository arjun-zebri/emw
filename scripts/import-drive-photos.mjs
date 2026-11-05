// Puts the suppliers' original photos from the team's Drive folder ("Suppliers profiles 2024") into
// the vendor-photos bucket and attaches them to their vendors. Run it after migrate-wordpress.mjs
// and import-suppliers.mjs, which create the vendors.
//
//   node --env-file=.env.local scripts/import-drive-photos.mjs [--from <folder>]
//
// The list is data/imports/drive-photos.json: for each vendor, the Drive files in order (the first
// is the cover), and a mode. "replace" makes these the vendor's photos; "add" puts them after the
// ones already there. Drive is only read: files come from their public download links, or from
// --from <folder>/<slug>/NN.<ext> when they have been downloaded already. Duplicates, logos and
// a HEIC copy of a JPG were left out of the list.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const STAGING = "nntjkiknekpolkftejnm";
if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes(STAGING)) throw new Error("This import is for the staging database only.");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};
const from = process.argv.includes("--from") ? process.argv[process.argv.indexOf("--from") + 1] : null;
const list = JSON.parse(await readFile("data/imports/drive-photos.json", "utf8"));
const tmp = mkdtempSync(path.join(tmpdir(), "emw-drive-"));

async function original(slug, i, photo) {
  const ext = path.extname(photo.title).toLowerCase();
  const local = from && path.join(from, slug, `${String(i).padStart(2, "0")}${ext}`);
  if (local && existsSync(local)) return readFileSync(local);
  const res = await fetch(`https://drive.usercontent.google.com/download?id=${photo.id}&export=download`, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// sharp's prebuilt binaries can't read HEIC; macOS sips can.
function readable(buf, photo) {
  if (photo.mimeType !== "image/heic") return buf;
  const src = path.join(tmp, `${photo.id}.heic`), out = path.join(tmp, `${photo.id}.jpg`);
  writeFileSync(src, buf);
  execFileSync("sips", ["-s", "format", "jpeg", src, "--out", out], { stdio: "ignore" });
  return readFileSync(out);
}

const vendors = new Map(must(await db.from("vendors").select("id, slug, name")).map((v) => [v.slug, v]));
let total = 0;
const problems = [];

for (const [slug, entry] of Object.entries(list)) {
  const vendor = vendors.get(slug);
  if (!vendor) {
    problems.push(`${slug}: no vendor in the database yet`);
    continue;
  }
  const existing = must(await db.from("vendor_photos").select("path, position").eq("vendor_id", vendor.id).order("position"));
  if (entry.mode === "replace" && existing.length) {
    must(await db.from("vendor_photos").delete().eq("vendor_id", vendor.id));
    must(await db.storage.from("vendor-photos").remove(existing.map((p) => p.path)));
  }
  const kept = entry.mode === "replace" ? [] : existing;
  let position = kept.length ? Math.max(...kept.map((p) => p.position)) + 1 : 0;

  const rows = [];
  for (const [i, photo] of entry.photos.entries()) {
    try {
      const buf = readable(await original(slug, i, photo), photo);
      const { data, info } = await sharp(buf)
        .rotate()
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 86, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
      const key = `${vendor.id}/drive-${String(position).padStart(2, "0")}.jpg`;
      must(await db.storage.from("vendor-photos").upload(key, data, { contentType: "image/jpeg", upsert: true }));
      rows.push({ vendor_id: vendor.id, path: key, width: info.width, height: info.height, alt: position === 0 ? vendor.name : `${vendor.name}, photo ${position + 1}`, position });
      position++;
    } catch (e) {
      problems.push(`${slug}: ${photo.title} (${e.message})`);
    }
  }
  if (rows.length) must(await db.from("vendor_photos").insert(rows));
  total += rows.length;
  console.log(`  ${slug}: ${rows.length} from Drive (${entry.mode}${kept.length ? `, after ${kept.length} already there` : ""})`);
}

console.log(`${total} photos from Drive`);
if (problems.length) console.log(`Problems:\n  ${problems.join("\n  ")}`);
