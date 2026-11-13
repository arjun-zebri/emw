// Gives every journal photo already in the database what the editor's uploads have: the 480 and
// 1200px copies beside it, and its size recorded in the post (cover and body), so the journal can
// hold each photo's shape while it loads. Posts brought over from WordPress need this once; run it
// on staging, then on production at release. Safe to run again: photos with both are skipped.
//
//   node --env-file=.env.local scripts/journal-photo-sizes.mjs

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { WIDTHS, uploadVariants, variantKey } from "./lib/variants.mjs";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

const posts = must(await db.from("posts").select("id, slug, cover_path, cover_width, body"));
const bucket = db.storage.from("journal");
const sizes = new Map();

/** Size of one stored photo, making its smaller copies on the way if they're missing. */
async function measure(path) {
  if (sizes.has(path)) return sizes.get(path);
  const folder = path.split("/").slice(0, -1).join("/");
  const files = must(await bucket.list(folder, { limit: 1000 }));
  const names = new Set(files.map((f) => (folder ? `${folder}/${f.name}` : f.name)));
  const blob = must(await bucket.download(path));
  const buf = Buffer.from(await blob.arrayBuffer());
  if (!WIDTHS.every((w) => names.has(variantKey(path, w)))) {
    await uploadVariants(db, path, buf, "journal");
    console.log(`  ${path}: smaller copies made`);
  }
  const { width, height } = await sharp(buf).rotate().metadata();
  const size = { w: width, h: height };
  sizes.set(path, size);
  return size;
}

const ours = (src) => typeof src === "string" && src.endsWith(".jpg") && !/^[a-z]+:/.test(src);

for (const post of posts) {
  let changed = false;
  const body = [];
  for (const b of post.body) {
    if (b.type !== "img") {
      body.push(b);
      continue;
    }
    // The WordPress import stored one photo per block as {src, alt}; the editor keeps a row of them.
    const images = b.images ?? [{ src: b.src, alt: b.alt ?? "" }];
    for (const img of images) {
      if (ours(img.src) && !(img.w && img.h)) {
        Object.assign(img, await measure(img.src));
        changed = true;
      }
    }
    if (!b.images) changed = true;
    body.push({ id: b.id, type: "img", images, caption: b.caption ?? "" });
  }

  const update = changed ? { body } : {};
  if (post.cover_path && ours(post.cover_path) && !post.cover_width) {
    const { w, h } = await measure(post.cover_path);
    Object.assign(update, { cover_width: w, cover_height: h });
  }
  if (Object.keys(update).length) {
    must(await db.from("posts").update(update).eq("id", post.id));
    console.log(`${post.slug}: updated`);
  } else console.log(`${post.slug}: already done`);
}
