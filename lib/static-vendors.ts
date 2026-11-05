import { vendorPhotos } from "@/data/photos";
import type { Vendor } from "@/data/types";
import { vendors as listings } from "@/data/vendors";

/*
 * The 34 WordPress listings as they were copied into data/vendors.ts, with the curated photos in
 * /public. Only the admin, the vendor portal and /design-system read this, until they move to
 * Supabase. The public site reads the live listings from lib/listings.ts.
 */
export const vendors: Vendor[] = listings.map((v) => ({ ...v, ...vendorPhotos[v.slug] }));

export function getVendor(slug: string): Vendor | undefined {
  return vendors.find((v) => v.slug === slug);
}
