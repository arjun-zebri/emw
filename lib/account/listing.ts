import { useSyncExternalStore } from "react";
import type { AreaCode, Language, Service } from "@/data/types";
import { LIMITS, socialUrl, withScheme } from "@/lib/apply/application";
import type { ApplyPhoto } from "@/lib/apply/photos";
import { refreshListings } from "@/lib/listings-actions";
import { supabase } from "@/lib/supabase/browser";
import { imageUrl, VARIANT_WIDTHS, variantPath } from "@/lib/supabase/storage";

/*
 * A vendor's own listing, for the portal: read and saved in Supabase as the signed-in vendor, so row
 * level security decides what they reach (their own row and photos, nothing else; the database
 * keeps status, featuring and the address for the team).
 *
 * The editor keeps every change, photos included, on the screen until the vendor saves; then
 * saveListing writes it all and refreshes the public pages, so a half-made edit never goes live.
 * New photos are prepared in the browser exactly as for an application (upright, JPEG, 2000px plus
 * the 1200 and 480 copies) and uploaded to vendor-photos/<vendor id>/, each under its own random
 * name so a reorder or a removal never has to rename a file.
 */

export type OwnPhoto = {
  id: string;
  path: string;
  src: string;
  width: number | null;
  height: number | null;
};

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
  serviceArea: AreaCode[];
  languages: Language[];
  email: string;
  phone: string;
  website: string;
  instagram: string;
  facebook: string;
  photos: OwnPhoto[];
  updatedAt: string;
  /** When the listing's own row last changed: a save checks nobody else has changed it since. */
  rowUpdatedAt: string;
};

export type ListingDetails = Omit<OwnListing, "id" | "slug" | "status" | "photos" | "updatedAt" | "rowUpdatedAt">;

/** A photo in the editor: one already saved (id and path), or one added since (upload). */
export type EditPhoto = {
  key: string;
  src: string;
  width: number | null;
  height: number | null;
  id?: string;
  path?: string;
  upload?: ApplyPhoto;
};

type State = {
  status: "loading" | "ready" | "error";
  error?: string;
  listing?: OwnListing;
};

const loading: State = { status: "loading" };
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
    .select(
      "id, slug, status, name, person, discipline, lede, story, services, based, service_area, languages, email, phone, website, instagram, facebook, updated_at, vendor_photos(id, path, width, height, position, created_at)",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error || !v)
    return set(slug, {
      status: "error",
      error: error?.message ?? "We couldn’t find your listing.",
    });
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
      serviceArea: v.service_area as AreaCode[],
      languages: v.languages as Language[],
      email: str(v.email),
      phone: str(v.phone),
      website: str(v.website),
      instagram: str(v.instagram),
      facebook: str(v.facebook),
      photos: [...v.vendor_photos].sort((a, b) => a.position - b.position).map(toPhoto),
      // A photo change doesn't touch the vendor row, so the latest of either is when it was last saved.
      updatedAt: [v.updated_at, ...v.vendor_photos.map((p) => p.created_at)].sort().at(-1)!,
      rowUpdatedAt: v.updated_at,
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

/** The saved photos, as the editor starts with them. */
export const editPhotos = (l: OwnListing): EditPhoto[] =>
  l.photos.map((p) => ({
    key: p.id,
    src: p.src,
    width: p.width,
    height: p.height,
    id: p.id,
    path: p.path,
  }));

const clip = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);
const orNull = (s: string) => s.trim() || null;
/** The line under the name, made from every service chosen. */
export const LINE_MAX = 120;
const alt = (name: string, i: number) => (i === 0 ? name : `${name}, photo ${i + 1}`);
const filesOf = (path: string) => [path, ...VARIANT_WIDTHS.map((w) => variantPath(path, w))];

/**
 * A failed save. `partial`: some of it was written, so the editor should start again from what's
 * saved. `stale`: nothing was written, because the listing changed somewhere else (the team, or
 * another tab) after the editor opened it.
 */
export class SaveError extends Error {
  constructor(
    message: string,
    readonly partial: boolean,
    readonly stale = false,
  ) {
    super(message);
  }
}

/** Has the listing changed since the editor loaded it? Its row, or which photos it has. */
async function changedElsewhere(listing: OwnListing) {
  const { data, error } = await db().from("vendors").select("updated_at, vendor_photos(id)").eq("id", listing.id).single();
  if (error) return false;
  const ids = (list: { id: string }[]) => list.map((p) => p.id).sort().join();
  return data.updated_at !== listing.rowUpdatedAt || ids(data.vendor_photos) !== ids(listing.photos);
}

