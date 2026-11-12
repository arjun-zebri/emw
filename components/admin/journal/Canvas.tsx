"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import { postDate } from "@/components/journal/Article";
import type { PostContent } from "@/lib/admin/journal";
import { type Block, blockId, PHOTOS_PER_ROW, type Photo, photoUrl, ratioOf, type Run, runsText } from "@/lib/journal/blocks";
import { convert, emptyParagraph, type PhotoTarget, runsOf } from "./ops";
import { type Focus, TextBlock } from "./TextBlock";

/*
 * The post, written where it will be read: the title, standfirst and line set as the article sets
 * them, the cover at its own shape, then the body. Photos are dropped or pasted anywhere, or chosen
 * from the library; a row holds up to three. Each block has a handle on its left for the rarer
 * things (change its kind, move it, remove it), so the page itself stays quiet.
 */

type Props = {
  content: PostContent;
  update: (fn: (c: PostContent) => PostContent) => void;
  /** Photos still uploading, by preview URL. */
  uploading: Set<string>;
  onFiles: (files: File[], target: PhotoTarget) => void;
  onLibrary: (target: PhotoTarget) => void;
  /** The date shown in the line under the title. */
  date?: string;
  minutes: number;
  focus: Focus | null;
  setFocus: (f: Focus) => void;
};

let nonce = 0;
const focusOn = (id: string, at: Focus["at"]): Focus => ({ id, at, nonce: ++nonce });

const TEXT = "mx-auto w-full max-w-[42rem]";

