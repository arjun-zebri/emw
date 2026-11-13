import { useSyncExternalStore } from "react";
import { PhotoError, preparePhoto } from "@/lib/apply/photos";
import { refreshJournal } from "@/lib/journal/actions";
import { type Block, type Category, categoryOf, DEFAULT_CATEGORY, type Photo, readBody, SLUG, slugify, tidyBody } from "@/lib/journal/blocks";
import { supabase } from "@/lib/supabase/browser";
import type { Json } from "@/lib/supabase/database.types";
import { imageUrl, VARIANT_WIDTHS, variantPath } from "@/lib/supabase/storage";

/*
 * The journal, for the admin: read and written in Supabase as the signed-in team member, so row
 * level security decides what they reach.
 *
 * A draft saves into its own row as it's written. A post that is live saves into
 * post_edits instead, so couples keep reading the published version until someone presses
 * "Publish changes"; then the edit is copied into the post and deleted. Every save names the
 * version it was made against, and is refused if the post changed elsewhere since (another tab,
 * another person), so two people never quietly overwrite each other.
 *
 * Photos go up as soon as they're added, prepared in the browser like a listing's (upright, JPEG,
 * 2000px plus the 1200 and 480 copies), to journal/<post id>/<random>.jpg.
 * Files no version of the post uses any more are cleared when it's published, discarded or deleted.
 */

export type PostStatus = "draft" | "scheduled" | "published";

/** Everything the editor writes. */
export type PostContent = {
  title: string;
  standfirst: string;
  category: Category;
  cover: Photo | null;
  body: Block[];
  description: string;
  author: string;
  slug: string;
  /** Vendors credited, by id, in order. */
  vendors: string[];
};

export type JournalPost = {
  id: string;
  status: PostStatus;
  /** When it went (or goes) live. */
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  oldSlugs: string[];
  /** What's in the post's own row: the live version, or the draft itself. */
  saved: PostContent;
  /** Unpublished changes to a live or scheduled post. */
  edits: { content: PostContent; updatedAt: string } | null;
};

export type ListedPost = {
  id: string;
  status: PostStatus;
  publishedAt: string | null;
  updatedAt: string;
  title: string;
  slug: string;
  category: Category;
  cover: Photo | null;
  author: string;
  standfirst: string;
  hasEdits: boolean;
  credits: number;
};

export type CreditVendor = { id: string; slug: string; name: string; discipline: string; photo?: string };

const db = () => supabase();
const MIN_PHOTO = 800;
export const DEFAULT_AUTHOR = "East Meets Wed";

const filesOf = (path: string) => [path, ...VARIANT_WIDTHS.map((w) => variantPath(path, w))];

export const blankContent = (): PostContent => ({
  title: "",
  standfirst: "",
  category: DEFAULT_CATEGORY,
  cover: null,
  body: [],
  description: "",
  author: DEFAULT_AUTHOR,
  slug: "",
  vendors: [],
});

/** The effective status: a scheduled post whose time has passed is live. */
export const statusOf = (p: { status: PostStatus; publishedAt: string | null }, now = Date.now()): PostStatus =>
  p.status === "scheduled" && p.publishedAt && Date.parse(p.publishedAt) <= now ? "published" : p.status;

// ── Reading ─────────────────────────────────────────────────────────────

