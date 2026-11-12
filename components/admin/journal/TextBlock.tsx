"use client";

import clsx from "clsx";
import { useEffect, useLayoutEffect, useRef } from "react";
import { type Run, runsText, safeHref } from "@/lib/journal/blocks";

/*
 * One paragraph, subheading or list, edited in place as the article sets it. The browser's own
 * editing does the typing; this turns what it holds into runs (plain, bold, italic, link) and back,
 * and handles the keys that work across blocks: Return splits, Backspace at the start joins the
 * one above, the arrows step between blocks. Pasted text arrives plain, so no one's Word styling
 * comes with it.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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

/** What a piece of the editor holds, as runs. */
export function readRuns(node: Node, marks: Marks = {}, out: Run[] = []): Run[] {
  node.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const text = (n.textContent ?? "").replace(/ /g, " ");
      if (text) out.push({ text, ...marks });
    } else if (n instanceof HTMLElement) {
      if (n.tagName === "BR") return void out.push({ text: " ", ...marks });
      const t = n.tagName;
      const st = n.style;
      const href = t === "A" ? safeHref(n.getAttribute("href") ?? "") : undefined;
      readRuns(
        n,
        {
          ...marks,
          ...((t === "B" || t === "STRONG" || st.fontWeight === "bold" || Number(st.fontWeight) >= 600) && { bold: true }),
          ...((t === "I" || t === "EM" || st.fontStyle === "italic") && { italic: true }),
          ...(href && { href }),
        },
        out,
      );
    }
  });
  return out;
}

const fragmentRuns = (f: DocumentFragment) => readRuns(f);

/** Characters before the caret in `el`, and whether the selection is collapsed. */
function caret(el: HTMLElement) {
  const sel = getSelection();
  if (!sel || !sel.rangeCount || !el.contains(sel.anchorNode)) return null;
  const range = sel.getRangeAt(0);
  const before = document.createRange();
  before.selectNodeContents(el);
  before.setEnd(range.startContainer, range.startOffset);
  return { offset: before.toString().length, collapsed: range.collapsed, range };
}