export function Canvas({ content, update, uploading, onFiles, onLibrary, date, minutes, focus, setFocus }: Props) {
  const body = content.body;
  const [dropAt, setDropAt] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const setBody = (fn: (b: Block[]) => Block[]) => update((c) => ({ ...c, body: fn(c.body) }));
  const replace = (id: string, next: Block | Block[]) => setBody((bs) => bs.flatMap((b) => (b.id === id ? next : b)));
  const textIds = body.filter((b) => b.type !== "img").map((b) => b.id);

  /** Focus a neighbouring text block (or the standfirst above the first). An unknown id steps from the top. */
  const step = (id: string, dir: -1 | 1) => {
    const i = body.findIndex((b) => b.id === id);
    for (let j = i + dir; j >= 0 && j < body.length; j += dir) {
      const b = body[j];
      if (b.type === "ul") return setFocus(focusOn(`${b.id}:${dir < 0 ? b.items.length - 1 : 0}`, dir < 0 ? "end" : "start"));
      if (b.type !== "img") return setFocus(focusOn(b.id, dir < 0 ? "end" : "start"));
    }
    if (dir < 0) setFocus(focusOn("standfirst", "end"));
  };

  /** Backspace at the start of a block: join it to the text block above, or just remove it if empty. */
  const joinPrevious = (id: string) => {
    const i = body.findIndex((b) => b.id === id);
    const b = body[i];
    const prev = body[i - 1];
    if (!prev) {
      // The first block: an empty one goes, so the body can start with a photo; otherwise stay.
      if (!runsText(runsOf(b))) {
        if (body.length > 1) setBody((bs) => bs.slice(1));
        setFocus(focusOn("standfirst", "end"));
      }
      return;
    }
    if (prev.type === "img") {
      if (!runsText(runsOf(b))) {
        setBody((bs) => bs.filter((x) => x.id !== id));
        step(prev.id, -1);
      }
      return;
    }
    const at = runsText(runsOf(prev)).length;
    if (prev.type === "ul") {
      const items = [...prev.items];
      const lastItem = items.length - 1;
      items[lastItem] = [...items[lastItem], ...runsOf(b)];
      setBody((bs) => bs.flatMap((x) => (x.id === id ? [] : x.id === prev.id ? { ...prev, items } : x)));
      setFocus(focusOn(`${prev.id}:${lastItem}`, runsText(prev.items[lastItem]).length));
      return;
    }
    const merged: Block = prev.type === "h" ? { ...prev, text: prev.text + runsText(runsOf(b)) } : { ...prev, content: [...prev.content, ...runsOf(b)] };
    setBody((bs) => bs.flatMap((x) => (x.id === id ? [] : x.id === prev.id ? merged : x)));
    setFocus(focusOn(prev.id, at));
  };

  const insertAt = (index: number, block: Block) => {
    setBody((bs) => [...bs.slice(0, index), block, ...bs.slice(index)]);
    if (block.type === "ul") setFocus(focusOn(`${block.id}:0`, "start"));
    else if (block.type !== "img") setFocus(focusOn(block.id, "start"));
  };

  // Files dragged over the page: show where they'd land, between blocks.
  const indexAt = (y: number) => {
    const nodes = [...(root.current?.querySelectorAll<HTMLElement>("[data-block]") ?? [])];
    const i = nodes.findIndex((n) => {
      const r = n.getBoundingClientRect();
      return y < r.top + r.height / 2;
    });
    return i < 0 ? nodes.length : i;
  };
  const hasFiles = (e: React.DragEvent) => [...e.dataTransfer.types].includes("Files");

  return (
    <div
      ref={root}
      data-canvas
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDropAt(indexAt(e.clientY));
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropAt(null);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
        const at = dropAt ?? body.length;
        setDropAt(null);
        if (files.length) onFiles(files, { kind: "insert", index: at });
      }}
      className="min-w-0 pb-24"
    >
      <header className={TEXT}>
        <Plain
          id="title"
          value={content.title}
          onChange={(title) => update((c) => ({ ...c, title }))}
          placeholder="Title"
          focus={focus}
          onEnter={() => setFocus(focusOn("standfirst", "end"))}
          onDown={() => setFocus(focusOn("standfirst", "start"))}
          className="t-display text-[clamp(2.5rem,4.4vw,4.25rem)] text-balance"
        />
        <Plain
          id="standfirst"
          value={content.standfirst}
          onChange={(standfirst) => update((c) => ({ ...c, standfirst }))}
          placeholder="A line or two to draw readers in"
          focus={focus}
          onEnter={() => (body[0] && body[0].type !== "img" ? step("", 1) : insertAt(0, emptyParagraph()))}
          onUp={() => setFocus(focusOn("title", "end"))}
          onDown={() => (textIds[0] ? step("", 1) : undefined)}
          className="t-body mt-6 max-w-[40ch] text-[clamp(1.125rem,1.5vw,1.3125rem)] leading-[1.5] text-pretty"
        />
        <p className="t-small mt-6 flex flex-wrap gap-x-2">
          <span>{content.category}</span>
          <span aria-hidden>·</span>
          <span>{date ? postDate(date) : "Not yet published"}</span>
          <span aria-hidden>·</span>
          <span>{minutes} min read</span>
          {content.author.trim() && content.author.trim() !== "East Meets Wed" && (
            <>
              <span aria-hidden>·</span>
              <span>{content.author}</span>
            </>
          )}
        </p>
      </header>

      <Cover
        photo={content.cover}
        uploading={!!content.cover && uploading.has(content.cover.src)}
        onFiles={(files) => onFiles(files.slice(0, 1), { kind: "cover" })}
        onLibrary={() => onLibrary({ kind: "cover" })}
        onAlt={(alt) => update((c) => (c.cover ? { ...c, cover: { ...c.cover, alt } } : c))}
        onRemove={() => update((c) => ({ ...c, cover: null }))}
      />

      <div className="mt-12">
        {body.map((b, i) => (
          <div key={b.id} data-block className="relative">
            {dropAt === i && <DropLine />}
            <BlockFrame
              block={b}
              first={i === 0}
              last={i === body.length - 1}
              onKind={(kind) => {
                replace(b.id, convert(b, kind));
                setFocus(kind === "ul" ? focusOn(`${b.id}:0`, "end") : focusOn(b.id, "end"));
              }}
              onMove={(dir) =>
                setBody((bs) => {
                  const j = i + dir;
                  if (j < 0 || j >= bs.length) return bs;
                  const next = [...bs];
                  [next[i], next[j]] = [next[j], next[i]];
                  return next;
                })
              }
              onRemove={() => setBody((bs) => bs.filter((x) => x.id !== b.id))}
              onPhotos={() => onLibrary({ kind: "insert", index: i })}
            >
              {b.type === "img" ? (
                <PhotoRow
                  block={b}
                  uploading={uploading}
                  onChange={(next) => replace(b.id, next)}
                  onAdd={() => onLibrary({ kind: "add", blockId: b.id })}
                  onAddFiles={(files) => onFiles(files, { kind: "add", blockId: b.id })}
                  onReplace={(index) => onLibrary({ kind: "replace", blockId: b.id, index })}
                />
              ) : b.type === "ul" ? (
                <ListBlock
                  block={b}
                  focus={focus}
                  setFocus={setFocus}
                  onChange={(next) => replace(b.id, next)}
                  onExit={(after) => {
                    const p: Block = { id: blockId(), type: "p", content: after };
                    setBody((bs) => bs.flatMap((x) => (x.id === b.id ? (b.items.length > 1 ? [{ ...b, items: b.items.slice(0, -1) }, p] : [p]) : x)));
                    setFocus(focusOn(p.id, "start"));
                  }}
                  onJoinPrevious={() => joinPrevious(b.id)}
                  onStep={(dir) => step(b.id, dir)}
                />
              ) : (
                <TextBlock
                  id={b.id}
                  kind={b.type}
                  content={b.type === "p" ? b.content : b.text ? [{ text: b.text }] : []}
                  focus={focus}
                  placeholder={b.type === "h" ? "Subheading" : i === 0 && body.length === 1 ? "Tell the story. Drop photos anywhere." : "Write, or type ## for a subheading, - for a list"}
                  className={b.type === "h" ? clsx(TEXT, "t-heading text-[clamp(1.625rem,2.2vw,2.125rem)] text-balance", i > 0 && "mt-12") : clsx(TEXT, "t-body text-[1.0625rem] leading-[1.8]", gapFor(body[i - 1]))}
                  onChange={(runs) => replace(b.id, b.type === "h" ? { ...b, text: runsText(runs) } : { ...b, content: runs })}
                  onSplit={(before, after) => {
                    const next: Block = { id: blockId(), type: "p", content: after };
                    const kept: Block = b.type === "h" ? { ...b, text: runsText(before) } : { ...b, content: before };
                    replace(b.id, [kept, next]);
                    setFocus(focusOn(next.id, "start"));
                  }}
                  onJoinPrevious={() => joinPrevious(b.id)}
                  onJoinNext={() => {
                    const next = body[i + 1];
                    if (next && next.type !== "img") joinPrevious(next.id);
                  }}
                  onStep={(dir) => step(b.id, dir)}
                  onShortcut={
                    b.type === "p"
                      ? (kind, rest) => {
                          replace(b.id, kind === "h" ? { id: b.id, type: "h", text: runsText(rest) } : { id: b.id, type: "ul", items: [rest] });
                          setFocus(kind === "h" ? focusOn(b.id, "start") : focusOn(`${b.id}:0`, "start"));
                        }
                      : undefined
                  }
                  onPasteBlocks={(before, paragraphs, after) => {
                    const blocks: Block[] = paragraphs.map((text) => ({ id: blockId(), type: "p", content: [{ text }] }));
                    const firstBlock = blocks[0] as Extract<Block, { type: "p" }>;
                    firstBlock.content = [...before, ...firstBlock.content];
                    const lastBlock = blocks.at(-1) as Extract<Block, { type: "p" }>;
                    const end = runsText(lastBlock.content).length;
                    lastBlock.content = [...lastBlock.content, ...after];
                    replace(b.id, b.type === "h" ? [{ ...b, text: runsText(before) }, ...blocks.slice(1)] : blocks);
                    setFocus(focusOn(lastBlock.id, end));
                  }}
                  onPasteFiles={(files) => onFiles(files, { kind: "insert", index: i + 1 })}
                />
              )}
            </BlockFrame>
          </div>
        ))}
        {dropAt === body.length && <DropLine />}
        <AddRow
          empty={!body.length}
          onAdd={(kind) => {
            if (kind === "img") return onLibrary({ kind: "insert", index: body.length });
            const last = body.at(-1);
            // An empty paragraph at the end is reused rather than stacking up blank ones.
            if (last && last.type === "p" && !runsText(last.content)) {
              if (kind === "p") return setFocus(focusOn(last.id, "start"));
              replace(last.id, convert(last, kind));
              return setFocus(kind === "ul" ? focusOn(`${last.id}:0`, "start") : focusOn(last.id, "start"));
            }
            insertAt(body.length, kind === "h" ? { id: blockId(), type: "h", text: "" } : kind === "ul" ? { id: blockId(), type: "ul", items: [[]] } : emptyParagraph());
          }}
        />
      </div>
    </div>
  );
}

