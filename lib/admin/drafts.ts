import { useSyncExternalStore } from "react";
import type { AreaCode, Language, Service } from "@/data/types";
import { notifyApproved } from "@/lib/email/actions";
import { refreshListings } from "@/lib/listings-actions";
import { supabase } from "@/lib/supabase/browser";
import { imageUrl } from "@/lib/supabase/storage";

/*
 * The approval queue: draft vendors waiting for the team, read from Supabase as the signed-in team
 * member (row level security only shows drafts to the team). Unlike the rest of the portal this is
 * real data, not the demo store.
 *
 * The list pages through the vendor_queue view, 30 at a time, already split into "ready" and
 * "missing data", searched, filtered and sorted by the database. A draft's full record (profile,
 * every photo, research notes) is fetched when it's opened. Decisions go through decide_vendor,
 * which changes the status and records who decided, when and why in one step.
 */

export const PAGE = 30;

export type QueueTab = "ready" | "missing";
export type Missing = "no-photos" | "no-category" | "no-profile" | "no-contact";
export type Flag = "small-photos" | "one-photo" | "low-confidence" | "website-down" | "interstate";
export type Sort = "ready" | "name" | "newest";
export type Query = { tab: QueueTab; q: string; flags: Flag[]; sort: Sort };

export const missingLabels: Record<Missing, string> = {
  "no-photos": "No photos",
  "no-category": "No category",
  "no-profile": "No profile",
  "no-contact": "No contact details",
};

export const flagLabels: Record<Flag, { label: string; detail: string }> = {
  "small-photos": { label: "Small photos", detail: "At least one photo is under 1200px on its long edge, so it will look soft on a large screen." },
  "one-photo": { label: "One photo", detail: "Only one photo, so the listing is the cover and nothing else." },
  "low-confidence": { label: "Low confidence", detail: "The research rests on the email address or business name alone." },
  "website-down": { label: "Website down", detail: "The research found their website wasn't working." },
  interstate: { label: "Maybe interstate", detail: "The research suggests they may have moved out of Victoria." },
};

export type QueueRow = {
  id: string;
  slug: string;
  name: string;
  discipline: string;
  cover?: string;
  photoCount: number;
  confidence?: "High" | "Medium" | "Low";
  missing: Missing[];
  flags: Flag[];
  submitted: string;
};

/** What the research spreadsheet found, for the person approving. Team only (vendor_review_notes). */
export type ReviewNotes = {
  confidence?: "High" | "Medium" | "Low";
  notes: string;
  yearsAttended?: string;
  categoriesOriginal?: string;
  registeredEmails?: string;
  source: string;
};

export type DraftPhoto = { id: string; src: string; width: number | null; height: number | null };

export type Draft = QueueRow & {
  person?: string;
  services: Service[];
  languages: Language[];
  serviceArea: AreaCode[];
  story: string[];
  /** A double-width tile in the directory, chosen by the team. */
  largeTile: boolean;
  /** Pinned to the home page's "Meet some of our vendors" row, chosen by the team (`vendors.featured`). */
  featured: boolean;
  email?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  photos: DraftPhoto[];
  review?: ReviewNotes;
};

export type Verdict = "approved" | "declined" | "reopened";
export type Decision = { id: string; vendorId: string; vendorName: string; verdict: Verdict; note: string; by?: string; at: string; latest: boolean };

type List = { rows: QueueRow[]; total: number | null; loading: boolean; done: boolean; error?: string };
type State = {
  started: boolean;
  counts: { ready: number; missing: number } | null;
  query: Query;
  list: List;
  details: Record<string, Draft>;
  decisions: Decision[];
};

const emptyList: List = { rows: [], total: null, loading: false, done: false };
const initial: State = { started: false, counts: null, query: { tab: "ready", q: "", flags: [], sort: "ready" }, list: emptyList, details: {}, decisions: [] };
let state: State = initial;
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

const opt = <T>(s: T | null) => s ?? undefined;
const db = () => supabase();

// ── Reading ─────────────────────────────────────────────────────────────

const ROW = "id, slug, name, discipline, cover_path, photo_count, confidence, missing, flags, created_at";
type ViewRow = { id: string; slug: string; name: string; discipline: string; cover_path: string | null; photo_count: number; confidence: QueueRow["confidence"] | null; missing: string[]; flags: string[]; created_at: string };