/**
 * Save everything the editor holds: new photos are uploaded and recorded, the order and descriptions
 * written, removed photos deleted, then the words and details. New photos go first because a failed
 * upload should leave the live listing exactly as it was. Afterwards the listing is read again, so
 * the editor starts from what the database really has.
 */
export async function saveListing(
  slug: string,
  d: ListingDetails,
  photos: EditPhoto[],
  progress?: (message: string) => void,
  /** Each new photo as it goes up, so its tile can show it. */
  onPhoto?: (key: string, state: "uploading" | "done") => void,
) {
  const listing = current(slug);
  if (!listing) throw new Error("Your listing hasn’t loaded yet.");
  const name = clip(d.name, LIMITS.name);
  if (!name) throw new Error("Add your business name.");
  if (photos.length > LIMITS.photosMax) throw new Error(`Listings hold up to ${LIMITS.photosMax} photos.`);
  const bucket = db().storage.from("vendor-photos");
  if (await changedElsewhere(listing)) throw new SaveError("Your listing was changed somewhere else after you opened it", false, true);

  try {
    // 1. Upload the new photos. Nothing a couple sees has changed yet.
    const fresh = photos.filter((p) => p.upload);
    const paths = new Map<string, string>();
    try {
      for (const [n, p] of fresh.entries()) {
        progress?.(fresh.length === 1 ? "Uploading your photo" : `Uploading photo ${n + 1} of ${fresh.length}`);
        onPhoto?.(p.key, "uploading");
        const path = `${listing.id}/${crypto.randomUUID()}.jpg`;
        paths.set(p.key, path);
        const blobs = [p.upload!.full, p.upload!.w1200, p.upload!.w480];
        const results = await Promise.all(
          filesOf(path).map((f, i) =>
            bucket.upload(f, blobs[i], {
              contentType: "image/jpeg",
              cacheControl: "31536000",
              upsert: false,
            }),
          ),
        );
        const failed = results.find((r) => r.error)?.error;
        if (failed) throw new Error(failed.message);
        onPhoto?.(p.key, "done");
      }
      progress?.("Saving");
      if (fresh.length) {
        const { error } = await db()
          .from("vendor_photos")
          .insert(
            photos.flatMap((p, i) =>
              p.upload
                ? [
                    {
                      vendor_id: listing.id,
                      path: paths.get(p.key)!,
                      width: p.width,
                      height: p.height,
                      position: i,
                      alt: alt(name, i),
                    },
                  ]
                : [],
            ),
          );
        if (error) throw new Error(error.message);
      }
    } catch (e) {
      // Take back whatever made it up, so a retry starts clean.
      const uploaded = [...paths.values()].flatMap(filesOf);
      if (uploaded.length) await bucket.remove(uploaded);
      throw new SaveError((e as Error).message, false);
    }

    try {
      // 2. The order of the photos already saved, and their descriptions, which carry the name.
      const kept = photos.flatMap((p, i) => (p.id ? [{ id: p.id, i }] : []));
      const order = await Promise.all(
        kept.map(({ id, i }) =>
          db()
            .from("vendor_photos")
            .update({ position: i, alt: alt(name, i) })
            .eq("id", id),
        ),
      );
      const misordered = order.find((r) => r.error)?.error;
      if (misordered) throw new Error(misordered.message);

      // 3. Photos taken out: the records first (that takes them off the listing), then the files.
      const removed = listing.photos.filter((p) => !photos.some((x) => x.id === p.id));
      if (removed.length) {
        const { error } = await db()
          .from("vendor_photos")
          .delete()
          .in(
            "id",
            removed.map((p) => p.id),
          );
        if (error) throw new Error(error.message);
        await bucket.remove(removed.flatMap((p) => filesOf(p.path)));
      }

      // 4. The words and details.
      const { error } = await db()
        .from("vendors")
        .update({
          name,
          person: orNull(clip(d.person, LIMITS.person)),
          // Built from the services chosen, so it can be longer than a line someone types.
        discipline: clip(d.discipline, LINE_MAX),
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
        })
        .eq("id", listing.id);
      if (error) throw new Error(error.message);
    } catch (e) {
      throw new SaveError((e as Error).message, true);
    }
  } finally {
    // Whatever happened, show what the database now holds and refresh the public pages.
    await load(slug);
    await publish();
  }
}
