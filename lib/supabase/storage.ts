/** Public URL of an image in one of the storage buckets (both are public to read). */
export type Bucket = "vendor-photos" | "journal";

export const imageUrl = (bucket: Bucket, path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