const gapFor = (prev?: Block) => (!prev ? "" : prev.type === "h" ? "mt-4" : prev.type === "img" ? "" : "mt-6");

function DropLine() {
  return <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-3 z-10 h-0.5 bg-ink" />;
}

// ── Title and standfirst ────────────────────────────────────────────────

function Plain({
  id,
  value,
  onChange,
  placeholder,
  focus,
  onEnter,
  onUp,
  onDown,
  className,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  focus: Focus | null;
  onEnter: () => void;
  onUp?: () => void;
  onDown?: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  useEffect(() => {
    if (focus?.id !== id || !ref.current) return;
    const el = ref.current;
    el.focus();
    const at = focus.at === "start" ? 0 : focus.at === "end" ? el.value.length : focus.at;
    el.setSelectionRange(at, at);
  }, [focus, id]);
  return (
    <textarea
      ref={ref}
      id={`block-${id}`}
      rows={1}
      value={value}
      aria-label={id === "title" ? "Title" : "Standfirst"}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))}
      onKeyDown={(e) => {
        const el = e.currentTarget;
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter();
        } else if (e.key === "ArrowUp" && onUp && el.selectionStart === 0) {
          e.preventDefault();
          onUp();
        } else if (e.key === "ArrowDown" && onDown && el.selectionEnd === el.value.length) {
          e.preventDefault();
          onDown();
        }
      }}
      className={clsx("block w-full resize-none overflow-hidden bg-transparent p-0 placeholder:text-ink-mute/40 focus:outline-none", className)}
    />
  );
}

