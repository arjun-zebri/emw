import type { CSSProperties } from "react";

/*
 * Where a cover is cropped: the point kept in view (percentages across and down) and how far it's
 * zoomed in around that point. One crop serves every frame the cover is shown in, whatever its shape:
 * object-position lines the photo's point up with the same point of the frame, and the zoom scales
 * around it, so the point stays put. Set in the listing editor (ListingPhotos → Framing).
 */

export type Crop = { position?: string; zoom?: number };

type Row = { focus_x: number | null; focus_y: number | null; focus_zoom?: number | null };

/** A photo row's crop, for Media's `position` and `zoom`. */
export function cropOf(p: Row | undefined): Crop {
  if (!p || p.focus_x == null || p.focus_y == null) return {};
  return { position: `${p.focus_x}% ${p.focus_y}%`, zoom: p.focus_zoom && p.focus_zoom > 100 ? p.focus_zoom / 100 : undefined };
}

/** The style for an object-fit: cover image. */
export function cropStyle(position?: string, zoom?: number): CSSProperties | undefined {
  if (!position && !zoom) return undefined;
  return { objectPosition: position, ...(zoom && zoom > 1 ? { scale: String(zoom), transformOrigin: position ?? "50% 50%" } : {}) };
}
