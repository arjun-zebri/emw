import { useSyncExternalStore } from "react";
import { blankContent, type PostContent, prepareJournalPhoto, uploadPrepared } from "@/lib/admin/journal";
import { type Photo, readBody, tidyBody } from "@/lib/journal/blocks";
import { refreshPages } from "@/lib/pages/actions";
import { PAGE_SLUGS, type PageSlug } from "@/lib/pages/pages";
import { supabase } from "@/lib/supabase/browser";
import type { Json } from "@/lib/supabase/database.types";
import { VARIANT_WIDTHS, variantPath } from "@/lib/supabase/storage";

/*
 * About, Shared commitment and the Privacy policy, for Admin → Pages: read and written in
 * site_pages as the signed-in team member, so row level security decides. A page has no drafts:
 * "Publish" writes it and the site shows it on the next visit. A save names the version it was
 * made against and is refused if the page changed elsewhere since, as the journal's are.
 *
 * The editor reuses the journal's (a page is held as a post's content, its extra fields unused).
 * Photos go to journal/pages/<slug>/; files the published page no longer uses are cleared on publish.
 */

export type SitePage = { slug: PageSlug; content: PostContent; updatedAt: string };

const db = () => supabase();
const folder = (slug: PageSlug) => `pages/${slug}`;
const filesOf = (path: string) => [path, ...VARIANT_WIDTHS.map((w) => variantPath(path, w))];

type Row = {
  slug: string;
  title: string;
  standfirst: string;
  cover_path: string | null;
  cover_alt: string;
  cover_width: number | null;
  cover_height: number | null;
  body: Json;
  description: string;
  updated_at: string;
};

const pageOf = (r: Row): SitePage => ({
  slug: r.slug as PageSlug,
  updatedAt: r.updated_at,
  content: {
    ...blankContent(),
    title: r.title,
    standfirst: r.standfirst,
    cover: r.cover_path ? { src: r.cover_path, alt: r.cover_alt, ...(r.cover_width && r.cover_height ? { w: r.cover_width, h: r.cover_height } : {}) } : null,
    body: readBody(r.body),
    description: r.description,
  },
});

// ── Reading: one shared copy of the three pages ─────────────────────────

type State = { status: "loading" | "ready" | "error"; pages?: SitePage[]; error?: string };
let state: State = { status: "loading" };
let started = false;
const listeners = new Set<() => void>();
const set = (s: State) => {
  state = s;
  listeners.forEach((l) => l());
};

/** Read the pages afresh. Returns them, or nothing if they couldn't be read. */
export async function loadPages() {
  const { data, error } = await db().from("site_pages").select("*");
  if (error) {
    set({ status: "error", error: error.message, pages: state.pages });
    return undefined;
  }
  const rows = data.map(pageOf);
  const pages = PAGE_SLUGS.flatMap((s) => rows.filter((p) => p.slug === s));
  set({ status: "ready", pages });
  return pages;
}

export const useSitePages = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      if (!started) {
        started = true;
        void loadPages();
      }
      return () => listeners.delete(l);
    },
    () => state,
    () => ({ status: "loading" }) as State,
  );

// ── Writing ─────────────────────────────────────────────────────────────

export class StalePageError extends Error {
  constructor() {
    super("This page was changed somewhere else after you opened it");
  }
}

const isLocal = (p: Photo | null | undefined) => !!p && /^(blob|data):/.test(p.src);

/** Put the page live with what the editor holds. Returns the saved page. */
export async function publishPage(page: SitePage, c: PostContent): Promise<SitePage> {
  if (isLocal(c.cover) || c.body.some((b) => b.type === "img" && b.images.some(isLocal))) throw new Error("Wait for the photos to finish uploading");
  const { data, error } = await db()
    .from("site_pages")
    .update({
      title: c.title.trim(),
      standfirst: c.standfirst.trim(),
      cover_path: c.cover?.src ?? null,
      cover_alt: c.cover?.alt.trim() ?? "",
      cover_width: c.cover?.w ?? null,
      cover_height: c.cover?.h ?? null,
      body: tidyBody(c.body) as unknown as Json,
      description: c.description.trim(),
    })
    .eq("slug", page.slug)
    .eq("updated_at", page.updatedAt)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new StalePageError();
  const saved = pageOf(data);
  set({ ...state, pages: state.pages?.map((p) => (p.slug === saved.slug ? saved : p)) });
  await refreshPages().catch(() => undefined);
  void clearUnused(saved);
  return saved;
}

const pathsIn = (c: PostContent) => [c.cover?.src, ...c.body.flatMap((b) => (b.type === "img" ? b.images.map((i) => i.src) : []))].filter((s): s is string => !!s);

/** Remove the page's own photos its published version no longer uses. */
async function clearUnused(page: SitePage) {
  const used = new Set(pathsIn(page.content).flatMap(filesOf));
  const bucket = db().storage.from("journal");
  const { data: files } = await bucket.list(folder(page.slug), { limit: 1000 });
  const unused = (files ?? []).map((f) => `${folder(page.slug)}/${f.name}`).filter((p) => !used.has(p));
  if (unused.length) await bucket.remove(unused);
}

export const preparePagePhoto = prepareJournalPhoto;

/** Upload a prepared photo to the page's folder. */
export const uploadPagePhoto = (slug: PageSlug, prepared: Awaited<ReturnType<typeof prepareJournalPhoto>>, alt = "") => uploadPrepared(folder(slug), prepared, alt);