// ── Lists ───────────────────────────────────────────────────────────────

function ListBlock({
  block,
  focus,
  setFocus,
  onChange,
  onExit,
  onJoinPrevious,
  onStep,
}: {
  block: Extract<Block, { type: "ul" }>;
  focus: Focus | null;
  setFocus: (f: Focus) => void;
  onChange: (b: Block) => void;
  onExit: (after: Run[]) => void;
  onJoinPrevious: () => void;
  onStep: (dir: -1 | 1) => void;
}) {
  const items = block.items.length ? block.items : [[]];
  const set = (fn: (items: Run[][]) => Run[][]) => onChange({ ...block, items: fn(items) });
  return (
    <ul className={clsx(TEXT, "t-body mt-6 space-y-2 text-[1.0625rem] leading-[1.75]")}>
      {items.map((item, n) => (
        <li key={n} className="flex gap-3">
          <span aria-hidden className="w-4 shrink-0 text-ink-mute">
            –
          </span>
          <TextBlock
            id={`${block.id}:${n}`}
            kind="li"
            content={item}
            focus={focus}
            placeholder="List item"
            className="flex-1"
            onChange={(runs) => set((is) => is.map((x, j) => (j === n ? runs : x)))}
            onSplit={(before, after) => {
              // Return on an empty last item leaves the list.
              if (!runsText(before) && !runsText(after) && n === items.length - 1) return onExit([]);
              set((is) => [...is.slice(0, n), before, after, ...is.slice(n + 1)]);
              setFocus(focusOn(`${block.id}:${n + 1}`, "start"));
            }}
            onJoinPrevious={() => {
              if (n === 0) {
                // Backspace at the start of the first item turns it back into a paragraph.
                if (items.length === 1) return onChange({ id: block.id, type: "p", content: item });
                return onJoinPrevious();
              }
              const at = runsText(items[n - 1]).length;
              set((is) => [...is.slice(0, n - 1), [...is[n - 1], ...is[n]], ...is.slice(n + 1)]);
              setFocus(focusOn(`${block.id}:${n - 1}`, at));
            }}
            onStep={(dir) => {
              const j = n + dir;
              if (j >= 0 && j < items.length) setFocus(focusOn(`${block.id}:${j}`, dir < 0 ? "end" : "start"));
              else onStep(dir);
            }}
          />
        </li>
      ))}
    </ul>
  );
}

