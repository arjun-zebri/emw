import type { Language, Service, StateCode } from "@/data/types";
import { getVendor, locationLabel, vendors } from "@/lib/vendors";
import type { TierId } from "./billing";
import type { AdminState } from "./store";

/** One shape for every vendor the admin manages: the 34 listed ones plus any added here. */
export type AdminVendor = {
  slug: string;
  name: string;
  person?: string;
  discipline: string;
  services: Service[];
  languages: Language[];
  serviceArea: StateCode[];
  based?: string;
  location: string;
  lede: string;
  cover?: string;
  photos: string[];
  email?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  featured: boolean;
  /** The plan picked when the vendor was added here; listed vendors have none until billing starts. */
  tier?: TierId;
  status: VendorStatus;
  /** Added through the portal (kept in this browser for now), not one of the listed vendors. */
  isNew: boolean;
};

export type VendorStatus = "live" | "new";

export const statusLabels: Record<VendorStatus, { label: string; tone: "good" | "neutral" }> = {
  live: { label: "Live", tone: "good" },
  new: { label: "New", tone: "neutral" },
};

export function adminVendors(state: AdminState): AdminVendor[] {
  const listed = vendors.map((v): AdminVendor => {
    const edit = state.listingEdits[v.slug] ?? {};
    return {
      slug: v.slug,
      name: edit.name ?? v.name,
      person: edit.person ?? v.person ?? v.signoff,
      discipline: edit.discipline ?? v.discipline,
      services: edit.services ?? v.services,
      languages: edit.languages ?? v.languages ?? [],
      serviceArea: edit.serviceArea ?? v.serviceArea ?? [],
      based: edit.based ?? v.based,
      location: locationLabel(v),
      lede: edit.lede ?? v.lede,
      cover: v.cover,
      photos: [v.cover, ...(v.gallery ?? [])].filter(Boolean) as string[],
      email: edit.email ?? v.contact?.email,
      phone: edit.phone ?? v.contact?.phone,
      website: edit.website ?? v.contact?.website,
      instagram: edit.instagram ?? v.socials?.instagram,
      facebook: edit.facebook ?? v.socials?.facebook,
      featured: v.featured,
      status: "live",
      isNew: false,
    };
  });
  const added = state.addedVendors.map(
    (v): AdminVendor => ({
      ...v,
      location: v.based ? `${v.based}${v.serviceArea[0] ? `, ${v.serviceArea[0]}` : ""}` : v.serviceArea.join(", ") || "Location on request",
      cover: v.photos[0],
      featured: v.tier === "premier",
      tier: v.tier,
      status: "new",
      isNew: true,
    }),
  );
  return [...added, ...listed];
}

export const findAdminVendor = (state: AdminState, slug: string) => adminVendors(state).find((v) => v.slug === slug);

export const isListed = (slug: string) => !!getVendor(slug);
