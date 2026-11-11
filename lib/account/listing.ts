import { useSyncExternalStore } from "react";
import type { Language, Service, StateCode } from "@/data/types";
import { LIMITS, socialUrl, withScheme } from "@/lib/apply/application";
import { preparePhoto } from "@/lib/apply/photos";
import { refreshListings } from "@/lib/listings-actions";
import { supabase } from "@/lib/supabase/browser";
import { imageUrl, VARIANT_WIDTHS, variantPath } from "@/lib/supabase/storage";

/*
 * A vendor's own listing, for the portal: read and saved in Supabase as the signed-in vendor, so row
 * level security decides what they reach (their own row and photos, nothing else; the database
 * keeps status, featuring and the address for the team). Changes show on the public pages straight
 * away: each save refreshes the cached listings.
 *
 * Photos are prepared in the browser exactly as for an application (upright, JPEG, 2000px plus the
 * 1200 and 480 copies) and uploaded to vendor-photos/<vendor id>/, each under its own random name so
 * a reorder or a removal never has to rename a file.
 */

export type OwnPhoto = { id: string; path: string; src: string; width: number | null; height: number | null };

export type OwnListing = {
  id: string;
  slug: string;
  status: "draft" | "published" | "hidden";
  name: string;
  person: string;
  discipline: string;
  lede: string;
  story: string[];
  services: Service[];
  based: string;
  serviceArea: StateCode[];
  languages: Language[];
  email: string;
  phone: string;
  website: string;
  instagram: string;
  facebook: string;
  photos: OwnPhoto[];
};

export type ListingDetails = Omit<OwnListing, "id" | "slug" | "status" | "photos">;

type State = { status: "loading" | "ready" | "error"; error?: string; listing?: OwnListing; uploading: number };

const loading: State = { status: "loading", uploading: 0 };
const stores = new Map<string, { state: State; listeners: Set<() => void>; started: boolean }>();

const storeFor = (slug: string) => {
  let s = stores.get(slug);
  if (!s) stores.set(slug, (s = { state: loading, listeners: new Set(), started: false }));
  return s;
};

function set(slug: string, next: Partial<State>) {
  const s = storeFor(slug);
  s.state = { ...s.state, ...next };
  s.listeners.forEach((l) => l());
}

const current = (slug: string) => storeFor(slug).state.listing;
/** The listing as it stands now, outside React (after an await, say). */
export const readListing = current;
const db = () => supabase();
const str = (s: string | null) => s ?? "";

const toPhoto = (p: { id: string; path: string; width: number | null; height: number | null }): OwnPhoto => ({
  id: p.id,
  path: p.path,
  src: imageUrl("vendor-photos", p.path),
  width: p.width,
  height: p.height,
});

async function load(slug: string) {
  const { data: v, error } = await db()
    .from("vendors")
    .select("id, slug, status, name, person, discipline, lede, story, services, based, service_area, languages, email, phone, website, instagram, facebook, vendor_photos(id, path, width, height, position)")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !v) return set(slug, { status: "error", error: error?.message ?? "We couldn’t find your listing." });
  set(slug, {
    status: "ready",
    error: undefined,
    listing: {
      id: v.id,
      slug: v.slug,
      status: v.status,
      name: v.name,
      person: str(v.person),
      discipline: v.discipline,
      lede: v.lede,
      story: v.story,
      services: v.services as Service[],
      based: str(v.based),
      serviceArea: v.service_area as StateCode[],
      languages: v.languages as Language[],
      email: str(v.email),
      phone: str(v.phone),
      website: str(v.website),
      instagram: str(v.instagram),
      facebook: str(v.facebook),
      photos: [...v.vendor_photos].sort((a, b) => a.position - b.position).map(toPhoto),
    },
  });
}

/** The listing for a slug, or nothing yet while the session is still being read (slug null). */
export function useOwnListing(slug: string | null) {
  return useSyncExternalStore(
    (listener) => {
      if (!slug) return () => {};
      const s = storeFor(slug);
      s.listeners.add(listener);
      if (!s.started) {
        s.started = true;
        void load(slug);
      }
      return () => s.listeners.delete(listener);
    },
    () => (slug ? storeFor(slug).state : loading),
    () => loading,
  );
}

const publish = () => refreshListings().catch(() => undefined);

// ── Details ─────────────────────────────────────────────────────────────

const clip = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);
const orNull = (s: string) => s.trim() || null;

/** Save the words and details. Resolves once the database has them and the public pages are refreshed. */
export async function saveDetails(slug: string, d: ListingDetails) {
  const listing = current(slug);
  if (!listing) throw new Error("Your listing hasn’t loaded yet.");
  const row = {
    name: clip(d.name, LIMITS.name),
    person: orNull(clip(d.person, LIMITS.person)),
    discipline: clip(d.discipline, LIMITS.discipline),
    lede: d.lede.trim().slice(0, 400),
    story: d.story,
    services: d.services,
    based: orNull(clip(d.based, LIMITS.based)),
    service_area: d.serviceArea,
    languages: d.languages,
    email: orNull(d.email.trim().toLowerCase()),
    phone: orNull(d.phone),
    website: withScheme(d.website) || null,
    instagram: socialUrl(d.instagram, "instagram") || null,
    facebook: socialUrl(d.facebook, "facebook") || null,
  };
  if (!row.name) throw new Error("Add your business name.");
  const { error } = await db().from("vendors").update(row).eq("id", listing.id);
  if (error) throw new Error(error.message);
  // Photo descriptions carry the business name.
  if (row.name !== listing.name) await enqueue(() => savePositions(row.name, current(slug)?.photos ?? [])).catch(() => undefined);
  set(slug, {
    listing: {
      // Field by field: the form's values carry more than the details (its own photos, a plan).
      ...(current(slug) ?? listing),
      story: row.story,
      services: row.services,
      serviceArea: row.service_area,
      languages: row.languages,
      name: row.name,
      person: str(row.person),
      discipline: row.discipline,
      lede: row.lede,
      based: str(row.based),
      email: str(row.email),
      phone: str(row.phone),
      website: str(row.website),
      instagram: str(row.instagram),
      facebook: str(row.facebook),
    },
  });
  await publish();
}

