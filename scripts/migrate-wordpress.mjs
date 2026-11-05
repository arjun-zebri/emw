// Moves the WordPress site's content into Supabase (EMW-11): the 34 vendor listings with their
// photos, and the journal posts. Safe to run again: rows are matched on slug and replaced.
//
//   node --experimental-strip-types --env-file=.env.local scripts/migrate-wordpress.mjs
//
// Listings come from data/vendors.ts, which is the WordPress copy cleaned up (typos fixed, long
// paragraphs split) plus the editorial layer (discipline, lede, quote). The script checks it is
// still current against the live site first. Photos are the curated picks in data/photos.ts,
// uploaded to the vendor-photos bucket as <vendor id>/NN.jpg, except for vendors whose photos come
// from the team's Drive originals (data/imports/drive-photos.json, see import-drive-photos.mjs). Journal posts are read from the
// live site, and their images go to the journal bucket as <post slug>/NN.jpg. An image block in a
// post's body stores that bucket path as its src.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { uploadVariants, variantKeys } from "./lib/variants.mjs";
import { vendors } from "../data/vendors.ts";
import { vendorPhotos } from "../data/photos.ts";

// Written by the Drive photo import (gitignored). Missing is fine: every vendor then gets the site photos.
const drivePhotos = await readFile("data/imports/drive-photos.json", "utf8").then(JSON.parse, () => ({}));

const WP = "https://eastmeetswed.com/wp-json/wp/v2";
// When data/vendors.ts was taken from the site. A listing edited after this needs re-copying.
const SNAPSHOT = "2026-10-01";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};
const wp = async (route) => {
  const res = await fetch(`${WP}/${route}`);
  if (!res.ok) throw new Error(`${route}: ${res.status}`);
  return res.json();
};

// ── Check the snapshot is current ───────────────────────────────────────────────────────────────

const live = await wp("at_biz_dir?per_page=100&status=publish&_fields=slug,modified");
const ours = new Set(vendors.map((v) => v.legacySlug ?? v.slug));
const missing = live.filter((l) => !ours.has(l.slug)).map((l) => l.slug);
const stale = live.filter((l) => l.modified.slice(0, 10) > SNAPSHOT).map((l) => l.slug);
const gone = [...ours].filter((s) => !live.some((l) => l.slug === s));
if (missing.length || stale.length || gone.length) {
  throw new Error(`data/vendors.ts is out of date. New: ${missing.join(", ") || "none"}. Edited since ${SNAPSHOT}: ${stale.join(", ") || "none"}. Removed: ${gone.join(", ") || "none"}.`);
}
console.log(`${live.length} listings on WordPress, all in data/vendors.ts`);

// ── Vendors and photos ──────────────────────────────────────────────────────────────────────────

let photoCount = 0;
for (const v of vendors) {
  const row = {
    slug: v.slug,
    legacy_slug: v.legacySlug ?? null,
    name: v.name,
    person: v.person ?? null,
    discipline: v.discipline,
    services: v.services,
    based: v.based ?? null,
    service_area: v.serviceArea ?? [],
    travels: v.travels ?? null,
    languages: v.languages ?? [],
    lede: v.lede,
    quote: v.quote ?? null,
    story: v.story,
    signoff: v.signoff ?? null,
    email: v.contact?.email ?? null,
    phone: v.contact?.phone ?? null,
    website: v.contact?.website ?? null,
    instagram: v.socials?.instagram ?? null,
    facebook: v.socials?.facebook ?? null,
    youtube: v.socials?.youtube ?? null,
    featured: v.featured,
    status: "published",
  };
  const { id } = must(await db.from("vendors").upsert(row, { onConflict: "slug" }).select("id").single());

  // Vendors whose photos come from the team's Drive originals are left to import-drive-photos.mjs.
  if (drivePhotos[v.slug]?.mode === "replace") {
    console.log(`  ${v.slug}: photos from Drive, left as they are`);
    continue;
  }

  const picks = vendorPhotos[v.slug];
  const files = picks ? [picks.cover, ...picks.gallery] : [];
  const photos = [];
  for (const [i, src] of files.entries()) {
    const buf = await readFile(path.join("public", src));
    const { width, height } = await sharp(buf).metadata();
    const key = `${id}/${String(i).padStart(2, "0")}.jpg`;
    must(await db.storage.from("vendor-photos").upload(key, buf, { contentType: "image/jpeg", upsert: true }));
    await uploadVariants(db, key, buf);
    photos.push({ vendor_id: id, path: key, width, height, alt: i === 0 ? v.name : `${v.name}, photo ${i + 1}`, position: i });
  }
  // Replace the photo rows, and remove files left over from a longer earlier run.
  must(await db.from("vendor_photos").delete().eq("vendor_id", id));
  if (photos.length) must(await db.from("vendor_photos").insert(photos));
  const stored = must(await db.storage.from("vendor-photos").list(id));
  const keep = new Set([...photos.map((p) => p.path), ...variantKeys(photos.map((p) => p.path))]);
  const extra = stored.map((f) => `${id}/${f.name}`).filter((k) => !keep.has(k));
  if (extra.length) must(await db.storage.from("vendor-photos").remove(extra));

  photoCount += photos.length;
  console.log(`  ${v.slug}: ${photos.length} photo${photos.length === 1 ? "" : "s"}`);
}
console.log(`${vendors.length} vendors, ${photoCount} photos`);

