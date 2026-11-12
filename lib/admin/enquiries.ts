import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase/browser";
import type { Source } from "@/lib/enquiry-fields";
import { imageUrl, variantPath } from "@/lib/supabase/storage";

/*
 * Enquiries couples send from vendor pages, read from Supabase as the signed-in person: the team
 * sees every one, a vendor only their own (row level security). Each one is emailed to the vendor
 * as it arrives (lib/enquiries-actions.ts); they reply from their own email.
 */

export type Enquiry = {
  id: string;
  vendorSlug: string;
  vendorName: string;
  name: string;
  email: string;
  phone?: string;
  /** "YYYY-MM-DD"; older ones "YYYY-MM", "Not decided" or "Not applicable" (weddingLabel in lib/enquiry-fields.ts reads them). */
  weddingDate?: string;
  /** An area code, or "Not decided". */
  region?: string;
  venue?: string;
  /** From the list in data/taxonomy.ts. */
  cultures: string[];
  /** Anything else about their cultures, in their words. */
  traditions?: string;
  /** How they found the vendor (SOURCES in lib/enquiry-fields.ts), and the search words or page. */
  source?: Source;
  sourceDetail?: string;
  guests?: string;
  languages?: string;
  message: string;
  /** Where the email went: the vendor, or the team when the listing had no email. Unset if it wasn't sent. */
  emailedTo?: string;
  readAt?: string;
  sentAt: string;
};

type State = { status: "loading" | "ready" | "error"; error?: string; list: Enquiry[] };

const loading: State = { status: "loading", list: [] };
const stores = new Map<string, { state: State; listeners: Set<() => void>; started: boolean }>();

const storeFor = (key: string) => {
  let s = stores.get(key);
  if (!s) stores.set(key, (s = { state: loading, listeners: new Set(), started: false }));
  return s;
};

function set(key: string, state: State) {
  const s = storeFor(key);
  s.state = state;
  s.listeners.forEach((l) => l());
}

async function load(key: string, slug?: string) {
  // Supabase returns at most 1000 rows a request, so read in pages until the last one comes up short.
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase()
      .from("enquiries")
      .select("id, name, email, phone, wedding_date, region, venue, cultures, traditions, guests, languages, message, source, source_detail, emailed_to, read_at, created_at, vendors!inner(name, slug)")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (slug) q = q.eq("vendors.slug", slug);
    const { data: page, error } = await q;
    if (error) return set(key, { status: "error", error: error.message, list: [] });
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  const data = rows;
  set(key, {
    status: "ready",
    list: data.map((e) => ({
      id: e.id,
      vendorSlug: e.vendors.slug,
      vendorName: e.vendors.name,
      name: e.name,
      email: e.email,
      phone: e.phone ?? undefined,
      weddingDate: e.wedding_date ?? undefined,
      region: e.region ?? undefined,
      venue: e.venue ?? undefined,
      cultures: e.cultures,
      traditions: e.traditions ?? undefined,
      source: (e.source as Source | null) ?? undefined,
      sourceDetail: e.source_detail ?? undefined,
      guests: e.guests ?? undefined,
      languages: e.languages ?? undefined,
      message: e.message,
      emailedTo: e.emailed_to ?? undefined,
      readAt: e.read_at ?? undefined,
      sentAt: e.created_at,
    })),
  });
}

/** Enquiries for one vendor (by slug), or every vendor's when no slug is given; null waits (the slug isn't known yet). */
export function useEnquiries(slug?: string | null) {
  const key = slug ?? "*";
  return useSyncExternalStore(
    (listener) => {
      if (slug === null) return () => {};
      const s = storeFor(key);
      s.listeners.add(listener);
      if (!s.started) {
        s.started = true;
        void load(key, slug);
      }
      return () => s.listeners.delete(listener);
    },
    () => (slug === null ? loading : storeFor(key).state),
    () => loading,
  );
}

function patch(id: string, change: Partial<Enquiry>) {
  for (const [key, s] of stores) set(key, { ...s.state, list: s.state.list.map((e) => (e.id === id ? { ...e, ...change } : e)) });
}

/** Mark an enquiry read, the first time its vendor opens it. */
export async function markEnquiryRead(id: string) {
  const at = new Date().toISOString();
  const { error } = await supabase().from("enquiries").update({ read_at: at }).eq("id", id);
  if (error) throw new Error(error.message);
  patch(id, { readAt: at });
}

export type ListedVendor = { slug: string; name: string; services: string[]; languages: string[]; areas: string[]; cover?: string; photos: number };

let listed: Promise<ListedVendor[]> | null = null;

/** Every published listing, for the team's enquiry insights: who's had none, and each vendor's category. Loaded once. */
export function loadListedVendors(): Promise<ListedVendor[]> {
  listed ??= Promise.resolve(
    supabase()
      .from("vendors")
      .select("slug, name, services, languages, service_area, vendor_photos(path, position)")
      .eq("status", "published")
      .order("name"),
  ).then(({ data, error }) => {
    if (error) {
      listed = null;
      throw new Error(error.message);
    }
    return data.map((v) => {
      const cover = [...v.vendor_photos].sort((a, b) => a.position - b.position)[0];
      return { slug: v.slug, name: v.name, services: v.services, languages: v.languages, areas: v.service_area, cover: cover && imageUrl("vendor-photos", variantPath(cover.path, 480)), photos: v.vendor_photos.length };
    });
  });
  return listed;
}
