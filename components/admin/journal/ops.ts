import type { PostContent } from "@/lib/admin/journal";
import { type Block, PHOTOS_PER_ROW, type Photo } from "@/lib/journal/blocks";

/** Where uploaded photos go. */
export type PhotoTarget =
  | { kind: "cover" }
  /** Added to a row in the body, as far as it has room. The editor puts the row in place first. */
  | { kind: "row"; blockId: string }
  | { kind: "replace"; blockId: string; index: number };

export function placePhotos(c: PostContent, target: PhotoTarget, photos: Photo[]): PostContent {
  if (!photos.length) return c;
  if (target.kind === "cover") return { ...c, cover: photos[0] };
  const i = c.body.findIndex((b) => b.id === target.blockId);
  const b = c.body[i];
  const body = [...c.body];
  if (!b) {
    // The row isn't in the body yet (it was made a moment ago): add it at the end, where the editor will place it.
    const images = photos.slice(0, PHOTOS_PER_ROW);
    body.push({ id: target.blockId, type: "img", images, caption: "" });
    return { ...c, body };
  }
  if (b.type !== "img") return c;
  if (target.kind === "replace") {
    const images = [...b.images];
    images[target.index] = photos[0];
    body[i] = { ...b, images };
    return { ...c, body };
  }
  const images = [...b.images, ...photos].slice(0, PHOTOS_PER_ROW);
  body[i] = { ...b, images };
  return { ...c, body };
}

/**
 * Swap a photo still uploading (its preview URL) for the stored one, wherever it ended up. A row
 * left with no photos stays, empty, so the editor can take it off the page.
 */
export function settlePhoto(c: PostContent, preview: string, photo: Photo | null): PostContent {
  const swap = (p: Photo) => (p.src === preview ? (photo ? { ...photo, alt: p.alt || photo.alt } : null) : p);
  const cover = c.cover ? swap(c.cover) : null;
  const body = c.body.map((b): Block => (b.type === "img" ? { ...b, images: b.images.map(swap).filter((p): p is Photo => !!p) } : b));
  return { ...c, cover, body };
}