// ── Photos ──────────────────────────────────────────────────────────────

const alt = (name: string, i: number) => (i === 0 ? name : `${name}, photo ${i + 1}`);
const filesOf = (path: string) => [path, ...VARIANT_WIDTHS.map((w) => variantPath(path, w))];

function setPhotos(slug: string, photos: OwnPhoto[]) {
  const listing = current(slug);
  if (listing) set(slug, { listing: { ...listing, photos } });
}

// Photo changes run one after another, so quick successive moves land in the order they were made.
let queue: Promise<unknown> = Promise.resolve();
const enqueue = <T>(job: () => Promise<T>) => {
  const run = queue.then(job);
  queue = run.catch(() => {});
  return run;
};

/** Write every photo's position (and its alt text, which follows the position). */
async function savePositions(name: string, photos: OwnPhoto[]) {
  const results = await Promise.all(photos.map((p, i) => db().from("vendor_photos").update({ position: i, alt: alt(name, i) }).eq("id", p.id)));
  const failed = results.find((r) => r.error)?.error;
  if (failed) throw new Error(failed.message);
}

/**
 * Add photos to the end of the gallery, one at a time, so each appears as soon as it's in. Returns
 * the problems with any that couldn't be added (too small, unreadable, over the limit).
 */
export function addPhotos(slug: string, files: File[]): Promise<string[]> {
  return enqueue(async () => {
    const listing = current(slug);
    if (!listing) return ["Your listing hasn’t loaded yet."];
    const room = LIMITS.photosMax - listing.photos.length;
    const take = files.slice(0, Math.max(0, room));
    const problems: string[] = files.length > take.length ? [`Listings hold up to ${LIMITS.photosMax} photos, so ${files.length - take.length === 1 ? "one wasn’t" : `${files.length - take.length} weren’t`} added.`] : [];
    set(slug, { uploading: take.length });
    for (const file of take) {
      try {
        const photo = await preparePhoto(file);
        const path = `${listing.id}/${crypto.randomUUID()}.jpg`;
        const bucket = db().storage.from("vendor-photos");
        const blobs = [photo.full, photo.w1200, photo.w480];
        const uploads = await Promise.all(filesOf(path).map((p, i) => bucket.upload(p, blobs[i], { contentType: "image/jpeg", cacheControl: "31536000", upsert: false })));
        URL.revokeObjectURL(photo.url);
        const failed = uploads.find((u) => u.error)?.error;
        if (failed) {
          await bucket.remove(filesOf(path));
          throw new Error(failed.message);
        }
        const photos = current(slug)?.photos ?? [];
        const { data, error } = await db()
          .from("vendor_photos")
          .insert({ vendor_id: listing.id, path, width: photo.width, height: photo.height, position: photos.length, alt: alt(listing.name, photos.length) })
          .select("id, path, width, height")
          .single();
        if (error) {
          await bucket.remove(filesOf(path));
          throw new Error(error.message);
        }
        setPhotos(slug, [...photos, toPhoto(data)]);
      } catch (e) {
        problems.push(`${file.name}: ${(e as Error).message}`);
      } finally {
        set(slug, { uploading: Math.max(0, storeFor(slug).state.uploading - 1) });
      }
    }
    await publish();
    return problems;
  });
}

/** Move a photo to a new place; position 0 is the cover. Goes back if the database refuses. */
export function movePhoto(slug: string, from: number, to: number) {
  const listing = current(slug);
  if (!listing || from === to) return Promise.resolve();
  const before = listing.photos;
  const next = [...before];
  const [photo] = next.splice(from, 1);
  next.splice(to, 0, photo);
  setPhotos(slug, next);
  return enqueue(async () => {
    try {
      await savePositions(listing.name, next);
    } catch (e) {
      setPhotos(slug, before);
      throw e;
    }
    await publish();
  });
}

/** Remove a photo for good: its record, then its files. */
export function removePhoto(slug: string, id: string) {
  return enqueue(async () => {
    const listing = current(slug);
    const photo = listing?.photos.find((p) => p.id === id);
    if (!listing || !photo) return;
    const { error } = await db().from("vendor_photos").delete().eq("id", id);
    if (error) throw new Error(error.message);
    const rest = listing.photos.filter((p) => p.id !== id);
    setPhotos(slug, rest);
    await savePositions(listing.name, rest).catch(() => undefined);
    // The record is gone, so the photo is off the listing even if a file lingers.
    await db().storage.from("vendor-photos").remove(filesOf(photo.path));
    await publish();
  });
}