const toRow = (v: ViewRow): QueueRow => ({
  id: v.id,
  slug: v.slug,
  name: v.name,
  discipline: v.discipline,
  cover: v.cover_path ? imageUrl("vendor-photos", v.cover_path) : undefined,
  photoCount: v.photo_count,
  confidence: opt(v.confidence),
  missing: v.missing as Missing[],
  flags: v.flags as Flag[],
  submitted: v.created_at,
});

async function loadCounts() {
  const count = (missing: boolean) => {
    const q = db().from("vendor_queue").select("id", { count: "exact", head: true }).eq("status", "draft");
    return missing ? q.not("missing", "eq", "{}") : q.filter("missing", "eq", "{}");
  };
  const [ready, missing] = await Promise.all([count(false), count(true)]);
  if (ready.error || missing.error) return;
  set({ counts: { ready: ready.count ?? 0, missing: missing.count ?? 0 } });
}

// Each new query bumps the token, so a slow page from an old search can't land in a new list.
let token = 0;

async function loadPage() {
  const { query, list } = state;
  if (list.loading || list.done) return;
  const mine = token;
  set({ list: { ...list, loading: true, error: undefined } });
  let q = db().from("vendor_queue").select(ROW, { count: "exact" }).eq("status", "draft");
  q = query.tab === "ready" ? q.filter("missing", "eq", "{}") : q.not("missing", "eq", "{}");
  const term = query.q.trim().replace(/[%,()*]/g, " ").trim();
  if (term) q = q.or(`name.ilike.%${term}%,discipline.ilike.%${term}%`);
  if (query.flags.length) q = q.contains("flags", query.flags);
  q =
    query.sort === "name"
      ? q.order("name")
      : query.sort === "newest"
        ? q.order("created_at", { ascending: false }).order("name")
        : q.order("readiness", { ascending: false }).order("name");
  const from = list.rows.length;
  const { data, count, error } = await q.range(from, from + PAGE - 1);
  if (mine !== token) return;
  if (error) return set({ list: { ...state.list, loading: false, error: error.message } });
  const rows = [...state.list.rows, ...data.map(toRow)];
  set({ list: { rows, total: count, loading: false, done: data.length < PAGE || rows.length >= (count ?? 0) } });
}

async function loadDecisions() {
  const { data, error } = await db()
    .from("vendor_decisions")
    .select("id, vendor_id, verdict, note, created_at, vendors(name), team_members(name)")
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) return;
  const seen = new Set<string>();
  set({
    decisions: data.map((d) => {
      const latest = !seen.has(d.vendor_id);
      seen.add(d.vendor_id);
      return { id: d.id, vendorId: d.vendor_id, vendorName: d.vendors?.name ?? "A vendor", verdict: d.verdict, note: d.note, by: opt(d.team_members?.name ?? null), at: d.created_at, latest };
    }),
  });
}

function start() {
  if (state.started) return;
  set({ started: true });
  void loadCounts();
  void loadPage();
  void loadDecisions();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => listeners.delete(listener);
}

export const useQueue = () => useSyncExternalStore(subscribe, () => state, () => initial);

/** Change the tab, search, filters or sort; the list starts again from the first page. */
export function setQuery(next: Partial<Query>) {
  const query = { ...state.query, ...next };
  if (JSON.stringify(query) === JSON.stringify(state.query)) return;
  token++;
  set({ query, list: emptyList });
  void loadPage();
}

export const loadMore = () => loadPage();

export function retry() {
  token++;
  set({ list: emptyList });
  void loadCounts();
  void loadPage();
}

const detailLoading = new Set<string>();

/** The full record of one draft, fetched the first time it's opened. */
export async function loadDraft(id: string) {
  if (state.details[id] || detailLoading.has(id)) return;
  detailLoading.add(id);
  const [vendor, row, notes] = await Promise.all([
    db()
      .from("vendors")
      .select("id, person, services, languages, service_area, story, large_tile, featured, email, phone, website, instagram, facebook, vendor_photos(id, path, width, height, position)")
      .eq("id", id)
      .single(),
    db().from("vendor_queue").select(ROW).eq("id", id).single(),
    db().from("vendor_review_notes").select("confidence, notes, years_attended, categories_original, registered_emails, source").eq("vendor_id", id).maybeSingle(),
  ]);
  detailLoading.delete(id);
  if (vendor.error || row.error) return;
  const v = vendor.data;
  const n = notes.data;
  const draft: Draft = {
    ...toRow(row.data),
    person: opt(v.person),
    services: v.services as Service[],
    languages: v.languages as Language[],
    serviceArea: v.service_area as AreaCode[],
    story: v.story,
    largeTile: v.large_tile,
    featured: v.featured,
    email: opt(v.email),
    phone: opt(v.phone),
    website: opt(v.website),
    instagram: opt(v.instagram),
    facebook: opt(v.facebook),
    photos: [...v.vendor_photos].sort((a, b) => a.position - b.position).map((p) => ({ id: p.id, src: imageUrl("vendor-photos", p.path), width: p.width, height: p.height })),
    review: n
      ? { confidence: opt(n.confidence), notes: n.notes, yearsAttended: opt(n.years_attended), categoriesOriginal: opt(n.categories_original), registeredEmails: opt(n.registered_emails), source: n.source }
      : undefined,
  };
  set({ details: { ...state.details, [id]: draft } });
}

