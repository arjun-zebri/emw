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
 * The small bar over selected words: bold, italic and link, then what the line is (heading,
 * subheading, a bulleted or numbered list). A link can be any web address, or one of the vendors,
 * found by name, which links to their page. ⌘B, ⌘I and ⌘K work too.
 */

type Spot = { x: number; y: number; link: string | null; kind: Kind | null; bold: boolean; italic: boolean };

/** The body of the post, if the words are in it. */
const inEditable = (n: Node | null) => {
  const el = n instanceof Element ? n : n?.parentElement;
  return el?.closest<HTMLElement>("[data-canvas] [data-body]") ?? null;
};

const KINDS: { kind: Kind; label: string; icon: IconName }[] = [
  { kind: "h2", label: "Heading", icon: "heading" },
  { kind: "h3", label: "Subheading", icon: "subheading" },
  { kind: "ul", label: "Bulleted list", icon: "list" },
  { kind: "ol", label: "Numbered list", icon: "list-ordered" },
];

export function FormatBar({ vendors }: { vendors: CreditVendor[] }) {
  const [spot, setSpot] = useState<Spot | null>(null);
  const [linking, setLinking] = useState(false);
  const [query, setQuery] = useState("");
  const saved = useRef<Range | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const openLink = () => {
    const sel = getSelection();
    if (!sel?.rangeCount) return;
    saved.current = sel.getRangeAt(0).cloneRange();
    setQuery("");
    setLinking(true);
    requestAnimationFrame(() => input.current?.focus());
  };

  useEffect(() => {
    const read = () => {
      if (bar.current?.contains(document.activeElement)) return;
      const sel = getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setSpot(null);
        setLinking(false);
        return;
      }
      const block = inEditable(sel.anchorNode);
      if (!block || !block.contains(sel.focusNode)) return setSpot(null);
      const r = sel.getRangeAt(0).getBoundingClientRect();
      const a = (sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement)?.closest("a");
      setSpot({
        x: r.left + r.width / 2,
        y: r.top,
        link: a?.getAttribute("href") ?? null,
        kind: kindAt(block),
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
      });
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k" && inEditable(getSelection()?.anchorNode ?? null)) {
        e.preventDefault();
        if (!getSelection()?.isCollapsed) openLink();
      }
    };
    document.addEventListener("selectionchange", read);
    document.addEventListener("keydown", onKey);
    addEventListener("scroll", read, true);
    return () => {
      document.removeEventListener("selectionchange", read);
      document.removeEventListener("keydown", onKey);
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

  const q = query.trim().toLowerCase();
  const matches = q.length >= 2 && !/[./:]/.test(q) ? vendors.filter((v) => v.name.toLowerCase().includes(q)).slice(0, 5) : [];
  const typed = q && /[./:@]/.test(q) ? safeHref(query) : undefined;

  return (
    <Portal>
      <AnimatePresence>
        {spot && (
          <motion.div
            ref={bar}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={(e) => {
              // Keep the words selected while a button is pressed.
              if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
            }}
            className="fixed z-[90] -translate-x-1/2 -translate-y-[calc(100%+0.625rem)] bg-night text-paper shadow-[0_16px_32px_-16px_rgb(22_20_18/0.5)]"
            style={{ left: spot.x, top: spot.y }}
          >
            {linking ? (
              <div className="w-80">
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
                  className="h-10 w-full bg-transparent px-3.5 text-[0.875rem] text-paper placeholder:text-paper/50 focus:outline-none"
                />
                {(matches.length > 0 || typed) && (
                  <ul className="border-t border-paper/15 py-1">
                    {typed && (
                      <li>
                        <button type="button" onClick={() => link(typed)} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[0.8125rem] hover:bg-paper/10">
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
                          className="flex w-full items-center gap-3 px-3.5 py-2 text-left hover:bg-paper/10"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- a thumbnail straight from Storage */}
                          {v.photo ? <img src={thumbUrl(v.photo)} alt="" className="size-8 shrink-0 object-cover" /> : <span className="size-8 shrink-0 bg-paper/15" />}
                          <span className="min-w-0">
                            <span className="block truncate text-[0.875rem]">{v.name}</span>
                            <span className="block truncate text-[0.75rem] text-paper/60">{v.discipline}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="flex items-center">
                {spot.kind !== "h2" && spot.kind !== "h3" && (
                  <>
                    <Mark label="Bold (⌘B)" on={spot.bold} onClick={() => format(() => document.execCommand("bold"))} className="font-semibold">
                      B
                    </Mark>
                    <Mark label="Italic (⌘I)" on={spot.italic} onClick={() => format(() => document.execCommand("italic"))} className="font-display italic">
                      I
                    </Mark>
                    {spot.link ? (
                      <Mark label="Remove link" onClick={() => format(() => document.execCommand("unlink"))} className="w-auto px-3 text-[0.8125rem]">
                        Remove link
                      </Mark>
                    ) : (
                      <Mark label="Link (⌘K)" onClick={openLink}>
                        <Icon name="link" className="size-4" strokeWidth={1.5} />
                      </Mark>
                    )}
                    <span aria-hidden className="mx-1 h-5 w-px bg-paper/20" />
                  </>
                )}
                {KINDS.map((k) => (
                  <Mark key={k.kind} label={spot.kind === k.kind ? `${k.label} (back to text)` : k.label} on={spot.kind === k.kind} onClick={() => format(() => setKind(inEditable(getSelection()?.anchorNode ?? null), k.kind))}>
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

function Mark({ label, on, onClick, className, children }: { label: string; on?: boolean; onClick: () => void; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      title={label}
      onClick={onClick}
      className={clsx("flex h-10 w-10 items-center justify-center text-[0.9375rem] transition-colors hover:bg-paper/10", on ? "text-paper" : "text-paper/70", on && "bg-paper/12", className)}
    >
      {children}
    </button>
  );
}
