import { useSyncExternalStore } from "react";
import { seedPosts, type Post } from "@/data/journal";
import type { Language, Service, StateCode } from "@/data/types";
import { alertDefs, type Channel } from "./alerts";
import type { TierId } from "./billing";
import { team as seedTeam, type Member } from "./people";

/*
 * Everything the demo lets you change: posts, added vendors, approvals, replies and settings.
 * It lives in localStorage, so it survives reloads and syncs across tabs (publish a post in one tab
 * and the landing page in another updates). The server renders the seed, and the browser's copy
 * takes over on hydration. In the full build this is the database.
 */

export type AddedVendor = {
  slug: string;
  name: string;
  person?: string;
  discipline: string;
  services: Service[];
  based?: string;
  serviceArea: StateCode[];
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

export type ListingEdit = Partial<Pick<AddedVendor, "name" | "person" | "discipline" | "lede" | "based" | "serviceArea" | "email" | "phone" | "website" | "instagram" | "facebook" | "languages" | "services">>;

export type AdminState = {
  posts: Post[];
  addedVendors: AddedVendor[];
  /** Applicants, Real Wedding submissions and reviews, by id. */
  decisions: Record<string, { verdict: "approved" | "declined"; at: string; note?: string }>;
  /** Failed charges retried successfully, by subscription id. */
  retried: Record<string, string>;
  /** Vendors who were sent a nudge from the at-risk list, by slug. */
  nudged: Record<string, string>;
  alerts: Record<string, Channel[]>;
  team: Member[];
  replies: Record<string, { at: string; text: string }>;
  listingEdits: Record<string, ListingEdit>;
  /** Notification ids that have been read. */
  read: string[];
};

const KEY = "emw-admin-v1";

export const seed: AdminState = {
  posts: seedPosts,
  addedVendors: [],
  decisions: {},
  retried: {},
  nudged: {},
  alerts: Object.fromEntries(alertDefs.map((a) => [a.id, a.defaults])),
  team: seedTeam,
  replies: {},
  listingEdits: {},
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

export function savePost(post: Post) {
  update((s) => ({
    posts: s.posts.some((p) => p.id === post.id) ? s.posts.map((p) => (p.id === post.id ? post : p)) : [post, ...s.posts],
  }));
}

export function deletePost(id: string) {
  update((s) => ({ posts: s.posts.filter((p) => p.id !== id) }));
}

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

export const publishedPosts = (posts: Post[]) => posts.filter((p) => p.status === "published").sort((a, b) => b.date.localeCompare(a.date));

export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
