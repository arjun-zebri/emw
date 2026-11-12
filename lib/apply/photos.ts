import { LIMITS } from "./application";

/*
 * Photos for an application, prepared in the browser: turned upright, flattened onto white and
 * saved as JPEG at the three sizes the site serves (2000px, and the 1200 and 480 copies beside it,
 * as scripts/lib/variants.mjs makes for imported photos). Done once, when a photo is added, so the
 * upload at the end is quick and the preview is the real thing.
 */

export type ApplyPhoto = {
  id: string;
  width: number;
  height: number;
  full: Blob;
  w1200: Blob;
  w480: Blob;
  /** An object URL of the 1200px copy, for previews. Made again after a reload. */
  url: string;
};

export class PhotoError extends Error {}

async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Safari and some HEIC files only decode through an <img>.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return await createImageBitmap(img);
    } catch {
      throw new PhotoError("We couldn’t open this file. Try saving it as a JPEG first.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function encode(bitmap: ImageBitmap, long: number, quality: number): Promise<{ blob: Blob; width: number; height: number }> {
  const scale = Math.min(1, long / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve({ blob, width, height }) : reject(new PhotoError("We couldn’t prepare this photo."))), "image/jpeg", quality),
  );
}

/** `min`: the shortest long side accepted (the journal takes smaller photos than a listing). */
export async function preparePhoto(file: Blob, min: number = LIMITS.photoMin): Promise<ApplyPhoto> {
  const bitmap = await decode(file);
  try {
    if (Math.max(bitmap.width, bitmap.height) < min) {
      throw new PhotoError(`This one is too small (${bitmap.width} × ${bitmap.height}). Photos need to be at least ${min}px on the long side.`);
    }
    const full = await encode(bitmap, 2000, 0.86);
    const w1200 = await encode(bitmap, 1200, 0.8);
    const w480 = await encode(bitmap, 480, 0.8);
    return { id: crypto.randomUUID(), width: full.width, height: full.height, full: full.blob, w1200: w1200.blob, w480: w480.blob, url: URL.createObjectURL(w1200.blob) };
  } finally {
    bitmap.close();
  }
}

export const isSoft = (p: Pick<ApplyPhoto, "width" | "height">) => Math.max(p.width, p.height) < LIMITS.photoSoft;

// ── Keeping the photos between visits ───────────────────────────────────
// IndexedDB, because photos are too big for localStorage. Best effort: in a private window or with
// storage blocked this quietly does nothing and the flow still works.

const DB = "emw-apply";
const STORE = "photos";
const KEY = "draft";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

type Stored = Omit<ApplyPhoto, "url">;

export async function savePhotos(photos: ApplyPhoto[]) {
  try {
    const stored: Stored[] = photos.map((p) => ({ id: p.id, width: p.width, height: p.height, full: p.full, w1200: p.w1200, w480: p.w480 }));
    await run("readwrite", (s) => s.put(stored, KEY));
  } catch {}
}

export async function loadPhotos(): Promise<ApplyPhoto[]> {
  try {
    const stored = ((await run("readonly", (s) => s.get(KEY))) as Stored[] | undefined) ?? [];
    return stored.map((p) => ({ ...p, url: URL.createObjectURL(p.w1200) }));
  } catch {
    return [];
  }
}

export async function clearPhotos() {
  try {
    await run("readwrite", (s) => s.delete(KEY));
  } catch {}
}