// ── Block handle ────────────────────────────────────────────────────────

function BlockFrame({
  block,
  first,
  last,
  onKind,
  onMove,
  onRemove,
  onPhotos,
  children,
}: {
  block: Block;
  first: boolean;
  last: boolean;
  onKind: (k: "p" | "h" | "ul") => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onPhotos: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !menu.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const text = block.type !== "img";
  const items: { label: string; icon: IconName; run: () => void; on?: boolean; danger?: boolean; disabled?: boolean }[] = [
    ...(text
      ? [
          { label: "Paragraph", icon: "text" as const, run: () => onKind("p"), on: block.type === "p" },
          { label: "Subheading", icon: "heading" as const, run: () => onKind("h"), on: block.type === "h" },
          { label: "List", icon: "list" as const, run: () => onKind("ul"), on: block.type === "ul" },
          { label: "Photos above", icon: "image" as const, run: onPhotos },
        ]
      : []),
    { label: "Move up", icon: "arrow-up", run: () => onMove(-1), disabled: first },
    { label: "Move down", icon: "arrow-down", run: () => onMove(1), disabled: last },
    { label: "Remove", icon: "trash", run: onRemove, danger: true },
  ];

  return (
    <div className="group/block relative">
      <div ref={menu} className="absolute top-0 -left-11 z-20 hidden h-full lg:block">
        <button
          type="button"
          aria-label="Block options"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={clsx(
            "sticky top-24 mt-1 flex size-7 items-center justify-center text-ink-mute transition-[opacity,color] hover:text-ink",
            open ? "text-ink opacity-100" : "opacity-0 group-focus-within/block:opacity-100 group-hover/block:opacity-100",
          )}
        >
          <Icon name="grip" className="size-4" />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-9 left-0 z-40 w-48 border border-ink/10 bg-surface py-1.5 shadow-[0_24px_48px_-20px_rgb(22_20_18/0.22)]"
            >
              {items.map((it, n) => (
                <button
                  key={it.label}
                  type="button"
                  role="menuitem"
                  disabled={it.disabled}
                  onClick={() => {
                    setOpen(false);
                    it.run();
                  }}
                  className={clsx(
                    "flex h-9 w-full items-center gap-3 px-4 text-left text-[0.875rem] transition-colors hover:bg-paper disabled:opacity-35 disabled:hover:bg-transparent",
                    it.danger ? "text-bad" : it.on ? "text-ink" : "text-ink-soft hover:text-ink",
                    text && n === 4 && "mt-1.5 border-t hairline pt-1.5 h-[2.625rem]",
                  )}
                >
                  <Icon name={it.icon} className="size-3.5" strokeWidth={1.5} />
                  <span className="flex-1">{it.label}</span>
                  {it.on && <Icon name="check" className="size-3.5" strokeWidth={1.5} />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {children}
    </div>
  );
}

function AddRow({ empty, onAdd }: { empty: boolean; onAdd: (kind: "p" | "h" | "ul" | "img") => void }) {
  const options: { kind: "p" | "h" | "ul" | "img"; label: string; icon: IconName }[] = [
    { kind: "p", label: "Paragraph", icon: "text" },
    { kind: "h", label: "Subheading", icon: "heading" },
    { kind: "ul", label: "List", icon: "list" },
    { kind: "img", label: "Photos", icon: "image" },
  ];
  return (
    <div className={clsx(TEXT, "mt-10 flex flex-wrap items-center gap-x-1 gap-y-2 border-t border-dashed border-ink/15 pt-4", empty && "mt-0")}>
      <span className="mr-2 text-[0.8125rem] text-ink-soft">Add</span>
      {options.map((o) => (
        <button
          key={o.kind}
          type="button"
          onClick={() => onAdd(o.kind)}
          className="inline-flex h-8 items-center gap-1.5 px-2.5 text-[0.8125rem] text-ink-soft transition-colors hover:bg-ink/[0.04] hover:text-ink"
        >
          <Icon name={o.icon} className="size-3.5" strokeWidth={1.5} />
          {o.label}
        </button>
      ))}
      <span className="ml-auto hidden text-[0.75rem] text-ink-soft sm:inline">or drop photos anywhere</span>
    </div>
  );
}

// ── Photos ──────────────────────────────────────────────────────────────

function pickFiles(onFiles: (files: File[]) => void, multiple = true) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = multiple;
  input.onchange = () => onFiles([...(input.files ?? [])]);
  input.click();
}

function Cover({
  photo,
  uploading,
  onFiles,
  onLibrary,
  onAlt,
  onRemove,
}: {
  photo: Photo | null;
  uploading: boolean;
  onFiles: (files: File[]) => void;
  onLibrary: () => void;
  onAlt: (alt: string) => void;
  onRemove: () => void;
}) {
  const [over, setOver] = useState(false);
  const drop = {
    onDragOver: (e: React.DragEvent) => {
      if (![...e.dataTransfer.types].includes("Files")) return;
      e.preventDefault();
      e.stopPropagation();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => {
      const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;
      e.preventDefault();
      e.stopPropagation();
      setOver(false);
      onFiles(files);
    },
  };

  if (!photo) {
    return (
      <div
        {...drop}
        className={clsx(
          "mt-10 flex aspect-[3/2] w-full flex-col items-center justify-center gap-5 border border-dashed transition-colors duration-300",
          over ? "border-ink bg-ink/[0.03]" : "border-ink/20 bg-surface",
        )}
      >
        <p className="font-display text-[1.5rem] text-ink">The cover photo</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={onLibrary} className="t-nav inline-flex h-10 items-center gap-2 border border-ink/25 px-5 text-ink transition-colors hover:border-ink">
            <Icon name="image" className="size-3.5" strokeWidth={1.5} />
            Choose from vendors
          </button>
          <button type="button" onClick={() => pickFiles(onFiles, false)} className="t-nav inline-flex h-10 items-center gap-2 border border-ink/25 px-5 text-ink transition-colors hover:border-ink">
            <Icon name="upload" className="size-3.5" strokeWidth={1.5} />
            Upload
          </button>
        </div>
        <p className="text-[0.8125rem] text-ink-soft">or drop one here. It shows whole, never cropped.</p>
      </div>
    );
  }

  const ratio = ratioOf(photo) ?? 3 / 2;
  return (
    <figure {...drop} className="group/cover mt-10">
      <div className={clsx("relative mx-auto", over && "outline outline-2 outline-offset-4 outline-ink")} style={{ aspectRatio: ratio, width: `min(100%, calc(80vh * ${ratio}))` }}>
        <Media src={photoUrl(photo.src)} alt={photo.alt} brief="" quiet sizes="900px" priority className="size-full" />
        {uploading && <span aria-hidden className="skeleton absolute inset-0 opacity-60 mix-blend-multiply" />}
        <div className="absolute right-3 bottom-3 flex gap-1.5 opacity-0 transition-opacity group-focus-within/cover:opacity-100 group-hover/cover:opacity-100">
          <OnPhoto onClick={onLibrary}>Replace</OnPhoto>
          <OnPhoto onClick={() => pickFiles(onFiles, false)}>Upload</OnPhoto>
          <OnPhoto onClick={onRemove}>Remove</OnPhoto>
        </div>
      </div>
      <AltField value={photo.alt} onChange={onAlt} className="mx-auto mt-3" style={{ width: `min(100%, calc(80vh * ${ratio}))` }} />
    </figure>
  );
}

function OnPhoto({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="bg-paper/92 px-3 py-1.5 text-[0.8125rem] text-ink backdrop-blur transition-colors hover:bg-paper">
      {children}
    </button>
  );
}

function AltField({ value, onChange, className, style }: { value: string; onChange: (v: string) => void; className?: string; style?: React.CSSProperties }) {
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

function PhotoRow({
  block,
  uploading,
  onChange,
  onAdd,
  onAddFiles,
  onReplace,
}: {
  block: Extract<Block, { type: "img" }>;
  uploading: Set<string>;
  onChange: (b: Block | Block[]) => void;
  onAdd: () => void;
  onAddFiles: (files: File[]) => void;
  onReplace: (index: number) => void;
}) {
  const many = block.images.length > 1;
  const room = block.images.length < PHOTOS_PER_ROW;
  const width = block.wide || many ? "max-w-none" : "max-w-[42rem]";
  const remove = (n: number) => {
    const images = block.images.filter((_, j) => j !== n);
    onChange(images.length ? { ...block, images } : []);
  };

  return (
    <figure className={clsx("group/row mx-auto my-12 w-full", width)}>
      <div className="flex gap-3 max-sm:flex-col">
        {block.images.map((p, n) => {
          const ratio = ratioOf(p) ?? 3 / 2;
          return (
            <div key={`${p.src}-${n}`} className="group/photo relative min-w-0 max-sm:w-full max-sm:flex-none!" style={{ flex: `${ratio} 1 0%`, aspectRatio: ratio }}>
              <Media src={photoUrl(p.src)} alt={p.alt} brief="" quiet sizes={many ? "400px" : "900px"} className="size-full" />
              {uploading.has(p.src) && <span aria-hidden className="skeleton absolute inset-0 opacity-60 mix-blend-multiply" />}
              <div className="absolute right-2 bottom-2 flex gap-1.5 opacity-0 transition-opacity group-focus-within/photo:opacity-100 group-hover/photo:opacity-100">
                <OnPhoto onClick={() => onReplace(n)}>Replace</OnPhoto>
                <OnPhoto onClick={() => remove(n)}>Remove</OnPhoto>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <input
          value={block.caption}
          onChange={(e) => onChange({ ...block, caption: e.target.value })}
          placeholder="Caption, if it needs one"
          aria-label="Caption"
          className="t-small min-w-0 flex-1 bg-transparent placeholder:text-ink-mute/50 focus:outline-none"
        />
        <span className="flex shrink-0 gap-1 opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100">
          {room && (
            <>
              <RowButton onClick={onAdd}>Add from vendors</RowButton>
              <RowButton onClick={() => pickFiles(onAddFiles)}>Upload</RowButton>
            </>
          )}
          {!many && (
            <RowButton onClick={() => onChange(block.wide ? (({ wide, ...rest }) => (void wide, rest))(block) : { ...block, wide: true })}>
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
            onChange={(alt) => onChange({ ...block, images: block.images.map((x, j) => (j === n ? { ...x, alt } : x)) })}
          />
        ))}
      </div>
    </figure>
  );
}

function RowButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="h-7 px-2 text-[0.8125rem] text-ink-soft transition-colors hover:bg-ink/[0.04] hover:text-ink">
      {children}
    </button>
  );
}
