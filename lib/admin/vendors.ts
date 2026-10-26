import type { Language, Service, StateCode } from "@/data/types";
import { getVendor, locationLabel, vendors } from "@/lib/vendors";
import { subscriptionFor, type Subscription, type TierId } from "./billing";
import type { AdminState } from "./store";
import { TODAY, addMonths, daysUntil } from "./time";

/** One shape for every vendor the admin manages: the 34 listed ones plus any added in the demo. */
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
  sub: Subscription;
  status: VendorStatus;
  /** Added through the portal in this demo, so it has no history yet. */
  isNew: boolean;
};

export type VendorStatus = "live" | "payment-failed" | "cancelling" | "expiring" | "new";

export const statusLabels: Record<VendorStatus, { label: string; tone: "good" | "warn" | "bad" | "neutral" }> = {
  live: { label: "Live", tone: "good" },
  new: { label: "New", tone: "neutral" },
  expiring: { label: "Expiring", tone: "warn" },
  cancelling: { label: "Cancelling", tone: "warn" },
  "payment-failed": { label: "Payment failed", tone: "bad" },
};

function statusOf(sub: Subscription, retried: boolean): VendorStatus {
  if (sub.status === "past_due" && !retried) return "payment-failed";
  if (sub.status === "cancelling") return "cancelling";
  if (!sub.autoRenew && daysUntil(sub.renews) <= 30) return "expiring";
  return "live";
}

export function adminVendors(state: AdminState): AdminVendor[] {
  const listed = vendors.map((v): AdminVendor => {
    const edit = state.listingEdits[v.slug] ?? {};
    const sub = subscriptionFor(v.slug)!;
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
      sub,
      status: statusOf(sub, !!state.retried[sub.id]),
      isNew: false,
    };
  });
  const added = state.addedVendors.map((v): AdminVendor => {
    const sub: Subscription = {
      id: `sub_new_${v.slug}`,
      slug: v.slug,
      name: v.name,
      tier: v.tier as TierId,
      billing: v.billing,
      started: v.added.slice(0, 10),
      renews: addMonths(TODAY, v.billing === "annual" ? 12 : 1),
      autoRenew: true,
      status: "active",
      card: { brand: "Visa", last4: "4242", expires: "2028-08" },
    };
    return {
      ...v,
      location: v.based ? `${v.based}${v.serviceArea[0] ? `, ${v.serviceArea[0]}` : ""}` : v.serviceArea.join(", ") || "Location on request",
      cover: v.photos[0],
      featured: v.tier === "premier",
      sub,
      status: "new",
      isNew: true,
    };
  });
  return [...added, ...listed];
}

export const findAdminVendor = (state: AdminState, slug: string) => adminVendors(state).find((v) => v.slug === slug);

export const isListed = (slug: string) => !!getVendor(slug);