// ── Journal ─────────────────────────────────────────────────────────────────────────────────────

const decode = (s) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

// Divi wraps the post in [et_pb_…] shortcodes. What matters is the paragraphs, headings and
// image modules, in order.
const BLOCK = /<p[^>]*>([\s\S]*?)<\/p>|<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>|\[et_pb_image[^\]]*?src=[“”″"]([^“”″"]+)[“”″"]/g;
const CATEGORIES = { culture: "Culture", "real-weddings": "Real weddings", planning: "Planning", vendors: "Vendors" };

const posts = await wp("posts?per_page=100&status=publish&_embed=wp:term");
for (const p of posts) {
  const terms = (p._embedded?.["wp:term"] ?? []).flat();
  const category = terms.map((t) => CATEGORIES[t.slug]).find(Boolean) ?? "Culture";
  const content = p.content.rendered.replace(/&#8221;|&#8243;|&#8220;/g, "”");

  const body = [];
  let images = 0;
  for (const m of content.matchAll(BLOCK)) {
    const id = `b${body.length + 1}`;
    if (m[3]) {
      // WordPress's screenshots have a narrow no-break space in the name; the URL needs it encoded.
      const res = await fetch(encodeURI(m[3].replace(/ (?=[ap]m\.)/, " ")));
      if (!res.ok) throw new Error(`${m[3]}: ${res.status}`);
      const jpg = await sharp(Buffer.from(await res.arrayBuffer())).flatten({ background: "#ffffff" }).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
      const key = `${p.slug}/${String(++images).padStart(2, "0")}.jpg`;
      must(await db.storage.from("journal").upload(key, jpg, { contentType: "image/jpeg", upsert: true }));
      body.push({ id, type: "img", src: key, alt: "" });
      continue;
    }
    const text = decode(m[1] ?? m[2]);
    if (text) body.push({ id, type: m[1] != null ? "p" : "h", text });
  }

  const first = body.find((b) => b.type === "img");
  const firstPara = body.find((b) => b.type === "p")?.text ?? "";
  const row = {
    slug: p.slug,
    title: decode(p.title.rendered),
    standfirst: "",
    category,
    cover_path: first?.src ?? null,
    cover_alt: first?.alt ?? "",
    body,
    description: firstPara.length > 160 ? `${firstPara.slice(0, firstPara.lastIndexOf(" ", 157))}…` : firstPara,
    author: "East Meets Wed",
    status: "published",
    published_at: `${p.date_gmt}Z`,
  };
  must(await db.from("posts").upsert(row, { onConflict: "slug" }));
  console.log(`  ${p.slug}: ${body.filter((b) => b.type !== "img").length} paragraphs, ${images} image${images === 1 ? "" : "s"}`);
}
console.log(`${posts.length} journal post${posts.length === 1 ? "" : "s"}`);
