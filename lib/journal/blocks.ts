import { imageUrl } from "@/lib/supabase/storage";

/*
 * A journal post's body, as posts.body stores it: an ordered list of blocks.
 *
 *   p      a paragraph of runs: plain, bold, italic, or a link
 *   h      a heading, plain text; `level: 3` for the smaller subheading
 *   ul     a list, each item a line of runs; `ordered` numbers it
 *   img    one to three photos side by side at one height, never cropped; `wide` lets a single
 *          photo run wider than the text column
 *
 * A photo's src is a path in the journal bucket (uploaded at 2000px with the 1200 and 480 copies
 * beside it, as vendor photos are), or a full URL. Posts brought over from WordPress were stored in
 * an older shape ({type: "p", text}, {type: "img", src, alt}); readBody turns those into this one,
 * so they open and render like any other post and are rewritten on their next save.
 */

/** The categories every post can choose from. The team can add their own; those live on the posts. */
export const CATEGORIES = ["Real weddings", "Culture", "Planning", "Vendors"];
export type Category = string;
export const DEFAULT_CATEGORY = "Culture";

/** A category as stored: trimmed and short, or the default when there isn't one. */
export const categoryOf = (c: unknown) => (typeof c === "string" && c.trim() ? c.trim().replace(/\s+/g, " ").slice(0, 40) : DEFAULT_CATEGORY);

export type Run = { text: string; bold?: true; italic?: true; href?: string };
export type Photo = { src: string; alt: string; w?: number; h?: number };

export type Block =
  | { id: string; type: "p"; content: Run[] }
  | { id: string; type: "h"; text: string; level?: 3 }
  | { id: string; type: "ul"; items: Run[][]; ordered?: true }
  | { id: string; type: "img"; images: Photo[]; caption: string; wide?: true };

export const PHOTOS_PER_ROW = 3;

export const blockId = () => Math.random().toString(36).slice(2, 10);

const str = (v: unknown) => (typeof v === "string" ? v : "");
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Only links a reader can follow safely: the web, email, phone, or a page on this site. */
export function safeHref(href: string) {
  const h = href.trim();
  if (/^\/(?!\/)/.test(h)) return h;
  if (/^mailto:|^tel:/i.test(h)) return h;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(h) ? h : `https://${h}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function readRuns(v: unknown): Run[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((r): Run[] => {
    if (!isObj(r) || !str(r.text)) return [];
    const href = str(r.href) && safeHref(str(r.href));
    return [{ text: str(r.text), ...(r.bold ? { bold: true as const } : {}), ...(r.italic ? { italic: true as const } : {}), ...(href ? { href } : {}) }];
  });
}

function readPhoto(v: unknown): Photo | undefined {
  if (!isObj(v) || !str(v.src)) return undefined;
  const w = Number(v.w);
  const h = Number(v.h);
  return { src: str(v.src), alt: str(v.alt), ...(w > 0 && h > 0 ? { w, h } : {}) };
}

/** Whatever posts.body holds, as blocks: unknown shapes are dropped rather than breaking a page. */
export function readBody(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((b): Block[] => {
    if (!isObj(b)) return [];
    const id = str(b.id) || blockId();
    switch (b.type) {
      case "p":
        return [{ id, type: "p", content: Array.isArray(b.content) ? readRuns(b.content) : str(b.text) ? [{ text: str(b.text) }] : [] }];
      case "h":
        return [{ id, type: "h", text: str(b.text), ...(b.level === 3 && { level: 3 as const }) }];
      case "ul":
        return [{ id, type: "ul", items: Array.isArray(b.items) ? b.items.map(readRuns) : [], ...(b.ordered === true && { ordered: true as const }) }];
      case "img": {
        const images = (Array.isArray(b.images) ? b.images.map(readPhoto) : [readPhoto(b)]).filter((p): p is Photo => !!p).slice(0, PHOTOS_PER_ROW);
        return images.length ? [{ id, type: "img", images, caption: str(b.caption), ...(b.wide && images.length === 1 ? { wide: true as const } : {}) }] : [];
      }
      default:
        return [];
    }
  });
}

export const runsText = (c: Run[]) => c.map((r) => r.text).join("");

const blockText = (b: Block) =>
  b.type === "p" ? runsText(b.content) : b.type === "h" ? b.text : b.type === "ul" ? b.items.map(runsText).join(" ") : b.caption;

/** The words of a post, for counts, search and a description when none is written. */
export const bodyText = (blocks: Block[]) => blocks.map(blockText).filter(Boolean).join("\n\n");

export const wordCount = (s: string) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;

/** Minutes to read at an easy pace, never less than one. */
export const readingMinutes = (words: number) => Math.max(1, Math.round(words / 230));

/** The house tidy-up before a save: empty text blocks go, runs are merged, spaces trimmed. */
export function tidyBody(blocks: Block[]): Block[] {
  const tidyRuns = (c: Run[]) => {
    const out: Run[] = [];
    for (const r of c) {
      if (!r.text) continue;
      const last = out.at(-1);
      if (last && !!last.bold === !!r.bold && !!last.italic === !!r.italic && last.href === r.href) last.text += r.text;
      else out.push({ ...r });
    }
    if (out[0]) out[0].text = out[0].text.replace(/^\s+/, "");
    if (out.at(-1)) out.at(-1)!.text = out.at(-1)!.text.replace(/\s+$/, "");
    return out.filter((r) => r.text);
  };
  return blocks.flatMap((b): Block[] => {
    if (b.type === "p") {
      const content = tidyRuns(b.content);
      return content.length ? [{ ...b, content }] : [];
    }
    if (b.type === "h") return b.text.trim() ? [{ ...b, text: b.text.trim() }] : [];
    if (b.type === "ul") {
      const items = b.items.map(tidyRuns).filter((i) => i.length);
      return items.length ? [{ ...b, items }] : [];
    }
    // A photo still uploading (a local preview) is never saved.
    const images = b.images.filter((p) => !/^(blob|data):/.test(p.src));
    return images.length ? [{ ...b, images, caption: b.caption.trim(), ...(images.length > 1 && { wide: undefined }) }] : [];
  });
}

/** A photo's address, wherever it lives. */
export const photoUrl = (src: string) => (/^(https?:|blob:|data:)/.test(src) ? src : imageUrl("journal", src));

/** Width over height, when known. */
export const ratioOf = (p: { w?: number; h?: number }) => (p.w && p.h ? p.w / p.h : undefined);

export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/-$/, "");

export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** What search engines and share cards show: the written description, or the opening words. */
export function describe(description: string, standfirst: string, blocks: Block[]) {
  const text = (description.trim() || standfirst.trim() || bodyText(blocks).split("\n\n")[0] || "").replace(/\s+/g, " ");
  return text.length > 160 ? `${text.slice(0, text.lastIndexOf(" ", 157))}…` : text;
}
