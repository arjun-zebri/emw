"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import { Portal } from "@/components/ui/Portal";
import { type Block, blockId, PHOTOS_PER_ROW, photoUrl, ratioOf, type Run, runsText, safeHref } from "@/lib/journal/blocks";
import type { PhotoTarget } from "./ops";

/*
 * The body of a post, written as one page, the way it will read. The browser's own editing does the
 * typing; this reads what the page holds back into blocks after each change, and draws it from the
 * blocks only when the post is opened (or replaced, by a discard or a reload), so the caret is never
 * disturbed.
 *
 * "/" opens a menu of what can be added: text, a heading, a subheading, a list, a photo. "## ", "### ",
 * "- " and "1. " at the start of a line do the same. A photo from the menu starts as a placeholder,
 * clicked (or dropped on) to fill it. Photos sit in the page as rows of up to three, each row a small
 * island the typing flows around; dropped or pasted photos land where they fall. A placeholder left
 * empty isn't saved.
 */

type ImgBlock = Extract<Block, { type: "img" }>;
export type Kind = "p" | "h2" | "h3" | "ul" | "ol";

export type BodyHandle = { focus: (at: "start" | "end") => void };

// ── Reading and drawing ─────────────────────────────────────────────────

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function runsHtml(c: Run[]) {
  return c
    .map((r) => {
      let h = esc(r.text);
      if (r.italic) h = `<i>${h}</i>`;
      if (r.bold) h = `<b>${h}</b>`;
      if (r.href) h = `<a href="${esc(r.href)}">${h}</a>`;
      return h;
    })
    .join("");
}

type Marks = Omit<Run, "text">;

/** What a piece of the page holds, as runs: plain, bold, italic, links. Anything else is plain. */
function readRuns(nodes: Iterable<Node>, marks: Marks = {}, out: Run[] = []): Run[] {
  for (const n of nodes) {
    if (n.nodeType === Node.TEXT_NODE) {
      const text = (n.textContent ?? "").replace(/ /g, " ").replace(/\n/g, " ");
      if (text) out.push({ text, ...marks });
    } else if (n instanceof HTMLElement) {
      if (n.tagName === "BR") {
        // The browser's stand-in for an empty line isn't a space.
        if (n.nextSibling) out.push({ text: " ", ...marks });
        continue;
      }
      if (n.tagName === "UL" || n.tagName === "OL") continue;
      const t = n.tagName;
      const st = n.style;
      const href = t === "A" ? safeHref(n.getAttribute("href") ?? "") : undefined;
      readRuns(
        n.childNodes,
        {
          ...marks,
          ...((t === "B" || t === "STRONG" || st.fontWeight === "bold" || Number(st.fontWeight) >= 600) && { bold: true }),
          ...((t === "I" || t === "EM" || st.fontStyle === "italic") && { italic: true }),
          ...(href && { href }),
        },
        out,
      );
    }
  }
  return out;
}

const runsOrEmpty = (runs: Run[]) => (runsText(runs).trim() ? runs : []);

const figureHtml = (id: string) => `<figure data-photos="${id}" contenteditable="false"></figure>`;

function blocksHtml(blocks: Block[]) {
  return blocks
    .map((b) => {
      if (b.type === "p") return `<p>${runsHtml(b.content) || "<br>"}</p>`;
      if (b.type === "h") {
        const t = b.level === 3 ? "h3" : "h2";
        return `<${t}>${esc(b.text) || "<br>"}</${t}>`;
      }
      if (b.type === "ul") {
        const t = b.ordered ? "ol" : "ul";
        return `<${t}>${(b.items.length ? b.items : [[]]).map((i) => `<li>${runsHtml(i) || "<br>"}</li>`).join("")}</${t}>`;
      }
      return figureHtml(b.id);
    })
    .join("");
}

const BLOCK_TAGS = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "FIGURE", "BLOCKQUOTE", "PRE", "SECTION", "ARTICLE", "TABLE"]);
const isBlock = (n: Node): n is HTMLElement => n instanceof HTMLElement && BLOCK_TAGS.has(n.tagName);

