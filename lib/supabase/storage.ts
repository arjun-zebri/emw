/** Public URL of an image in one of the storage buckets (both are public to read). */
export type Bucket = "vendor-photos" | "journal";

const base = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`;

export const imageUrl = (bucket: Bucket, path: string) => `${base()}${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;

/*
 * Photos are served straight from Supabase's CDN as plain <img>, never through next/image (Vercel's
 * optimiser is metered). Each vendor and journal photo is stored at up to 2000px plus smaller copies
 * beside it, made once at upload (scripts/lib/variants.mjs, or in the browser): <path>@480.jpg and
 * <path>@1200.jpg.
 */
export const VARIANT_WIDTHS = [480, 1200] as const;

export const variantPath = (path: string, width: (typeof VARIANT_WIDTHS)[number]) => path.replace(/\.jpg$/, `@${width}.jpg`);

/** srcset for one of our vendor or journal photos, or undefined for any other image. */
export function photoSrcSet(src: string) {
  if (!(src.startsWith(`${base()}vendor-photos/`) || src.startsWith(`${base()}journal/`)) || !src.endsWith(".jpg") || /@\d+\.jpg$/.test(src)) return undefined;
  return [...VARIANT_WIDTHS.map((w) => `${variantPath(src, w)} ${w}w`), `${src} 2000w`].join(", ");
}

/** The smallest copy, for thumbnails and avatars. */
export const thumbUrl = (src: string) => (photoSrcSet(src) ? variantPath(src, 480) : src);
