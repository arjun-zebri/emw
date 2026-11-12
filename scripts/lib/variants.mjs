import sharp from "sharp";

// The smaller copies stored beside every vendor and journal photo (see lib/supabase/storage.ts), so pages can
// pick one with srcset instead of resizing on the fly.
export const WIDTHS = [480, 1200];

export const variantKey = (key, width) => key.replace(/\.jpg$/, `@${width}.jpg`);

/** Upload the smaller copies of one photo (a JPEG buffer) next to it, in vendor-photos unless told otherwise. */
export async function uploadVariants(db, key, jpg, bucket = "vendor-photos") {
  for (const width of WIDTHS) {
    const data = await sharp(jpg).resize({ width, height: width, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    const { error } = await db.storage.from(bucket).upload(variantKey(key, width), data, { contentType: "image/jpeg", upsert: true });
    if (error) throw error;
  }
}

/** Remove a photo's smaller copies along with it. */
export const variantKeys = (keys) => keys.flatMap((k) => WIDTHS.map((w) => variantKey(k, w)));