/** The page as blocks. Rows of photos come from `rows` by id; their photos aren't kept in the page. */
function parse(root: HTMLElement, rows: Map<string, ImgBlock>): Block[] {
  const out: Block[] = [];
  let loose: Node[] = [];
  const flush = () => {
    if (loose.length) out.push({ id: "", type: "p", content: runsOrEmpty(readRuns(loose)) });
    loose = [];
  };
  const walk = (parent: Node) => {
    for (const n of parent.childNodes) {
      if (!isBlock(n)) {
        if (n.nodeType === Node.TEXT_NODE && !n.textContent?.trim() && !loose.length) continue;
        if (n instanceof HTMLElement && n.tagName === "BR" && !loose.length) continue;
        loose.push(n);
        continue;
      }
      flush();
      const t = n.tagName;
      if (t === "FIGURE") {
        const id = n.dataset.photos;
        if (id) out.push(rows.get(id) ?? { id, type: "img", images: [], caption: "", wide: true });
      } else if (t === "UL" || t === "OL") {
        const items = [...n.children].filter((c) => c.tagName === "LI").map((li) => runsOrEmpty(readRuns(li.childNodes)));
        out.push({ id: "", type: "ul", items: items.length ? items : [[]], ...(t === "OL" && { ordered: true as const }) });
      } else if (/^H[1-6]$/.test(t)) {
        out.push({ id: "", type: "h", text: (n.textContent ?? "").replace(/\s+/g, " "), ...(t >= "H3" && { level: 3 as const }) });
      } else if ([...n.childNodes].some(isBlock)) {
        walk(n);
      } else {
        out.push({ id: "", type: "p", content: runsOrEmpty(readRuns(n.childNodes)) });
      }
    }
    flush();
  };
  walk(root);
  // Text blocks take their place as their id; rows keep theirs, so their photos stay with them.
  return out.map((b, i) => (b.type === "img" ? b : { ...b, id: `b${i}` }));
}

const emptyLine = () => {
  const p = document.createElement("p");
  p.append(document.createElement("br"));
  return p;
};

/** Run a change to the page's structure, keeping the caret where it was (or at the start of `fallback`). */
function keepCaret(fn: () => HTMLElement | void) {
  const sel = getSelection();
  const at = sel?.rangeCount ? ([sel.anchorNode!, sel.anchorOffset, sel.focusNode!, sel.focusOffset] as const) : null;
  const fallback = fn();
  if (!sel || !at) return;
  if (at[0].isConnected && at[2].isConnected) sel.setBaseAndExtent(at[0], at[1], at[2], at[3]);
  else if (fallback) placeCaretIn(fallback, "start");
}

/** Move `nodes` out into the page in place of `el`, the loose words among them gathered into paragraphs. */
function unwrap(el: HTMLElement) {
  let p: HTMLElement | null = null;
  for (const n of [...el.childNodes]) {
    if (isBlock(n)) {
      p = null;
      el.before(n);
    } else {
      if (!p) {
        if (n.nodeType === Node.TEXT_NODE && !n.textContent?.trim()) continue;
        p = document.createElement("p");
        el.before(p);
      }
      p.append(n);
    }
  }
  el.remove();
}

/**
 * Keep the page flat (a block never inside another, as browsers sometimes leave it), a line to write
 * on above and below the photos, and something to type into.
 */
function normalise(root: HTMLElement) {
  if (!root.firstChild || (!root.textContent?.trim() && !root.querySelector("figure, li, br"))) {
    root.replaceChildren(emptyLine());
    return;
  }
  const nested = [...root.children].filter((c): c is HTMLElement => c instanceof HTMLElement && c.tagName !== "UL" && c.tagName !== "OL" && c.tagName !== "FIGURE" && [...c.childNodes].some(isBlock));
  if (nested.length) keepCaret(() => nested.forEach(unwrap));
  if (root.firstElementChild?.tagName === "FIGURE") root.prepend(emptyLine());
  if (root.lastElementChild?.tagName === "FIGURE") root.append(emptyLine());
}

// ── The caret ───────────────────────────────────────────────────────────

/** The child of the page the caret is in. */
function topOf(root: HTMLElement, n: Node | null): HTMLElement | null {
  let x = n;
  while (x && x.parentNode !== root) x = x.parentNode;
  return x instanceof HTMLElement ? x : null;
}

/** The line the caret is on: a list item, or a block. */
function lineOf(root: HTMLElement, n: Node | null): HTMLElement | null {
  const el = n instanceof Element ? n : n?.parentElement;
  const li = el?.closest("li");
  return li && root.contains(li) ? li : topOf(root, n);
}

function textBefore(line: Node) {
  const sel = getSelection();
  if (!sel?.rangeCount) return "";
  const r = document.createRange();
  r.selectNodeContents(line);
  r.setEnd(sel.anchorNode!, sel.anchorOffset);
  return r.toString();
}

function placeCaretIn(el: Node, at: "start" | "end") {
  const sel = getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(at === "start");
  sel.removeAllRanges();
  sel.addRange(range);
}

/** Take back the last `n` characters typed (the "/" and what followed it, or a "## " shortcut). */
function eraseBack(n: number) {
  const sel = getSelection();
  if (!sel || !n) return;
  for (let i = 0; i < n; i++) sel.modify("extend", "backward", "character");
  document.execCommand("delete");
}

