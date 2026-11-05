import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase/browser";

/*
 * Enquiries couples send from vendor pages, read from Supabase as the signed-in person: the team
 * sees every one, a vendor only their own (row level security). There's no email sending yet, so
 * a reply is written in the vendor's own email and then marked as replied here.
 */

export type Enquiry = {
  id: string;
  vendorSlug: string;
  vendorName: string;
  name: string;
  email: string;
  phone?: string;
  weddingDate?: string;
  message: string;
  readAt?: string;
  repliedAt?: string;
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
  let q = supabase()
    .from("enquiries")
    .select("id, name, email, phone, wedding_date, message, read_at, replied_at, created_at, vendors!inner(name, slug)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (slug) q = q.eq("vendors.slug", slug);
  const { data, error } = await q;
  if (error) return set(key, { status: "error", error: error.message, list: [] });
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
      message: e.message,
      readAt: e.read_at ?? undefined,
      repliedAt: e.replied_at ?? undefined,
      sentAt: e.created_at,
    })),
  });
}

/** Enquiries for one vendor (by slug), or every vendor's when no slug is given. */
export function useEnquiries(slug?: string) {
  const key = slug ?? "*";
  return useSyncExternalStore(
    (listener) => {
      const s = storeFor(key);
      s.listeners.add(listener);
      if (!s.started) {
        s.started = true;
        void load(key, slug);
      }
      return () => s.listeners.delete(listener);
    },
    () => storeFor(key).state,
    () => loading,
  );
}

function patch(id: string, change: Partial<Enquiry>) {
  for (const [key, s] of stores) set(key, { ...s.state, list: s.state.list.map((e) => (e.id === id ? { ...e, ...change } : e)) });
}

/** Mark an enquiry read (the first time it's opened) or replied. */
export async function markEnquiry(id: string, field: "read" | "replied") {
  const at = new Date().toISOString();
  const { error } = await supabase()
    .from("enquiries")
    .update(field === "read" ? { read_at: at } : { replied_at: at })
    .eq("id", id);
  if (error) throw new Error(error.message);
  patch(id, field === "read" ? { readAt: at } : { repliedAt: at });
}