/** Put the caret `offset` characters into `el` (or at the end). */
export function placeCaret(el: HTMLElement, offset: number | "start" | "end") {
  el.focus();
  const sel = getSelection();
  if (!sel) return;
  const range = document.createRange();
  if (offset === "start" || offset === "end") {
    range.selectNodeContents(el);
    range.collapse(offset === "start");
  } else {
    let left = offset;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    let placed = false;
    while (node) {
      const len = node.textContent?.length ?? 0;
      if (left <= len) {
        range.setStart(node, left);
        placed = true;
        break;
      }
      left -= len;
      node = walker.nextNode();
    }
    if (!placed) {
      range.selectNodeContents(el);
      range.collapse(false);
    } else range.collapse(true);
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

/** Is the caret on the first (or last) line of `el`? For stepping between blocks with the arrows. */
function onEdgeLine(el: HTMLElement, edge: "top" | "bottom") {
  const sel = getSelection();
  if (!sel?.rangeCount) return false;
  const r = sel.getRangeAt(0).getClientRects()[0] ?? sel.getRangeAt(0).getBoundingClientRect();
  const box = el.getBoundingClientRect();
  if (!r || (r.top === 0 && r.bottom === 0)) return true;
  const line = parseFloat(getComputedStyle(el).lineHeight) || 24;
  return edge === "top" ? r.top - box.top < line * 0.8 : box.bottom - r.bottom < line * 0.8;
}

export type Focus = { id: string; at: number | "start" | "end"; nonce: number };

export type TextBlockProps = {
  id: string;
  kind: "p" | "h" | "li";
  content: Run[];
  placeholder?: string;
  focus: Focus | null;
  className?: string;
  onChange: (content: Run[]) => void;
  /** Return: the text before and after the caret. */
  onSplit: (before: Run[], after: Run[]) => void;
  /** Backspace at the very start. */
  onJoinPrevious: () => void;
  /** Delete at the very end. */
  onJoinNext?: () => void;
  onStep: (dir: -1 | 1) => void;
  /** Markdown-style shortcuts at the start of a paragraph: "## " and "- ". */
  onShortcut?: (kind: "h" | "ul", rest: Run[]) => void;
  /** Several paragraphs pasted at once. */
  onPasteBlocks?: (before: Run[], paragraphs: string[], after: Run[]) => void;
  /** Image files pasted. */
  onPasteFiles?: (files: File[]) => void;
};

export function TextBlock({
  id,
  kind,
  content,
  placeholder,
  focus,
  className,
  onChange,
  onSplit,
  onJoinPrevious,
  onJoinNext,
  onStep,
  onShortcut,
  onPasteBlocks,
  onPasteFiles,
}: TextBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  // What this block last reported, so its own typing doesn't rewrite it (and lose the caret).
  const last = useRef<string | null>(null);
  const plain = kind === "h";

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const html = plain ? esc(runsText(content)) : runsHtml(content);
    if (last.current === html) return;
    el.innerHTML = html;
    last.current = html;
  }, [content, plain]);

  useEffect(() => {
    if (focus?.id === id && ref.current) placeCaret(ref.current, focus.at);
  }, [focus, id]);

  const emit = () => {
    const el = ref.current!;
    let runs = readRuns(el);
    if (plain) runs = runs.length ? [{ text: runsText(runs) }] : [];
    // Deleting everything can leave a stray <br>: clear it, so the placeholder shows again.
    if (!el.textContent) {
      runs = [];
      if (el.innerHTML) el.innerHTML = "";
    }
    last.current = plain ? esc(runsText(runs)) : runsHtml(runs);
    onChange(runs);
  };

  const split = () => {
    const el = ref.current!;
    const at = caret(el);
    if (!at) return;
    at.range.deleteContents();
    const head = document.createRange();
    head.selectNodeContents(el);
    head.setEnd(at.range.startContainer, at.range.startOffset);
    const tail = document.createRange();
    tail.selectNodeContents(el);
    tail.setStart(at.range.startContainer, at.range.startOffset);
    const before = fragmentRuns(head.cloneContents());
    const after = fragmentRuns(tail.cloneContents());
    onSplit(plain ? [{ text: runsText(before) }] : before, plain ? [{ text: runsText(after) }] : after);
  };

  return (
    <div
      ref={ref}
      id={`block-${id}`}
      role="textbox"
      aria-multiline={kind !== "h"}
      aria-label={kind === "h" ? "Subheading" : kind === "li" ? "List item" : "Paragraph"}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-placeholder={placeholder}
      onInput={emit}
      onKeyDown={(e) => {
        const el = e.currentTarget;
        const mod = e.metaKey || e.ctrlKey;
        if (mod && !plain && (e.key === "b" || e.key === "i")) {
          e.preventDefault();
          document.execCommand(e.key === "b" ? "bold" : "italic");
          emit();
          return;
        }
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          split();
          return;
        }
        if (e.key === "Enter" && e.shiftKey) {
          // One block is one paragraph: a soft return starts the next one too.
          e.preventDefault();
          split();
          return;
        }
        const at = caret(el);
        if (!at) return;
        const length = el.textContent?.length ?? 0;
        if (e.key === "Backspace" && at.collapsed && at.offset === 0) {
          e.preventDefault();
          onJoinPrevious();
        } else if (e.key === "Delete" && at.collapsed && at.offset === length && onJoinNext) {
          e.preventDefault();
          onJoinNext();
        } else if ((e.key === "ArrowUp" || (e.key === "ArrowLeft" && at.offset === 0)) && at.collapsed && (e.key === "ArrowLeft" || onEdgeLine(el, "top"))) {
          e.preventDefault();
          onStep(-1);
        } else if ((e.key === "ArrowDown" || (e.key === "ArrowRight" && at.offset === length)) && at.collapsed && (e.key === "ArrowRight" || onEdgeLine(el, "bottom"))) {
          e.preventDefault();
          onStep(1);
        } else if (e.key === " " && onShortcut && at.collapsed) {
          const text = el.textContent ?? "";
          const typed = text.slice(0, at.offset);
          if (typed === "##" || typed === "-" || typed === "*") {
            e.preventDefault();
            const rest = readRuns(el);
            const restText = runsText(rest).slice(typed.length);
            onShortcut(typed === "##" ? "h" : "ul", restText ? [{ text: restText }] : []);
          }
        }
      }}
      onPaste={(e) => {
        const files = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"));
        if (files.length && onPasteFiles) {
          e.preventDefault();
          onPasteFiles(files);
          return;
        }
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain").replace(/\r\n?/g, "\n");
        const paragraphs = text
          .split(/\n\s*\n|\n/)
          .map((p) => p.replace(/\s+/g, " ").trim())
          .filter(Boolean);
        if (paragraphs.length > 1 && onPasteBlocks && !plain) {
          const el = e.currentTarget;
          const at = caret(el);
          if (!at) return;
          at.range.deleteContents();
          const head = document.createRange();
          head.selectNodeContents(el);
          head.setEnd(at.range.startContainer, at.range.startOffset);
          const tail = document.createRange();
          tail.selectNodeContents(el);
          tail.setStart(at.range.startContainer, at.range.startOffset);
          onPasteBlocks(fragmentRuns(head.cloneContents()), paragraphs, fragmentRuns(tail.cloneContents()));
          return;
        }
        document.execCommand("insertText", false, paragraphs.join(" "));
      }}
      className={clsx(
        "relative min-w-0 whitespace-pre-wrap outline-none [overflow-wrap:anywhere]",
        "empty:before:pointer-events-none empty:before:text-ink-mute/45 empty:before:content-[attr(data-placeholder)]",
        "[&_a]:text-ink [&_a]:underline [&_a]:decoration-ink/30 [&_a]:underline-offset-[0.22em] [&_b]:font-medium [&_b]:text-ink",
        className,
      )}
    />
  );
}