/** What kind of block the caret is in. */
export function kindAt(root: HTMLElement | null): Kind | null {
  const sel = getSelection();
  if (!root || !sel?.rangeCount || !root.contains(sel.anchorNode)) return null;
  const top = topOf(root, sel.anchorNode);
  const t = top?.tagName;
  return t === "UL" ? "ul" : t === "OL" ? "ol" : t === "H2" || t === "H1" ? "h2" : t && /^H[3-6]$/.test(t) ? "h3" : "p";
}

/** A new element of `tag` holding what `from` held. */
function retag(from: Element, tag: string) {
  const el = document.createElement(tag);
  el.append(...from.childNodes);
  if (!el.firstChild) el.append(document.createElement("br"));
  return el;
}

/**
 * Turn the line the caret is in into another kind, keeping its words; the same kind again turns it
 * back to text. Done here rather than by the browser, which nests lists inside paragraphs.
 */
export function setKind(root: HTMLElement | null, kind: Kind) {
  const sel = getSelection();
  if (!root || !sel?.rangeCount || !root.contains(sel.anchorNode)) return;
  const now = kindAt(root);
  const top = topOf(root, sel.anchorNode);
  if (!top || top.tagName === "FIGURE") return;
  if (now === kind && kind !== "p") kind = "p";
  if (now === kind) return;
  const tag = kind.toUpperCase();

  keepCaret(() => {
    if (now === "ul" || now === "ol") {
      // A whole list changing type keeps its items.
      if (kind === "ul" || kind === "ol") {
        const list = document.createElement(tag);
        list.append(...top.childNodes);
        top.replaceWith(list);
        return list;
      }
      // One item leaves the list: the items after it carry on in a list of their own.
      const li = (sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement)?.closest("li");
      if (!li || li.parentElement !== top) return;
      const line = retag(li, tag);
      const after = [...top.children].slice([...top.children].indexOf(li) + 1);
      li.remove();
      top.after(line);
      if (after.length) {
        const rest = document.createElement(top.tagName);
        rest.append(...after);
        line.after(rest);
      }
      if (!top.children.length) top.remove();
      return line;
    }
    if (kind === "ul" || kind === "ol") {
      const li = retag(top, "li");
      const prev = top.previousElementSibling;
      const next = top.nextElementSibling;
      // Next to a list of the same kind, it joins it.
      if (prev?.tagName === tag) {
        prev.append(li);
        top.remove();
        if (next?.tagName === tag) {
          prev.append(...next.childNodes);
          next.remove();
        }
      } else if (next?.tagName === tag) {
        next.prepend(li);
        top.remove();
      } else {
        const list = document.createElement(tag);
        list.append(li);
        top.replaceWith(list);
      }
      return li;
    }
    const line = retag(top, tag);
    top.replaceWith(line);
    return line;
  });
  // Tell the page it changed, as typing would.
  root.dispatchEvent(new Event("input", { bubbles: true }));
}

// ── The editor ──────────────────────────────────────────────────────────

const COMMANDS: { kind: Kind | "img"; label: string; hint: string; icon: IconName; words: string }[] = [
  { kind: "p", label: "Text", hint: "", icon: "text", words: "text paragraph plain" },
  { kind: "h2", label: "Heading", hint: "##", icon: "heading", words: "heading title h2 section" },
  { kind: "h3", label: "Subheading", hint: "###", icon: "subheading", words: "subheading small heading h3" },
  { kind: "ul", label: "Bulleted list", hint: "-", icon: "list", words: "bulleted list bullets unordered" },
  { kind: "ol", label: "Numbered list", hint: "1.", icon: "list-ordered", words: "numbered list ordered steps" },
  { kind: "img", label: "Photo", hint: "", icon: "image", words: "photo photos image images picture pictures upload gallery" },
];

const SHORTCUTS: Record<string, Kind> = { "#": "h2", "##": "h2", "###": "h3", "-": "ul", "*": "ul", "1.": "ol" };

const HINT = { P: "Write, or press / for headings, lists and a photo", H2: "Heading", H3: "Subheading", LI: "List item" } as Record<string, string>;

type Slash = { x: number; y: number; query: string; active: number };

export function pickFiles(onFiles: (files: File[]) => void, multiple = true) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = multiple;
  input.onchange = () => onFiles([...(input.files ?? [])]);
  input.click();
}

