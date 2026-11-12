import type { PostContent } from "@/lib/admin/journal";
import { type Block, blockId, PHOTOS_PER_ROW, type Photo, type Run } from "@/lib/journal/blocks";

/** Where photos from the library or an upload go. */
export type PhotoTarget =
  | { kind: "cover" }
  /** A new row before block `index` (the end when it's the length). */
  | { kind: "insert"; index: number }
  /** Added to an existing row, as far as it has room. */
  | { kind: "add"; blockId: string }
  | { kind: "replace"; blockId: string; index: number };

const rows = (photos: Photo[]): Block[] => {
  const out: Block[] = [];
  for (let i = 0; i < photos.length; i += PHOTOS_PER_ROW) out.push({ id: blockId(), type: "img", images: photos.slice(i, i + PHOTOS_PER_ROW), caption: "" });
  return out;
};

export function placePhotos(c: PostContent, target: PhotoTarget, photos: Photo[]): PostContent {
  if (!photos.length) return c;
  if (target.kind === "cover") return { ...c, cover: photos[0] };
  const body = [...c.body];
  if (target.kind === "insert") {
    body.splice(Math.min(target.index, body.length), 0, ...rows(photos));
    return { ...c, body };
  }
  const i = body.findIndex((b) => b.id === target.blockId);
  const b = body[i];
  if (!b || b.type !== "img") return placePhotos(c, { kind: "insert", index: body.length }, photos);
  if (target.kind === "replace") {
    const images = [...b.images];
    images[target.index] = photos[0];
    body[i] = { ...b, images };
    return { ...c, body };
  }
  const room = PHOTOS_PER_ROW - b.images.length;
  const images = [...b.images, ...photos.slice(0, room)];
  // A row of several photos is never "wide": it already spans the full measure.
  const row: Block = { id: b.id, type: "img", images, caption: b.caption, ...(b.wide && images.length === 1 && { wide: true as const }) };
  body.splice(i, 1, row, ...rows(photos.slice(room)));
  return { ...c, body };
}

/** Swap a photo still uploading (its preview URL) for the stored one, wherever it ended up. */
export function settlePhoto(c: PostContent, preview: string, photo: Photo | null): PostContent {
  const swap = (p: Photo) => (p.src === preview ? (photo ? { ...photo, alt: p.alt || photo.alt } : null) : p);
  const cover = c.cover ? swap(c.cover) : null;
  const body = c.body.flatMap((b): Block[] => {
    if (b.type !== "img") return [b];
    const images = b.images.map(swap).filter((p): p is Photo => !!p);
    return images.length ? [{ ...b, images }] : [];
  });
  return { ...c, cover, body };
}

export const emptyParagraph = (): Block => ({ id: blockId(), type: "p", content: [] });

/** A text block's runs, whatever kind it is. */
export const runsOf = (b: Block): Run[] =>
  b.type === "p" ? b.content : b.type === "h" ? (b.text ? [{ text: b.text }] : []) : b.type === "ul" ? b.items.flatMap((i, n) => (n ? [{ text: " " }, ...i] : i)) : [];

/** Turn a text block into another kind, keeping its words. */
export function convert(b: Block, kind: "p" | "h" | "ul"): Block {
  if (b.type === "img" || b.type === kind) return b;
  if (kind === "ul") return { id: b.id, type: "ul", items: b.type === "p" ? [b.content] : [[{ text: b.type === "h" ? b.text : "" }]] };
  const runs = b.type === "ul" ? b.items.flatMap((i, n) => (n ? [{ text: " " }, ...i] : i)) : runsOf(b);
  return kind === "h" ? { id: b.id, type: "h", text: runs.map((r) => r.text).join("") } : { id: b.id, type: "p", content: runs };
}