// ── Deciding ────────────────────────────────────────────────────────────

async function rpc(vendor: string, verdict: Verdict, note = "") {
  const { error } = await db().rpc("decide_vendor", { vendor, verdict, note });
  if (error) throw new Error(error.message);
  // The listing goes live (or comes down) on the public pages straight away.
  await refreshListings().catch(() => undefined);
}

/** Approve (publish) or decline (hide) a draft, with an optional reason. Resolves once it's saved. */
export async function decide(row: QueueRow, verdict: "approved" | "declined", note = "") {
  await rpc(row.id, verdict, note.trim());
  // "Your listing is live". Off until EMAILS.approved is switched on.
  if (verdict === "approved") void notifyApproved(row.id).catch(() => undefined);
  const tab = row.missing.length ? "missing" : "ready";
  set({
    list: { ...state.list, rows: state.list.rows.filter((r) => r.id !== row.id), total: state.list.total === null ? null : state.list.total - 1 },
    counts: state.counts && { ...state.counts, [tab]: Math.max(0, state.counts[tab] - 1) },
  });
  void loadDecisions();
}

/** Undo a decision: the vendor goes back in the queue as a draft. */
export async function reopen(vendorId: string) {
  await rpc(vendorId, "reopened");
  token++;
  set({ list: emptyList });
  await Promise.all([loadCounts(), loadPage(), loadDecisions()]);
}

// ── Placement: directory tile, home page pin ────────────────────────────

const placementColumn = { largeTile: "large_tile", featured: "featured" } as const;

/**
 * Turn one of the team's placement switches on or off: a double-width tile in the directory, or a
 * pin to the home page's vendor row. Shows at once; goes back if the database refuses.
 */
export async function setPlacement(draft: Draft, key: keyof typeof placementColumn, on: boolean) {
  const patch = (value: boolean) => {
    const d = state.details[draft.id];
    if (d) set({ details: { ...state.details, [draft.id]: { ...d, [key]: value } } });
  };
  patch(on);
  const { error } = await db()
    .from("vendors")
    .update({ [placementColumn[key]]: on } as Record<(typeof placementColumn)[keyof typeof placementColumn], boolean>)
    .eq("id", draft.id);
  if (error) {
    patch(!on);
    throw new Error(error.message);
  }
  await refreshListings().catch(() => undefined);
}

// ── Photos ──────────────────────────────────────────────────────────────

function patchPhotos(id: string, photos: DraftPhoto[]) {
  const draft = state.details[id];
  if (!draft) return;
  set({
    details: { ...state.details, [id]: { ...draft, photos, cover: photos[0]?.src } },
    list: { ...state.list, rows: state.list.rows.map((r) => (r.id === id ? { ...r, cover: photos[0]?.src } : r)) },
  });
}

// Saves run one after another, so quick successive moves land in the order they were made.
let saving: Promise<unknown> = Promise.resolve();

/**
 * Put a draft's photos in a new order; the first is the cover. The screen updates straight away
 * and goes back to the previous order if the database refuses.
 */
export function reorderPhotos(draft: Draft, photos: DraftPhoto[]) {
  const before = state.details[draft.id]?.photos ?? draft.photos;
  patchPhotos(draft.id, photos);
  const run = saving.then(async () => {
    const results = await Promise.all(
      photos.map((p, i) =>
        db()
          .from("vendor_photos")
          .update({ position: i, alt: i === 0 ? draft.name : `${draft.name}, photo ${i + 1}` })
          .eq("id", p.id),
      ),
    );
    const failed = results.find((r) => r.error)?.error;
    if (failed) {
      patchPhotos(draft.id, before);
      throw new Error(failed.message);
    }
  });
  saving = run.catch(() => {});
  return run;
}
