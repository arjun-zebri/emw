"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Portal } from "@/components/ui/Portal";
import type { CreditVendor } from "@/lib/admin/journal";
import { safeHref } from "@/lib/journal/blocks";
import { thumbUrl } from "@/lib/supabase/storage";
import { type Kind, kindAt, setKind } from "./BodyEditor";

/*
 * The small bar over selected words: bold, italic, underline and link, then what the line is (heading,
 * subheading, a bulleted or numbered list). A link can be any web address, or one of the vendors,
 * found by name, which links to their page. ⌘B, ⌘I, ⌘U and ⌘K work too.
 *
 * It waits for the selection to settle (the mouse let go, or a pause in shift-arrowing) before it
 * shows, then stays where it first appeared while the selection changes, with the same buttons in
 * the same places, so it never chases the cursor.
 */

type Spot = { x: number; y: number; link: string | null; kind: Kind | null; bold: boolean; italic: boolean; underline: boolean };

/** Whether the words sit in an underline of their own (a link's line doesn't count). */
const underlined = (n: Node | null) => {
  for (let el = n instanceof Element ? n : n?.parentElement; el && !el.matches("[data-body]"); el = el.parentElement) {
    if (el.tagName === "U" || (el instanceof HTMLElement && /underline/.test(el.style.textDecoration + el.style.textDecorationLine))) return true;
  }
  return false;
};

/** The body of the post, if the words are in it. */
const inEditable = (n: Node | null) => {
  const el = n instanceof Element ? n : n?.parentElement;
  return el?.closest<HTMLElement>("[data-canvas] [data-body]") ?? null;
};

const HEADINGS: { kind: Kind; label: string }[] = [
  { kind: "h2", label: "Heading" },
  { kind: "h3", label: "Subheading" },
];
const LISTS: { kind: Kind; label: string; icon: IconName }[] = [
  { kind: "ul", label: "Bulleted list", icon: "list" },
  { kind: "ol", label: "Numbered list", icon: "list-ordered" },
];

const same = (a: Spot | null, b: Spot | null) =>
  !!a && !!b && Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && a.link === b.link && a.kind === b.kind && a.bold === b.bold && a.italic === b.italic && a.underline === b.underline;

