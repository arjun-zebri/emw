// Adds the suppliers from the team's research spreadsheet (Combined.xlsx, "Supplier Directory" tab)
// to the staging database as draft vendors, with their photos.
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
// script is safe to run again; it only adds photos to a draft it created that has none yet.

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

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

// RFC 4180: quoted fields can hold commas, quotes ("") and line breaks.
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  const endField = () => {
    row.push(field);
    field = "";
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") endField();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endField();
      rows.push(row);
      row = [];
    } else field += c;
  }
  if (field || row.length) {
    endField();
    rows.push(row);
  }
  const [head, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

const list = (s) => s.split(";").map((x) => x.trim()).filter(Boolean);
const orNull = (s) => s.trim() || null;

const suppliers = parseCsv(await readFile(CSV, "utf8"));
const todo = suppliers.filter((s) => s.import === "yes");
console.log(`${suppliers.length} rows in ${CSV}, ${todo.length} to import${dryRun ? " (dry run)" : ""}`);

const existing = new Map(must(await db.from("vendors").select("id, slug, status")).map((v) => [v.slug, v]));
let added = 0, kept = 0, photoCount = 0;
const failed = [];

for (const s of todo) {
  let vendor = existing.get(s.slug);
  if (vendor) {
    kept++;
    if (vendor.status !== "draft") continue;
    const { count } = await db.from("vendor_photos").select("id", { count: "exact", head: true }).eq("vendor_id", vendor.id);
    if (count || dryRun) continue;
  } else {
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
    if (dryRun) {
      added++;
      continue;
    }
    vendor = must(await db.from("vendors").insert(row).select("id, slug, status").single());
    added++;
  }

  const urls = [s.photo_1, s.photo_2, s.photo_3].map((u) => u.trim()).filter(Boolean);
  const photos = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (East Meets Wed import)" }, signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const img = sharp(Buffer.from(await res.arrayBuffer())).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" });
      const { data, info } = await img.jpeg({ quality: 86, mozjpeg: true }).toBuffer({ resolveWithObject: true });
      const i = photos.length;
      const key = `${vendor.id}/${String(i).padStart(2, "0")}.jpg`;
      must(await db.storage.from("vendor-photos").upload(key, data, { contentType: "image/jpeg", upsert: false }));
      photos.push({ vendor_id: vendor.id, path: key, width: info.width, height: info.height, alt: i === 0 ? s.name : `${s.name}, photo ${i + 1}`, position: i });
    } catch (e) {
      failed.push(`${s.slug}: ${url} (${e.message})`);
    }
  }
  if (photos.length) must(await db.from("vendor_photos").insert(photos));
  photoCount += photos.length;
  console.log(`  ${s.slug}: ${photos.length}/${urls.length} photos`);
}

console.log(`${added} vendors added as drafts, ${kept} already there and left alone, ${photoCount} photos`);
if (failed.length) console.log(`Photos that couldn't be fetched:\n  ${failed.join("\n  ")}`);
