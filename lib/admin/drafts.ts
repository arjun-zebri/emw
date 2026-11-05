import { useSyncExternalStore } from "react";
import type { Language, Service, StateCode } from "@/data/types";
import { supabase } from "@/lib/supabase/browser";
import { imageUrl } from "@/lib/supabase/storage";

/*
 * Draft vendors waiting for the team's approval, read from Supabase as the signed-in team member
 * (row level security only shows drafts to the team). Approving publishes the listing, declining
 * hides it; either can be undone, which puts it back to draft. Unlike the rest of the portal this
 * is real data, not the demo store.
 */

export type DraftPhoto = { src: string; width: number | null; height: number | null };

export type Draft = {
  id: string;
  slug: string;
  name: string;
  person?: string;
  discipline: string;
  services: Service[];
  languages: Language[];
  serviceArea: StateCode[];
  story: string[];
  email?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  photos: DraftPhoto[];
  submitted: string;
};

export type Verdict = "approved" | "declined";
type Decided = { draft: Draft; verdict: Verdict; at: string };
type State = { status: "idle" | "loading" | "ready" | "error"; error?: string; drafts: Draft[]; decided: Decided[] };

const empty: State = { status: "idle", drafts: [], decided: [] };
let state: State = empty;
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

const opt = (s: string | null) => s ?? undefined;

async function load() {
  set({ status: "loading", error: undefined });
  const { data, error } = await supabase()
    .from("vendors")
    .select("id, slug, name, person, discipline, services, languages, service_area, story, email, phone, website, instagram, facebook, created_at, vendor_photos(path, width, height, position)")
    .eq("status", "draft")
    .order("name");
  if (error) return set({ status: "error", error: error.message });
  const drafts = data.map(
    (v): Draft => ({
      id: v.id,
      slug: v.slug,
      name: v.name,
      person: opt(v.person),
      discipline: v.discipline,
      services: v.services as Service[],
      languages: v.languages as Language[],
      serviceArea: v.service_area as StateCode[],
      story: v.story,
      email: opt(v.email),
      phone: opt(v.phone),
      website: opt(v.website),
      instagram: opt(v.instagram),
      facebook: opt(v.facebook),
      photos: [...v.vendor_photos].sort((a, b) => a.position - b.position).map((p) => ({ src: imageUrl("vendor-photos", p.path), width: p.width, height: p.height })),
      submitted: v.created_at,
    }),
  );
  set({ status: "ready", drafts });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (state.status === "idle") void load();
  return () => listeners.delete(listener);
}

export const useDrafts = () => useSyncExternalStore(subscribe, () => state, () => empty);

export const reloadDrafts = () => load();

async function setStatus(id: string, status: "draft" | "published" | "hidden") {
  const { error } = await supabase().from("vendors").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Publish (approve) or hide (decline) a draft. Resolves once the database has it. */
export async function decideDraft(draft: Draft, verdict: Verdict) {
  await setStatus(draft.id, verdict === "approved" ? "published" : "hidden");
  set({
    drafts: state.drafts.filter((d) => d.id !== draft.id),
    decided: [{ draft, verdict, at: new Date().toISOString() }, ...state.decided.filter((d) => d.draft.id !== draft.id)],
  });
}

/** Put a decided vendor back in the queue as a draft. */
export async function undoDraft(draft: Draft) {
  await setStatus(draft.id, "draft");
  set({
    drafts: [...state.drafts, draft].sort((a, b) => a.name.localeCompare(b.name)),
    decided: state.decided.filter((d) => d.draft.id !== draft.id),
  });
}