export function BodyEditor({
  body,
  setBody,
  uploading,
  onFiles,
  onLeaveTop,
  ref,
}: {
  /** The body as the editor last read it; the page is drawn from it when this editor mounts. */
  body: Block[];
  setBody: (fn: (body: Block[]) => Block[]) => void;
  /** Photos still uploading, by preview URL. */
  uploading: Set<string>;
  onFiles: (files: File[], target: PhotoTarget) => Promise<void>;
  /** The caret went up out of the first line. */
  onLeaveTop: () => void;
  ref: React.Ref<BodyHandle>;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [initial] = useState(body);
  // Every row of photos seen, so one brought back by undo comes back with its photos.
  const seen = useRef(new Map<string, ImgBlock>());
  // Rows just made, waiting for their first photo.
  const fresh = useRef(new Set<string>());
  // Rows added from the menu, empty until someone chooses a photo for them.
  const [holders, setHolders] = useState<Set<string>>(() => new Set());
  const [figures, setFigures] = useState<{ id: string; node: HTMLElement }[]>([]);
  const [tick, setTick] = useState(0);
  const [slash, setSlash] = useState<Slash | null>(null);
  const slashOpening = useRef(false);
  const [drop, setDrop] = useState<{ node: HTMLElement | null; before: boolean; y: number } | null>(null);

  const syncFigures = useCallback(() => {
    const nodes = [...(root.current?.querySelectorAll<HTMLElement>(":scope > figure[data-photos]") ?? [])];
    setFigures((prev) => (prev.length === nodes.length && prev.every((f, i) => f.node === nodes[i]) ? prev : nodes.map((node) => ({ id: node.dataset.photos!, node }))));
  }, []);

  /** A hint on the empty line the caret is on, or on the only line of an empty post. */
  const markHint = useCallback(() => {
    const el = root.current;
    if (!el) return;
    const sel = getSelection();
    const line = sel?.rangeCount && el.contains(sel.anchorNode) ? lineOf(el, sel.anchorNode) : null;
    const only = el.children.length === 1 && !el.textContent ? (el.firstElementChild as HTMLElement) : null;
    const target = [line, only].find((x) => x && !x.textContent && HINT[x.tagName]) ?? null;
    el.querySelectorAll("[data-hint]").forEach((x) => x !== target && x.removeAttribute("data-hint"));
    if (target) target.setAttribute("data-hint", HINT[target.tagName]);
  }, []);

  const emit = useCallback(() => {
    const el = root.current;
    if (!el) return;
    normalise(el);
    setBody((prev) => {
      const rows = new Map(seen.current);
      for (const b of prev) if (b.type === "img") rows.set(b.id, b);
      return parse(el, rows);
    });
    syncFigures();
    markHint();
  }, [setBody, syncFigures, markHint]);

  // Draw the page once, from the body it opened with.
  useLayoutEffect(() => {
    const el = root.current!;
    el.innerHTML = blocksHtml(initial);
    normalise(el);
    syncFigures();
    markHint();
  }, [initial, syncFigures, markHint]);

  useEffect(() => {
    for (const b of body) if (b.type === "img" && b.images.length) seen.current.set(b.id, b);
  }, [body]);

  // A row whose photos all went (removed, or failed to upload) leaves the page.
  useEffect(() => {
    let removed = false;
    for (const f of figures) {
      const b = (body.find((x) => x.id === f.id) as ImgBlock | undefined) ?? seen.current.get(f.id);
      if ((!b || !b.images.length) && !fresh.current.has(f.id) && !holders.has(f.id) && f.node.isConnected) {
        f.node.remove();
        removed = true;
      }
    }
    if (removed) emit();
  }, [figures, body, tick, holders, emit]);

  useImperativeHandle(
    ref,
    () => ({
      focus: (at) => {
        const el = root.current;
        if (!el) return;
        el.focus();
        const target = at === "start" ? el.firstElementChild : el.lastElementChild;
        if (target) placeCaretIn(target.tagName === "UL" || target.tagName === "OL" ? (at === "start" ? target.firstElementChild! : target.lastElementChild!) : target, at);
        markHint();
      },
    }),
    [markHint],
  );

  useEffect(() => {
    const onSel = () => {
      markHint();
      // The menu closes once the caret leaves the line it opened on.
      if (slash && root.current) {
        const sel = getSelection();
        if (!sel?.rangeCount || !root.current.contains(sel.anchorNode) || !sel.isCollapsed) setSlash(null);
      }
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, [markHint, slash]);

  // ── Photos ────────────────────────────────────────────────────────────

  /** New rows for `files`, after (or before) a block of the page, or in place of an empty line. */
  const addRows = (files: File[], at: { node: HTMLElement | null; before?: boolean }) => {
    const el = root.current;
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!el || !images.length) return;
    let anchor = at.node && at.node.parentNode === el ? at.node : null;
    const made: { id: string; files: File[] }[] = [];
    for (let i = 0; i < images.length; i += PHOTOS_PER_ROW) {
      const id = blockId();
      const tpl = document.createElement("template");
      tpl.innerHTML = figureHtml(id);
      const fig = tpl.content.firstElementChild as HTMLElement;
      if (!made.length && anchor && !anchor.textContent && anchor.tagName === "P") anchor.replaceWith(fig);
      else if (!made.length && anchor && at.before) anchor.before(fig);
      else if (anchor) anchor.after(fig);
      else el.append(fig);
      anchor = fig;
      fresh.current.add(id);
      made.push({ id, files: images.slice(i, i + PHOTOS_PER_ROW) });
    }
    emit();
    const next = anchor?.nextElementSibling;
    if (next) {
      el.focus();
      placeCaretIn(next, "start");
    }
    for (const m of made) {
      void onFiles(m.files, { kind: "row", blockId: m.id }).finally(() => {
        fresh.current.delete(m.id);
        setTick((t) => t + 1);
      });
    }
  };

  /** An empty row in place of the line the caret is on, to be filled by clicking it. */
  const addPlaceholder = (at: HTMLElement | null) => {
    const el = root.current;
    if (!el) return;
    const anchor = at && at.parentNode === el ? at : null;
    const id = blockId();
    const tpl = document.createElement("template");
    tpl.innerHTML = figureHtml(id);
    const fig = tpl.content.firstElementChild as HTMLElement;
    if (anchor && !anchor.textContent && anchor.tagName === "P") anchor.replaceWith(fig);
    else if (anchor) anchor.after(fig);
    else el.append(fig);
    setHolders((h) => new Set(h).add(id));
    emit();
    const next = fig.nextElementSibling;
    if (next) {
      el.focus();
      placeCaretIn(next, "start");
    }
  };

  /** Fill a placeholder: it waits as the photos come in, and leaves the page if none arrive. */
  const fillPlaceholder = (id: string, files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/")).slice(0, PHOTOS_PER_ROW);
    if (!images.length) return;
    fresh.current.add(id);
    setHolders((h) => {
      const next = new Set(h);
      next.delete(id);
      return next;
    });
    void onFiles(images, { kind: "row", blockId: id }).finally(() => {
      fresh.current.delete(id);
      setTick((t) => t + 1);
    });
  };

  const removePlaceholder = (id: string, node: HTMLElement) => {
    setHolders((h) => {
      const next = new Set(h);
      next.delete(id);
      return next;
    });
    node.remove();
    emit();
  };

  const updateRow = (id: string, fn: (b: ImgBlock) => ImgBlock) => setBody((bs) => bs.map((b) => (b.id === id && b.type === "img" ? fn(b) : b)));

  // ── The "/" menu ──────────────────────────────────────────────────────

  const q = slash?.query.trim().toLowerCase() ?? "";
  const shown = COMMANDS.filter((c) => !q || c.label.toLowerCase().startsWith(q) || c.words.includes(q));

  const run = (kind: Kind | "img", erase: number) => {
    const el = root.current;
    if (!el) return;
    eraseBack(erase);
    setSlash(null);
    if (kind === "img") {
      addPlaceholder(topOf(el, getSelection()?.anchorNode ?? null));
      return;
    }
    setKind(el, kind);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const sel = getSelection();
    if (slash) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const n = shown.length || 1;
        setSlash({ ...slash, active: (slash.active + (e.key === "ArrowDown" ? 1 : -1) + n) % n });
        return;
      }
      if ((e.key === "Enter" || e.key === "Tab") && shown[slash.active]) {
        e.preventDefault();
        run(shown[slash.active].kind, slash.query.length + 1);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlash(null);
        return;
      }
    }
    const mod = e.metaKey || e.ctrlKey;
    if (mod && (e.key === "b" || e.key === "i")) {
      const k = kindAt(el);
      e.preventDefault();
      // Headings are plain words.
      if (k !== "h2" && k !== "h3") document.execCommand(e.key === "b" ? "bold" : "italic");
      return;
    }
    if (mod && e.altKey && /^Digit[0-3]$/.test(e.code)) {
      e.preventDefault();
      setKind(el, (["p", "h2", "h3"] as const)[Math.min(2, Number(e.code.slice(5)) || 0)] ?? "p");
      return;
    }
    if (!sel?.rangeCount || !sel.isCollapsed) return;
    const line = lineOf(el, sel.anchorNode);
    if (e.key === "/" && line) {
      const before = textBefore(line);
      if (!before || /\s$/.test(before)) slashOpening.current = true;
      return;
    }
    if (e.key === " " && line && (line.tagName === "P" || line.tagName === "DIV")) {
      const before = textBefore(line);
      const kind = SHORTCUTS[before];
      if (kind) {
        e.preventDefault();
        eraseBack(before.length);
        setKind(el, kind);
      }
      return;
    }
    if (e.key === "Enter" && e.shiftKey) {
      // One line is one paragraph: a soft return starts the next.
      e.preventDefault();
      document.execCommand("insertParagraph");
      return;
    }
    const first = el.firstElementChild;
    const atStart = line && topOf(el, line) === first && (first?.tagName !== "UL" && first?.tagName !== "OL" ? true : line === first.firstElementChild) && textBefore(line) === "";
    if (e.key === "Backspace" && atStart && line?.tagName === "P" && !el.textContent) {
      e.preventDefault();
      onLeaveTop();
    } else if (e.key === "ArrowUp" && line && topOf(el, line) === first) {
      const r = sel.getRangeAt(0).getClientRects()[0];
      const box = line.getBoundingClientRect();
      const lh = parseFloat(getComputedStyle(line).lineHeight) || 28;
      if (!r || r.top - box.top < lh * 0.8) {
        e.preventDefault();
        onLeaveTop();
      }
    }
  };

  const onInput = () => {
    const el = root.current!;
    if (slashOpening.current) {
      slashOpening.current = false;
      const sel = getSelection();
      if (sel?.rangeCount) {
        const r = sel.getRangeAt(0).getClientRects()[0] ?? sel.getRangeAt(0).getBoundingClientRect();
        setSlash({ x: r.left, y: r.bottom, query: "", active: 0 });
      }
    } else if (slash) {
      const line = lineOf(el, getSelection()?.anchorNode ?? null);
      const before = line ? textBefore(line) : "";
      const i = before.lastIndexOf("/");
      const query = i < 0 ? null : before.slice(i + 1);
      if (query === null || query.length > 24 || /^\s|\s\s/.test(query)) setSlash(null);
      else setSlash({ ...slash, query, active: 0 });
    }
    emit();
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const files = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"));
    e.preventDefault();
    if (files.length) return addRows(files, { node: topOf(el, getSelection()?.anchorNode ?? null) });
    // Words arrive plain, so no one's Word styling comes with them; a blank line starts a paragraph.
    const text = e.clipboardData.getData("text/plain").replace(/\r\n?/g, "\n");
    const paragraphs = text
      .split(/\n/)
      .map((p) => p.replace(/[ \t ]+/g, " ").trim())
      .filter(Boolean);
    if (paragraphs.length <= 1) document.execCommand("insertText", false, paragraphs[0] ?? "");
    else document.execCommand("insertHTML", false, paragraphs.map((p) => `<p>${esc(p)}</p>`).join(""));
  };

  // Files dragged over the page: show where they'd land, between blocks.
  const dropTarget = (y: number) => {
    const el = root.current!;
    const kids = [...el.children] as HTMLElement[];
    const box = el.getBoundingClientRect();
    const i = kids.findIndex((k) => {
      const r = k.getBoundingClientRect();
      return y < r.top + r.height / 2;
    });
    if (i < 0) {
      const last = kids.at(-1) ?? null;
      return { node: last, before: false, y: (last?.getBoundingClientRect().bottom ?? box.top) - box.top + 12 };
    }
    return { node: kids[i], before: true, y: kids[i].getBoundingClientRect().top - box.top - 12 };
  };
  const hasFiles = (e: React.DragEvent) => [...e.dataTransfer.types].includes("Files");

  return (
    <div
      className="relative"
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDrop(dropTarget(e.clientY));
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrop(null);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        const at = drop ?? dropTarget(e.clientY);
        setDrop(null);
        addRows([...e.dataTransfer.files], { node: at.node, before: at.before });
      }}
    >
      {drop && <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-ink" style={{ top: drop.y }} />}
      <div
        ref={root}
        data-body
        role="textbox"
        aria-multiline
        aria-label="The story"
        contentEditable
        suppressContentEditableWarning
        spellCheck
        onFocus={() => document.execCommand("defaultParagraphSeparator", false, "p")}
        onKeyDown={onKeyDown}
        onInput={onInput}
        onPaste={onPaste}
        onBlur={() => setSlash(null)}
        className={clsx(
          "t-body min-h-[40vh] text-[1.0625rem] leading-[1.8] whitespace-pre-wrap outline-none [overflow-wrap:anywhere]",
          // Set as the article sets it, but flush with the cover: a column of text, headings in Boska, photos wider.
          "[&>:is(p,h1,h2,h3,h4,h5,h6,ul,ol,div)]:w-full [&>:is(p,h1,h2,h3,h4,h5,h6,ul,ol,div)]:max-w-[42rem]",
          "[&>*+*]:mt-4 [&>:is(h1,h2)]:mt-12 [&>:is(h3,h4,h5,h6)]:mt-10 [&>:is(h1,h2,h3,h4,h5,h6)+*]:mt-4 [&>figure]:my-12 [&>:first-child]:mt-0",
          // The article's HEADING_2 and HEADING_3, written out so Tailwind sees them.
          "[&>:is(h1,h2,h3,h4,h5,h6)]:text-ink [&>:is(h1,h2)]:t-heading [&>:is(h1,h2)]:text-[clamp(1.625rem,2.2vw,2.125rem)] [&>:is(h1,h2)]:text-balance",
          "[&>:is(h3,h4,h5,h6)]:t-title [&>:is(h3,h4,h5,h6)]:text-[clamp(1.25rem,1.6vw,1.5rem)] [&>:is(h3,h4,h5,h6)]:text-balance",
          "[&_ul]:list-['–__'] [&_ol]:list-decimal [&>:is(ul,ol)]:pl-7 [&_li+li]:mt-2 [&_li]:leading-[1.75] [&_li::marker]:text-ink-mute",
          "[&_a]:text-ink [&_a]:underline [&_a]:decoration-ink/30 [&_a]:underline-offset-[0.22em] [&_b]:font-medium [&_b]:text-ink [&_strong]:font-medium [&_strong]:text-ink",
          "[&_[data-hint]]:relative [&_[data-hint]]:before:pointer-events-none [&_[data-hint]]:before:absolute [&_[data-hint]]:before:inset-x-0 [&_[data-hint]]:before:truncate [&_[data-hint]]:before:text-ink-mute/45 [&_[data-hint]]:before:content-[attr(data-hint)]",
        )}
      />

      {figures.map((f) => {
        // A row brought back by undo shows as waiting until the next read puts its photos back.
        const b = body.find((x) => x.id === f.id) as ImgBlock | undefined;
        if (holders.has(f.id) && !b?.images.length) {
          return createPortal(
            <PhotoPlaceholder key={f.id} onFiles={(files) => fillPlaceholder(f.id, files)} onRemove={() => removePlaceholder(f.id, f.node)} />,
            f.node,
            f.id,
          );
        }
        return createPortal(
          <PhotoRow
            key={f.id}
            block={b ?? { id: f.id, type: "img", images: [], caption: "" }}
            uploading={uploading}
            waiting={!b?.images.length}
            onChange={(fn) => updateRow(f.id, fn)}
            onAdd={(files) => void onFiles(files, { kind: "row", blockId: f.id })}
            onReplace={(index, files) => void onFiles(files.slice(0, 1), { kind: "replace", blockId: f.id, index })}
          />,
          f.node,
          f.id,
        );
      })}

      <Portal>
        <AnimatePresence>
          {slash && (
            <motion.div
              role="listbox"
              aria-label="Add"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onMouseDown={(e) => e.preventDefault()}
              className="fixed z-[90] w-64 border border-ink/10 bg-surface py-1.5 shadow-[0_24px_48px_-20px_rgb(22_20_18/0.25)]"
              style={{ left: Math.min(slash.x, innerWidth - 272), top: slash.y + 8 > innerHeight - 300 ? slash.y - 300 : slash.y + 8 }}
            >
              {shown.length ? (
                shown.map((c, i) => (
                  <button
                    key={c.kind}
                    type="button"
                    role="option"
                    aria-selected={i === slash.active}
                    onPointerMove={() => slash.active !== i && setSlash({ ...slash, active: i })}
                    onClick={() => run(c.kind, slash.query.length + 1)}
                    className={clsx("flex h-10 w-full items-center gap-3 px-4 text-left text-[0.875rem] transition-colors", i === slash.active ? "bg-paper text-ink" : "text-ink-soft")}
                  >
                    <Icon name={c.icon} className="size-4 shrink-0" strokeWidth={1.5} />
                    <span className="flex-1">{c.label}</span>
                    {c.hint && <span className="text-[0.75rem] text-ink-mute tabular-nums">{c.hint}</span>}
                  </button>
                ))
              ) : (
                <p className="px-4 py-2.5 text-[0.8125rem] text-ink-soft">Nothing called &lsquo;{slash.query}&rsquo;</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
}

// ── A photo to come ─────────────────────────────────────────────────────

function PhotoPlaceholder({ onFiles, onRemove }: { onFiles: (files: File[]) => void; onRemove: () => void }) {
  const [over, setOver] = useState(false);
  return (
    <div className="group/holder relative select-none">
      <button
        type="button"
        onClick={() => pickFiles(onFiles)}
        onDragOver={(e) => {
          if (![...e.dataTransfer.types].includes("Files")) return;
          e.preventDefault();
          e.stopPropagation();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOver(false);
          onFiles([...e.dataTransfer.files]);
        }}
        className={clsx(
          "flex aspect-[2/1] w-full flex-col items-center justify-center gap-3 border border-dashed transition-colors duration-300",
          over ? "border-ink bg-ink/[0.03]" : "border-ink/20 bg-surface hover:border-ink/40",
        )}
      >
        <Icon name="image" className="size-5 text-ink-soft" strokeWidth={1.25} />
        <span className="font-display text-[1.375rem] text-ink">Add a photo</span>
        <span className="text-[0.8125rem] text-ink-soft">Choose one, or up to three side by side. Or drop them here.</span>
      </button>
      <span className="absolute top-2 right-2 opacity-0 transition-opacity group-focus-within/holder:opacity-100 group-hover/holder:opacity-100">
        <OnPhoto onClick={onRemove}>Remove</OnPhoto>
      </span>
    </div>
  );
}

// ── A row of photos ─────────────────────────────────────────────────────

function PhotoRow({
  block,
  uploading,
  waiting,
  onChange,
  onAdd,
  onReplace,
}: {
  block: ImgBlock;
  uploading: Set<string>;
  /** Made a moment ago; its photos are still being read. */
  waiting: boolean;
  onChange: (fn: (b: ImgBlock) => ImgBlock) => void;
  onAdd: (files: File[]) => void;
  onReplace: (index: number, files: File[]) => void;
}) {
  const many = block.images.length > 1;
  const room = block.images.length < PHOTOS_PER_ROW;
  const width = block.wide || many ? "max-w-none" : "max-w-[42rem]";

  if (waiting) {
    return (
      <div>
        <span className="skeleton block aspect-[3/2] w-full" />
      </div>
    );
  }

  return (
    <div className={clsx("group/row w-full select-none", width)}>
      <div className="flex gap-3 max-sm:flex-col">
        {block.images.map((p, n) => {
          const ratio = ratioOf(p) ?? 3 / 2;
          return (
            <div key={`${p.src}-${n}`} className="group/photo relative min-w-0 max-sm:w-full max-sm:flex-none!"
              // One photo shows whole on screen, however tall; several share the width at one height.
              style={many ? { flex: `${ratio} 1 0%`, aspectRatio: ratio } : { aspectRatio: ratio, width: `min(100%, calc(80vh * ${ratio}))` }}
            >
              <Media src={photoUrl(p.src)} alt={p.alt} brief="" quiet sizes={many ? "400px" : "900px"} className="size-full" />
              {uploading.has(p.src) && <span aria-hidden className="skeleton absolute inset-0 opacity-60 mix-blend-multiply" />}
              <div className="absolute right-2 bottom-2 flex gap-1.5 opacity-0 transition-opacity group-focus-within/photo:opacity-100 group-hover/photo:opacity-100">
                <OnPhoto onClick={() => pickFiles((files) => onReplace(n, files), false)}>Replace</OnPhoto>
                <OnPhoto onClick={() => onChange((b) => ({ ...b, images: b.images.filter((_, j) => j !== n) }))}>Remove</OnPhoto>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <input
          value={block.caption}
          onChange={(e) => onChange((b) => ({ ...b, caption: e.target.value }))}
          placeholder="Caption, if it needs one"
          aria-label="Caption"
          className="t-small min-w-0 flex-1 bg-transparent placeholder:text-ink-mute/50 focus:outline-none"
        />
        <span className="flex shrink-0 gap-1 opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100">
          {room && <RowButton onClick={() => pickFiles(onAdd)}>Add a photo</RowButton>}
          {!many && (
            <RowButton onClick={() => onChange((b) => (b.wide ? { id: b.id, type: "img", images: b.images, caption: b.caption } : { ...b, wide: true }))}>
              {block.wide ? "Text width" : "Wide"}
            </RowButton>
          )}
        </span>
      </div>
      <div className="mt-2 space-y-1.5 opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100">
        {block.images.map((p, n) => (
          <AltField
            key={`${p.src}-${n}`}
            value={p.alt}
            onChange={(alt) => onChange((b) => ({ ...b, images: b.images.map((x, j) => (j === n ? { ...x, alt } : x)) }))}
          />
        ))}
      </div>
    </div>
  );
}

export function OnPhoto({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="bg-paper/92 px-3 py-1.5 text-[0.8125rem] text-ink backdrop-blur transition-colors hover:bg-paper">
      {children}
    </button>
  );
}

export function AltField({ value, onChange, className, style }: { value: string; onChange: (v: string) => void; className?: string; style?: React.CSSProperties }) {
  return (
    <label className={clsx("flex items-baseline gap-3 text-[0.8125rem]", className)} style={style}>
      <span className="shrink-0 text-ink-soft">Description</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="What's in the photo, for people who can't see it"
        className="min-w-0 flex-1 border-b border-transparent bg-transparent pb-0.5 text-ink placeholder:text-ink-mute/50 hover:border-ink/15 focus:border-ink/40 focus:outline-none"
      />
    </label>
  );
}

function RowButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="h-7 px-2 text-[0.8125rem] text-ink-soft transition-colors hover:bg-ink/[0.04] hover:text-ink">
      {children}
    </button>
  );
}
