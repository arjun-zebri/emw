import { useSyncExternalStore } from "react";
import type { AreaCode, Language, Service } from "@/data/types";
import type { TierId } from "./billing";

/*
 * What the portal keeps in this browser until it moves to the database: vendors added here, Real
 * Wedding and review decisions and read notifications.
 * It lives in localStorage, so it survives reloads and syncs across tabs. The server renders the
 * seed, and the browser's copy takes over on hydration. In the full build this is the database.
 */

export type AddedVendor = {
  slug: string;
  name: string;
  person?: string;
  discipline: string;
  services: Service[];
  based?: string;
  serviceArea: AreaCode[];
  languages: Language[];
  lede: string;
  email?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  tier: TierId;
  billing: "monthly" | "annual";
  /** Photos as resized data URLs (demo only). */
  photos: string[];
  added: string;
  via: "admin" | "application";
};

export type AdminState = {
  addedVendors: AddedVendor[];
  /** Real Wedding submissions and reviews, by id. */
  decisions: Record<string, { verdict: "approved" | "declined"; at: string; note?: string }>;
  /** Notification ids that have been read. */
  read: string[];
};

const KEY = "emw-admin-v1";

export const seed: AdminState = {
  addedVendors: [],
  decisions: {},
  read: [],
};

let state: AdminState | null = null;
const listeners = new Set<() => void>();

function load(): AdminState {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? { ...seed, ...JSON.parse(raw) } : seed;
  } catch {
    state = seed;
  }
  return state!;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed the demo: pick it up.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    state = null;
    listener();
  };
  addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    removeEventListener("storage", onStorage);
  };
}

export function update(fn: (s: AdminState) => Partial<AdminState>) {
  const current = load();
  state = { ...current, ...fn(current) };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full (large photos) or blocked: keep the change for this session only.
  }
  listeners.forEach((l) => l());
}

export function resetDemo() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  state = seed;
  listeners.forEach((l) => l());
}

export const useAdmin = () => useSyncExternalStore(subscribe, load, () => seed);

// ── Helpers ──────────────────────────────────────────────────────────────

export const nowIso = () => new Date().toISOString();

export function decide(id: string, verdict: "approved" | "declined", note?: string) {
  update((s) => ({ decisions: { ...s.decisions, [id]: { verdict, at: nowIso(), note } } }));
}

export function undecide(id: string) {
  update((s) => ({ decisions: Object.fromEntries(Object.entries(s.decisions).filter(([k]) => k !== id)) }));
}

export function addVendor(v: AddedVendor) {
  update((s) => ({ addedVendors: [v, ...s.addedVendors.filter((x) => x.slug !== v.slug)] }));
}

export function removeVendor(slug: string) {
  update((s) => ({ addedVendors: s.addedVendors.filter((x) => x.slug !== slug) }));
}

export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
