"use client";

import clsx from "clsx";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { type Inline, normaliseBlocks, parseBlock, type Run, serialiseBlock, splitStory, STORY_RULES, type StoryBlock, storyLength } from "@/lib/story";

/*
 * The story editor: what you see is how the vendor page sets it. Body text or a small subheading,
 * bold (medium weight), italic, underline and lists, nothing else: no fonts, sizes or colours, and
 * pasted text arrives plain, so no one's Word styling or emoji bullets come with it. The house rules in lib/story.ts are applied to what's saved, and the foot
 * of the panel says when one of them has kicked in.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const runsHtml = (c: Inline) =>
  c
    .map((r) => {
      let h = esc(r.text);
      if (r.italic) h = `<i>${h}</i>`;
      if (r.underline) h = `<u>${h}</u>`;
      if (r.bold) h = `<b>${h}</b>`;
      return h;
    })
    .join("");

function toHtml(story: string) {
  const blocks = splitStory(story).map(parseBlock);
  if (!blocks.length) return "<p><br></p>";
  return blocks
    .map((b) =>
      b.type === "h"
        ? `<h3>${esc(b.text)}</h3>`
        : b.type === "p"
          ? `<p>${runsHtml(b.content) || "<br>"}</p>`
          : `<${b.type}>${b.items.map((i) => `<li>${runsHtml(i)}</li>`).join("")}</${b.type}>`,
    )
    .join("");
}

type Marks = Omit<Run, "text">;

function inline(node: Node, marks: Marks = {}, out: Inline = []): Inline {
  node.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) out.push({ text: n.textContent ?? "", ...marks });
    else if (n instanceof HTMLElement) {
      if (n.tagName === "BR") return void out.push({ text: " " });
      const t = n.tagName;
      const st = n.style;
      inline(
        n,
        {
          bold: marks.bold || t === "B" || t === "STRONG" || st.fontWeight === "bold" || Number(st.fontWeight) >= 500 || undefined,
          italic: marks.italic || t === "I" || t === "EM" || st.fontStyle === "italic" || undefined,
          underline: marks.underline || t === "U" || st.textDecoration.includes("underline") || st.textDecorationLine.includes("underline") || undefined,
        },
        out,
      );
    }
  });
  return out;
}

// Browsers nest freely (a list inside a paragraph, a paragraph inside a div), so any element that
// holds blocks is read as the blocks it holds.
const BLOCK = /^(P|DIV|UL|OL|H[1-6]|BLOCKQUOTE|SECTION)$/;

function toBlocks(root: Node, blocks: StoryBlock[] = []): StoryBlock[] {
  let loose: Inline = [];
  const flush = () => {
    if (loose.length) blocks.push({ type: "p", content: loose });
    loose = [];
  };
  root.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) return void loose.push({ text: n.textContent ?? "" });
    if (!(n instanceof HTMLElement)) return;
    const tag = n.tagName;
    if (!BLOCK.test(tag)) return void loose.push(...inline({ childNodes: [n] } as unknown as Node));
    flush();
    if (/^H[1-6]$/.test(tag)) blocks.push({ type: "h", text: n.textContent ?? "" });
    else if (tag === "UL" || tag === "OL") blocks.push({ type: tag === "UL" ? "ul" : "ol", items: [...n.querySelectorAll("li")].map((li) => inline(li)) });
    else if ([...n.children].some((c) => BLOCK.test(c.tagName))) toBlocks(n, blocks);
    else blocks.push({ type: "p", content: inline(n) });
  });
  flush();
  return blocks;
}

type Format = "p" | "h" | "ul" | "ol";
type Mark = "bold" | "italic" | "underline";
type Tool = Format | Mark;

/**
 * `inline` sets the story exactly as the vendor page does, with no box: the formatting bar opens in
 * place above it while you write, and the count only shows near the limit (the vendor's own
 * listing). The default is a panel of its own, for the application.
 */