type Row = {
  id: string;
  slug: string;
  old_slugs: string[];
  title: string;
  standfirst: string;
  category: string;
  cover_path: string | null;
  cover_alt: string;
  cover_width: number | null;
  cover_height: number | null;
  body: Json;
  description: string;
  author: string;
  status: PostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const contentOf = (r: Row, vendors: string[]): PostContent => ({
  title: r.title,
  standfirst: r.standfirst,
  category: categoryOf(r.category),
  cover: r.cover_path
    ? { src: r.cover_path, alt: r.cover_alt, ...(r.cover_width && r.cover_height ? { w: r.cover_width, h: r.cover_height } : {}) }
    : null,
  body: readBody(r.body),
  description: r.description,
  author: r.author,
  slug: r.slug,
  vendors,
});

/** Edits as stored, read defensively: anything missing falls back to the live version. */
function readContent(raw: Json, fallback: PostContent): PostContent {
  const o = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const s = (k: keyof PostContent) => (typeof o[k] === "string" ? (o[k] as string) : (fallback[k] as string));
  const cover = o.cover && typeof o.cover === "object" ? (o.cover as Photo) : o.cover === null ? null : fallback.cover;
  return {
    title: s("title"),
    standfirst: s("standfirst"),
    category: categoryOf(s("category")),
    cover: cover && typeof cover.src === "string" ? cover : null,
    body: Array.isArray(o.body) ? readBody(o.body) : fallback.body,
    description: s("description"),
    author: s("author"),
    slug: s("slug"),
    vendors: Array.isArray(o.vendors) ? o.vendors.filter((v): v is string => typeof v === "string") : fallback.vendors,
  };
}

type Loadable<T> = { status: "loading" | "ready" | "error"; data?: T; error?: string };

/** A tiny store per key: loaded on first use, re-read on demand, shared by every component. */
function store<T>(fetcher: (key: string) => Promise<T>) {
  const entries = new Map<string, { state: Loadable<T>; listeners: Set<() => void>; started: boolean }>();
  const LOADING: Loadable<T> = { status: "loading" };
  const entry = (key: string) => {
    let e = entries.get(key);
    if (!e) entries.set(key, (e = { state: LOADING, listeners: new Set(), started: false }));
    return e;
  };
  const set = (key: string, state: Loadable<T>) => {
    const e = entry(key);
    e.state = state;
    e.listeners.forEach((l) => l());
  };
  const load = async (key: string) => {
    try {
      set(key, { status: "ready", data: await fetcher(key) });
    } catch (e) {
      set(key, { status: "error", error: (e as Error).message, data: entry(key).state.data });
    }
  };
  const use = (key: string | null) =>
    useSyncExternalStore(
      (listener) => {
        if (!key) return () => {};
        const e = entry(key);
        e.listeners.add(listener);
        if (!e.started) {
          e.started = true;
          void load(key);
        }
        return () => e.listeners.delete(listener);
      },
      () => (key ? entry(key).state : LOADING),
      () => LOADING,
    );
  return { use, load, set, peek: (key: string) => entries.get(key)?.state.data, forget: (key: string) => entries.delete(key) };
}

const POST_COLUMNS =
  "id, slug, old_slugs, title, standfirst, category, cover_path, cover_alt, cover_width, cover_height, body, description, author, status, published_at, created_at, updated_at";

const posts = store<JournalPost | null>(async (id) => {
  const { data, error } = await db()
    .from("posts")
    .select(`${POST_COLUMNS}, post_vendors(vendor_id, position), post_edits(data, updated_at)`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const vendors = [...data.post_vendors].sort((a, b) => a.position - b.position).map((v) => v.vendor_id);
  const saved = contentOf(data, vendors);
  const edit = data.post_edits;
  return {
    id: data.id,
    status: data.status,
    publishedAt: data.published_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    oldSlugs: data.old_slugs,
    saved,
    edits: edit ? { content: readContent(edit.data, saved), updatedAt: edit.updated_at } : null,
  };
});

const list = store<{ posts: ListedPost[]; reads: Record<string, { views: number; last30: number }> }>(async () => {
  const [{ data, error }, reads] = await Promise.all([
    db().from("posts").select(`${POST_COLUMNS}, post_vendors(vendor_id), post_edits(updated_at)`).order("updated_at", { ascending: false }),
    db().rpc("post_reads"),
  ]);
  if (error) throw new Error(error.message);
  return {
    posts: data.map((r) => {
      const c = contentOf(r, []);
      return {
        id: r.id,
        status: r.status,
        publishedAt: r.published_at,
        updatedAt: r.post_edits?.updated_at && r.post_edits.updated_at > r.updated_at ? r.post_edits.updated_at : r.updated_at,
        title: c.title,
        slug: c.slug,
        category: c.category,
        cover: c.cover,
        author: c.author,
        standfirst: c.standfirst,
        hasEdits: !!r.post_edits,
        credits: r.post_vendors.length,
      };
    }),
    // The figures are a nicety: without them (a hiccup, or before analytics existed) the list still shows.
    reads: Object.fromEntries((reads.data ?? []).map((r) => [r.slug, { views: Number(r.views), last30: Number(r.last_30) }])),
  };
});

const vendorsStore = store<CreditVendor[]>(async () => {
  const { data, error } = await db()
    .from("vendors")
    .select("id, slug, name, discipline, vendor_photos(path, position)")
    .eq("status", "published")
    .order("name");
  if (error) throw new Error(error.message);
  return data.map((v) => {
    const first = [...v.vendor_photos].sort((a, b) => a.position - b.position)[0];
    return { id: v.id, slug: v.slug, name: v.name, discipline: v.discipline, photo: first && imageUrl("vendor-photos", first.path) };
  });
});

export const useJournal = () => list.use("all");
export const refreshList = () => list.load("all");
export const usePost = (id: string | null) => posts.use(id);
export const reloadPost = (id: string) => posts.load(id);
/** The post as last read or saved, for a save that must name the version it builds on. */
export const peekPost = (id: string) => posts.peek(id) ?? null;
/** Published vendors, for credits and links. */
export const useCreditVendors = () => vendorsStore.use("all");

// ── Writing ─────────────────────────────────────────────────────────────

/** A post changed somewhere else after the editor opened it: nothing was written. */
export class StaleError extends Error {
  constructor() {
    super("This post was changed somewhere else after you opened it");
  }
}

/** The address is taken by another post. */
export class SlugTakenError extends Error {
  constructor(slug: string) {
    super(`Another post already uses /journal/${slug}`);
  }
}

const placeholderSlug = () => `draft-${crypto.randomUUID().slice(0, 8)}`;

/** The address to store: the one chosen, or one from the title, or a placeholder until there's a title. */
const slugFor = (c: PostContent) => (SLUG.test(c.slug) ? c.slug : slugify(c.title) || placeholderSlug());

const columnsOf = (c: PostContent) => ({
  title: c.title.trim(),
  standfirst: c.standfirst.trim(),
  category: categoryOf(c.category),
  cover_path: c.cover && !/^(blob|data):/.test(c.cover.src) ? c.cover.src : null,
  cover_alt: c.cover?.alt.trim() ?? "",
  cover_width: c.cover?.w ?? null,
  cover_height: c.cover?.h ?? null,
  body: tidyBody(c.body) as unknown as Json,
  description: c.description.trim(),
  author: c.author.trim(),
  slug: slugFor(c),
});

async function writeCredits(postId: string, vendors: string[]) {
  const { error: del } = await db().from("post_vendors").delete().eq("post_id", postId);
  if (del) throw new Error(del.message);
  const unique = [...new Set(vendors)];
  if (!unique.length) return;
  const { error } = await db()
    .from("post_vendors")
    .insert(unique.map((vendor_id, position) => ({ post_id: postId, vendor_id, position })));
  if (error) throw new Error(error.message);
}

const isSlugClash = (e: { code?: string; message: string } | null) => e?.code === "23505" && /slug/.test(e.message);

/** Start a new draft from what's been written so far. Returns its id. */
export async function createPost(content: PostContent): Promise<string> {
  const row = columnsOf(content);
  let { data, error } = await db().from("posts").insert({ ...row, status: "draft" }).select("id").single();
  // A title another post already has: keep writing under a placeholder address for now.
  if (isSlugClash(error)) ({ data, error } = await db().from("posts").insert({ ...row, slug: placeholderSlug(), status: "draft" }).select("id").single());
  if (error || !data) throw new Error(error?.message ?? "Couldn’t start the post");
  await writeCredits(data.id, content.vendors);
  await posts.load(data.id);
  void refreshList();
  return data.id;
}

/**
 * Save what the editor holds. A draft is written into its row; a live or scheduled post into its
 * edits. Returns whether the address had to wait (taken by another post).
 */
export async function saveContent(post: JournalPost, content: PostContent): Promise<{ slugTaken: boolean }> {
  if (post.status === "draft") {
    const row = columnsOf(content);
    let { data, error } = await db().from("posts").update(row).eq("id", post.id).eq("updated_at", post.updatedAt).select("updated_at").maybeSingle();
    let slugTaken = false;
    if (isSlugClash(error)) {
      slugTaken = true;
      ({ data, error } = await db()
        .from("posts")
        .update({ ...row, slug: post.saved.slug })
        .eq("id", post.id)
        .eq("updated_at", post.updatedAt)
        .select("updated_at")
        .maybeSingle());
    }
    if (error) throw new Error(error.message);
    if (!data) throw new StaleError();
    await writeCredits(post.id, content.vendors);
    posts.set(post.id, {
      status: "ready",
      data: { ...post, updatedAt: data.updated_at, saved: { ...content, slug: slugTaken ? post.saved.slug : row.slug } },
    });
    return { slugTaken };
  }

  // Edits keep the post as written (empty blocks too, so the editor reopens as it was), less any
  // photo still uploading.
  const local = (p: Photo | null) => !!p && /^(blob|data):/.test(p.src);
  const data = {
    ...content,
    cover: local(content.cover) ? null : content.cover,
    body: content.body.flatMap((b): Block[] => {
      if (b.type !== "img") return [b];
      const images = b.images.filter((p) => !local(p));
      return images.length ? [{ ...b, images }] : [];
    }),
  } as unknown as Json;
  if (post.edits) {
    const { data: row, error } = await db()
      .from("post_edits")
      .update({ data })
      .eq("post_id", post.id)
      .eq("updated_at", post.edits.updatedAt)
      .select("updated_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new StaleError();
    posts.set(post.id, { status: "ready", data: { ...post, edits: { content, updatedAt: row.updated_at } } });
  } else {
    const { data: row, error } = await db().from("post_edits").insert({ post_id: post.id, data }).select("updated_at").single();
    // Someone else started editing it first.
    if (error?.code === "23505") throw new StaleError();
    if (error) throw new Error(error.message);
    posts.set(post.id, { status: "ready", data: { ...post, edits: { content, updatedAt: row.updated_at } } });
  }
  return { slugTaken: false };
}

/** Has anyone else changed the post (or its edits) since the editor loaded it? */
async function changedElsewhere(post: JournalPost) {
  const { data } = await db().from("posts").select("updated_at, post_edits(updated_at)").eq("id", post.id).maybeSingle();
  if (!data) return true;
  return data.updated_at !== post.updatedAt || (data.post_edits?.updated_at ?? null) !== (post.edits?.updatedAt ?? null);
}

/**
 * Put the post live with what the editor holds. A post already live keeps its first publish date;
 * an address changed on a live post keeps the old one working.
 */
export async function publishPost(post: JournalPost, content: PostContent) {
  if (!content.title.trim()) throw new Error("Give the post a title first");
  if (await changedElsewhere(post)) throw new StaleError();
  const row = columnsOf(content);
  const wasLive = statusOf(post) === "published";
  const when = wasLive && post.publishedAt ? post.publishedAt : new Date().toISOString();
  const oldSlugs = wasLive && post.saved.slug !== row.slug ? [...new Set([...post.oldSlugs, post.saved.slug])].filter((s) => s !== row.slug) : post.oldSlugs;

  const { data, error } = await db()
    .from("posts")
    .update({ ...row, old_slugs: oldSlugs, status: "published", published_at: when })
    .eq("id", post.id)
    .eq("updated_at", post.updatedAt)
    .select("id")
    .maybeSingle();
  if (isSlugClash(error)) throw new SlugTakenError(row.slug);
  if (error) throw new Error(error.message);
  if (!data) throw new StaleError();
  await writeCredits(post.id, content.vendors);
  await db().from("post_edits").delete().eq("post_id", post.id);
  await afterChange(post.id);
  return { slug: row.slug };
}

/** Take a post out of the journal. Unpublished changes come with it into the draft. */
export async function unpublishPost(post: JournalPost) {
  if (await changedElsewhere(post)) throw new StaleError();
  const content = post.edits?.content ?? post.saved;
  const { error } = await db()
    .from("posts")
    .update({ ...columnsOf(content), status: "draft", published_at: null })
    .eq("id", post.id);
  if (error) throw new Error(error.message);
  await writeCredits(post.id, content.vendors);
  await db().from("post_edits").delete().eq("post_id", post.id);
  await afterChange(post.id);
}

/** Throw away unpublished changes, back to what's live. */
export async function discardEdits(post: JournalPost) {
  const { error } = await db().from("post_edits").delete().eq("post_id", post.id);
  if (error) throw new Error(error.message);
  await posts.load(post.id);
  await clearUnused(post.id);
  void refreshList();
}

export async function deletePost(post: JournalPost) {
  const live = statusOf(post) !== "draft";
  const { error } = await db().from("posts").delete().eq("id", post.id);
  if (error) throw new Error(error.message);
  const { data: files } = await db().storage.from("journal").list(post.id, { limit: 1000 });
  if (files?.length) await db().storage.from("journal").remove(files.map((f) => `${post.id}/${f.name}`));
  posts.set(post.id, { status: "ready", data: null });
  void refreshList();
  if (live) await refreshJournal().catch(() => undefined);
}

async function afterChange(id: string) {
  await posts.load(id);
  await clearUnused(id);
  void refreshList();
  await refreshJournal().catch(() => undefined);
}

// ── Photos ──────────────────────────────────────────────────────────────

const pathsIn = (c: PostContent) => [c.cover?.src, ...c.body.flatMap((b) => (b.type === "img" ? b.images.map((i) => i.src) : []))].filter((s): s is string => !!s);

/** Remove the post's own files that neither its saved version nor its edits use. */
async function clearUnused(id: string) {
  const post = posts.peek(id);
  if (!post) return;
  const used = new Set([...pathsIn(post.saved), ...(post.edits ? pathsIn(post.edits.content) : [])].flatMap(filesOf));
  const bucket = db().storage.from("journal");
  const { data: files } = await bucket.list(id, { limit: 1000 });
  const unused = (files ?? []).map((f) => `${id}/${f.name}`).filter((p) => !used.has(p));
  if (unused.length) await bucket.remove(unused);
}

/** A photo made ready in the browser: its preview shows at once while it uploads. */
export const prepareJournalPhoto = (file: Blob) => preparePhoto(file, MIN_PHOTO);

/** Upload a prepared photo to the post's folder. Returns it as a block or cover holds it. */
export async function uploadPrepared(postId: string, prepared: Awaited<ReturnType<typeof prepareJournalPhoto>>, alt = ""): Promise<Photo> {
  const path = `${postId}/${crypto.randomUUID()}.jpg`;
  const bucket = db().storage.from("journal");
  const blobs = [prepared.full, prepared.w1200, prepared.w480];
  const results = await Promise.all(filesOf(path).map((f, i) => bucket.upload(f, blobs[i], { contentType: "image/jpeg", cacheControl: "31536000", upsert: false })));
  const failed = results.find((r) => r.error)?.error;
  if (failed) {
    await bucket.remove(filesOf(path));
    throw new Error(failed.message);
  }
  return { src: path, alt, w: prepared.width, h: prepared.height };
}

export { PhotoError };