export function FormatBar({ vendors }: { vendors: CreditVendor[] }) {
  const [spot, setSpot] = useState<Spot | null>(null);
  const [linking, setLinking] = useState(false);
  const [query, setQuery] = useState("");
  const saved = useRef<Range | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  // The suggestions under the link field, measured so the panel eases to each new size.
  const list = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(0);
  useEffect(() => {
    const el = list.current;
    if (!linking || !el) return;
    const ro = new ResizeObserver(() => setListHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [linking]);

  const openLink = () => {
    const sel = getSelection();
    if (!sel?.rangeCount) return;
    saved.current = sel.getRangeAt(0).cloneRange();
    setQuery("");
    setLinking(true);
    requestAnimationFrame(() => input.current?.focus());
  };

  useEffect(() => {
    // While the mouse is down the words are still being chosen: the bar waits for it to let go.
    let pressing = false;
    let timer = 0;
    // Where the bar was put when it first showed, held against the body so it scrolls with the text.
    // It stays there while the selection grows or shrinks; only a new selection moves it.
    let pinned: { body: HTMLElement; x: number; dy: number } | null = null;
    const read = () => {
      if (bar.current?.contains(document.activeElement)) return;
      const sel = getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        pinned = null;
        setSpot(null);
        setLinking(false);
        return;
      }
      if (pressing) return;
      const block = inEditable(sel.anchorNode);
      // Gone when the words leave the body, or the focus moves elsewhere (a menu, a dialog).
      if (!block || !block.contains(sel.focusNode) || !block.contains(document.activeElement)) {
        pinned = null;
        return setSpot(null);
      }
      if (pinned?.body !== block) {
        const r = sel.getRangeAt(0).getBoundingClientRect();
        pinned = {
          body: block,
          // Centred on the words, but never past the edge of the window.
          x: Math.min(Math.max(r.left + r.width / 2, 190), innerWidth - 190),
          dy: r.top - block.getBoundingClientRect().top,
        };
      }
      const a = (sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement)?.closest("a");
      const next: Spot = {
        x: pinned.x,
        y: block.getBoundingClientRect().top + pinned.dy,
        link: a?.getAttribute("href") ?? null,
        kind: kindAt(block),
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: underlined(sel.anchorNode),
      };
      setSpot((prev) => (same(prev, next) ? prev : next));
    };
    const onSelection = () => {
      clearTimeout(timer);
      const sel = getSelection();
      // Gone at once when the selection goes; shown once it has been still for a moment.
      if (!sel || sel.isCollapsed) return read();
      if (!pressing) timer = window.setTimeout(read, 120);
    };
    const onDown = (e: PointerEvent) => {
      if (bar.current?.contains(e.target as Node)) return;
      pressing = true;
      pinned = null;
    };
    const onUp = () => {
      if (!pressing) return;
      pressing = false;
      clearTimeout(timer);
      // After the browser has settled the selection from this click.
      requestAnimationFrame(read);
    };
    const onKey = (e: KeyboardEvent) => {
      // With words selected in the post, ⌘K links them; otherwise it opens the admin's search as usual.
      const sel = getSelection();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && sel && !sel.isCollapsed && inEditable(sel.anchorNode)) {
        e.preventDefault();
        openLink();
      }
    };
    document.addEventListener("selectionchange", onSelection);
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", read);
    addEventListener("scroll", read, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", onSelection);
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", read);
      removeEventListener("scroll", read, true);
    };
  }, []);

  const restore = () => {
    const sel = getSelection();
    const r = saved.current;
    if (!sel || !r) return false;
    const block = inEditable(r.startContainer);
    block?.focus();
    sel.removeAllRanges();
    sel.addRange(r);
    return true;
  };

  const link = (href: string | undefined) => {
    if (!href || !restore()) return;
    document.execCommand("createLink", false, href);
    getSelection()?.collapseToEnd();
    setLinking(false);
    setSpot(null);
  };

  /** Apply a change, then read the bar's state again (the selection stays). */
  const format = (fn: () => void) => {
    fn();
    document.dispatchEvent(new Event("selectionchange"));
  };

  const heading = spot?.kind === "h2" || spot?.kind === "h3";
  const q = query.trim().toLowerCase();
  const matches = q.length >= 2 && !/[./:]/.test(q) ? vendors.filter((v) => v.name.toLowerCase().includes(q)).slice(0, 5) : [];
  const typed = q && /[./:@]/.test(q) ? safeHref(query) : undefined;

  return (
    <Portal>
      <AnimatePresence>
        {spot && (
          <motion.div
            ref={bar}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={(e) => {
              // Keep the words selected while a button is pressed.
              if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
            }}
            className="fixed z-[90] -translate-x-1/2 -translate-y-[calc(100%+0.625rem)] border border-ink/10 bg-surface text-ink shadow-[0_18px_40px_-18px_rgb(22_20_18/0.28)]"
            style={{ left: spot.x, top: spot.y }}
          >
            {linking ? (
              <div className="w-80">
                {/* The panel sits above the words and grows upward, so the field stays put while suggestions come and go. */}
                <motion.div
                  initial={false}
                  animate={{ height: listHeight }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div ref={list}>
                    {(matches.length > 0 || typed) && (
                      <ul className="border-b hairline py-1">
                        {typed && (
                          <li>
                            <button type="button" onClick={() => link(typed)} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[0.8125rem] hover:bg-paper">
                              <Icon name="link" className="size-3.5 shrink-0" strokeWidth={1.5} />
                              <span className="truncate">{typed}</span>
                            </button>
                          </li>
                        )}
                        {matches.map((v) => (
                          <li key={v.id}>
                            <button
                              type="button"
                              onClick={() => link(`/vendors/${v.slug}`)}
                              className="flex w-full items-center gap-3 px-3.5 py-2 text-left hover:bg-paper"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element -- a thumbnail straight from Storage */}
                              {v.photo ? <img src={thumbUrl(v.photo)} alt="" className="size-8 shrink-0 object-cover" /> : <span className="size-8 shrink-0 bg-paper-soft" />}
                              <span className="min-w-0">
                                <span className="block truncate text-[0.875rem]">{v.name}</span>
                                <span className="block truncate text-[0.75rem] text-ink-soft">{v.discipline}</span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </motion.div>
                <input
                  ref={input}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setLinking(false);
                      restore();
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      if (matches[0] && !typed) link(`/vendors/${matches[0].slug}`);
                      else link(typed);
                    }
                  }}
                  placeholder="Paste a link, or type a vendor’s name"
                  aria-label="Link"
                  className="h-10 w-full bg-transparent px-3.5 text-[0.875rem] text-ink placeholder:text-ink-mute/60 focus:outline-none"
                />
              </div>
            ) : (
              <div className="flex items-center px-1">
                {/* Bold, italic, underline and link don't apply to a heading: they stay, greyed, so nothing shifts. */}
                <Mark label="Bold (⌘B)" on={spot.bold} off={heading} onClick={() => format(() => document.execCommand("bold"))} className="font-semibold">
                  B
                </Mark>
                <Mark label="Italic (⌘I)" on={spot.italic} off={heading} onClick={() => format(() => document.execCommand("italic"))} className="font-display text-[1.0625rem] italic">
                  I
                </Mark>
                <Mark label="Underline (⌘U)" on={spot.underline} off={heading} onClick={() => format(() => document.execCommand("underline"))}>
                  <span className="underline decoration-1 underline-offset-[0.2em]">U</span>
                </Mark>
                {spot.link ? (
                  <Mark label="Remove link" on off={heading} onClick={() => format(() => document.execCommand("unlink"))}>
                    <Icon name="link" className="size-4" strokeWidth={1.5} />
                  </Mark>
                ) : (
                  <Mark label="Link (⌘K)" off={heading} onClick={openLink}>
                    <Icon name="link" className="size-4" strokeWidth={1.5} />
                  </Mark>
                )}
                <span aria-hidden className="mx-1.5 h-4 w-px bg-ink/12" />
                {HEADINGS.map((k) => (
                  <Mark
                    key={k.kind}
                    label={spot.kind === k.kind ? `${k.label} (back to text)` : k.label}
                    on={spot.kind === k.kind}
                    onClick={() => format(() => setKind(inEditable(getSelection()?.anchorNode ?? null), k.kind))}
                    className="w-auto px-2.5 text-[0.8125rem]"
                  >
                    {k.label}
                  </Mark>
                ))}
                <span aria-hidden className="mx-1.5 h-4 w-px bg-ink/12" />
                {LISTS.map((k) => (
                  <Mark
                    key={k.kind}
                    label={spot.kind === k.kind ? `${k.label} (back to text)` : k.label}
                    on={spot.kind === k.kind}
                    onClick={() => format(() => setKind(inEditable(getSelection()?.anchorNode ?? null), k.kind))}
                  >
                    <Icon name={k.icon} className="size-4" strokeWidth={1.5} />
                  </Mark>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

function Mark({
  label,
  on,
  off,
  onClick,
  className,
  children,
}: {
  label: string;
  on?: boolean;
  off?: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      title={label}
      disabled={off}
      onClick={onClick}
      className={clsx(
        "my-1 flex h-8 w-8 items-center justify-center text-[0.9375rem] transition-colors duration-150 disabled:pointer-events-none disabled:opacity-25",
        on ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}