export function StoryEditor({ value, onChange, label, inline }: { value: string; onChange: (story: string) => void; label: string; inline?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(!value.trim());
  const [format, setFormat] = useState<Format>("p");
  const [marks, setMarks] = useState<Record<Mark, boolean>>({ bold: false, italic: false, underline: false });
  const [notes, setNotes] = useState<string[]>([]);
  const [length, setLength] = useState(0);

  // Load the saved story once; after that the editor owns its DOM.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = toHtml(value);
    document.execCommand("defaultParagraphSeparator", false, "p");
    document.execCommand("styleWithCSS", false, "false");
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first render only
  }, []);

  function sync() {
    const el = ref.current;
    if (!el) return;
    const raw = toBlocks(el);
    const clean = normaliseBlocks(raw);
    const n = storyLength(clean);
    setLength(n);
    setEmpty(n === 0);
    const headings = raw.filter((b) => b.type === "h" && b.text.trim()).length;
    const next: string[] = [];
    if (headings > STORY_RULES.maxHeadings) next.push(`Up to ${STORY_RULES.maxHeadings} subheadings; the rest are set as text.`);
    if (raw.some((b) => (b.type === "ul" || b.type === "ol") && b.items.length > STORY_RULES.maxItems)) next.push(`Lists keep their first ${STORY_RULES.maxItems} points.`);
    if (raw.some((b) => b.type === "h" && b.text.trim().length > STORY_RULES.headingChars)) next.push("Subheadings are kept short; try fewer words.");
    setNotes(next);
    onChange(clean.map(serialiseBlock).join("\n\n"));
  }

  function readState() {
    const sel = getSelection();
    const node = sel?.anchorNode;
    if (!node || !ref.current?.contains(node)) return;
    const el = (node instanceof HTMLElement ? node : node.parentElement)!;
    setFormat(el.closest("ul") ? "ul" : el.closest("ol") ? "ol" : el.closest("h1,h2,h3,h4") ? "h" : "p");
    setMarks({ bold: document.queryCommandState("bold"), italic: document.queryCommandState("italic"), underline: document.queryCommandState("underline") });
  }

  useEffect(() => {
    document.addEventListener("selectionchange", readState);
    return () => document.removeEventListener("selectionchange", readState);
  }, []);

  function apply(f: Tool) {
    ref.current?.focus();
    if (f === "bold" || f === "italic" || f === "underline") document.execCommand(f);
    else if (f === "ul" || f === "ol") document.execCommand(f === "ul" ? "insertUnorderedList" : "insertOrderedList");
    else if (f !== format) {
      // Out of a list first, so a heading or body line is never set inside one.
      if (format === "ul" || format === "ol") document.execCommand(format === "ul" ? "insertUnorderedList" : "insertOrderedList");
      document.execCommand("formatBlock", false, f === "h" ? "h3" : "p");
    }
    sync();
    readState();
  }

  const icon = (d: string) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.25} className="size-[18px]" aria-hidden>
      <path d={d} />
    </svg>
  );
  const groups: { id: Tool; label: string; on: boolean; icon: React.ReactNode }[][] = [
    [
      { id: "p", label: "Body", on: format === "p", icon: "Body" },
      { id: "h", label: "Heading", on: format === "h", icon: "Heading" },
    ],
    [
      { id: "bold", label: "Bold", on: marks.bold, icon: <span className="font-medium">B</span> },
      { id: "italic", label: "Italic", on: marks.italic, icon: <span className="italic">I</span> },
      { id: "underline", label: "Underline", on: marks.underline, icon: <span className="underline decoration-1 underline-offset-[3px]">U</span> },
    ],
    [
      { id: "ul", label: "List", on: format === "ul", icon: icon("M9 7h11M9 12h11M9 17h11M4.5 7h1M4.5 12h1M4.5 17h1") },
      {
        id: "ol",
        label: "Numbered list",
        on: format === "ol",
        icon: icon("M10 7h10M10 12h10M10 17h10M4.5 5.5 5.5 5v4M4.5 10.8c.4-.5 1.6-.6 1.6.3 0 .7-1.6 1.6-1.6 2.4h1.7M4.5 15.4h1.6l-.9 1.1c.6 0 1 .3 1 .8 0 .8-1.2 1-1.7.5"),
      },
    ],
  ];

  return (
    <div className={clsx("group/story", !inline && "border hairline bg-surface transition-colors focus-within:border-ink")}>
      {/* Inline, the bar opens in place above the story while you write, so it never covers anything. */}
      <div
        className={clsx(
          inline &&
            "grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-500 ease-out-expo group-focus-within/story:grid-rows-[1fr] group-focus-within/story:opacity-100",
        )}
      >
        <div className={clsx(inline && "min-h-0 overflow-hidden")}>
          <div
            role="toolbar"
            aria-label="Formatting"
            className={clsx("flex flex-wrap items-center", inline ? "mb-4 w-fit border hairline bg-surface px-1.5 py-1" : "border-b hairline px-2 py-1.5")}
          >
            {groups.map((group, g) => (
              <div key={g} className={clsx("flex items-center gap-0.5", g > 0 && "ml-2 border-l hairline pl-2")}>
                {group.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    title={t.label}
                    aria-label={t.label}
                    aria-pressed={t.on}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => apply(t.id)}
                    className={clsx(
                      "grid place-items-center text-[0.9375rem] leading-none transition-colors",
                      inline ? "h-8" : "h-9",
                      typeof t.icon === "string" ? "px-3" : "w-9",
                      t.on ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper hover:text-ink",
                    )}
                  >
                    {t.icon}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="relative">
        {empty && (
          <p
            aria-hidden
            className={clsx("pointer-events-none absolute", inline ? "t-body top-0 left-0 text-ink-mute/50" : "top-6 left-6 text-[1.0625rem] text-ink-mute/60 sm:top-7 sm:left-7")}
          >
            {inline ? "Tell couples about your work: who you are, how you work and the traditions you know." : "Start with who you are and how you work."}
          </p>
        )}
        <div
          ref={ref}
          role="textbox"
          aria-multiline
          aria-label={label}
          contentEditable
          suppressContentEditableWarning
          onInput={sync}
          onKeyDown={(e) => {
            const key = { b: "bold", i: "italic", u: "underline" }[e.key.toLowerCase()] as Mark | undefined;
            if ((e.metaKey || e.ctrlKey) && key) {
              e.preventDefault();
              apply(key);
            }
            // Keep Enter inside the editor rather than submitting the step.
            if (e.key === "Enter") e.stopPropagation();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain").replace(/\r/g, "");
            document.execCommand("insertText", false, text);
          }}
          className={clsx(
            inline ? "min-h-[3.4em] text-[1rem] leading-[1.7] text-ink outline-none" : "min-h-[30rem] p-6 text-[1.0625rem] leading-[1.7] text-ink outline-none sm:p-7",
            "[&_p+p]:mt-4 [&_p+h3]:mt-8 [&_ul+h3]:mt-8 [&_ol+h3]:mt-8 [&_*+ul]:mt-4 [&_*+ol]:mt-4 [&_ul+p]:mt-4 [&_ol+p]:mt-4 [&_h3+p]:mt-3 [&_h3+ul]:mt-4 [&_h3+ol]:mt-4",
            "[&_h3]:font-display [&_h3]:text-[1.375rem] [&_h3]:leading-[1.2] [&_h3]:tracking-[-0.01em]",
            "[&_strong]:font-medium [&_b]:font-medium [&_u]:decoration-1 [&_u]:underline-offset-[0.2em]",
            "[&_ol]:[counter-reset:item] [&_li+li]:mt-1.5 [&_li]:relative [&_li]:pl-7",
            "[&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:text-ink-mute [&_ul>li]:before:content-['–']",
            "[&_ol>li]:[counter-increment:item] [&_ol>li]:before:absolute [&_ol>li]:before:left-0 [&_ol>li]:before:text-ink-mute [&_ol>li]:before:tabular-nums [&_ol>li]:before:content-[counter(item)]",
          )}
        />
      </div>
      {(!inline || notes.length > 0 || length > STORY_RULES.maxChars * 0.8) && (
        <div className={clsx("flex items-baseline justify-between gap-4", inline ? "mt-3" : "border-t hairline px-6 py-3 sm:px-7")}>
          <p className="t-small">{notes[0] ?? (inline ? "" : "Short paragraphs read best. Use a list for what you offer.")}</p>
          <p className={clsx("t-small shrink-0 tabular-nums", length > STORY_RULES.maxChars && "text-bad")}>
            {length} / {STORY_RULES.maxChars}
          </p>
        </div>
      )}
    </div>
  );
}
