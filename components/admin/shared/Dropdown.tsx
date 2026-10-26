"use client";

import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";

const LIST_MAX = 296; // px, about seven options
const GAP = 16; // between the row and the list
const EDGE = 16; // kept clear at the window's edge
const TOP_BAR = 64; // the admin's sticky top bar

export type DropdownOption<T extends string> = {
  value: T;
  label: string;
  /** Quiet text on the right of the option, e.g. the English name of a language or a price. */
  hint?: string;
  /** A second line under the label. */
  detail?: string;
  lang?: string;
};

type Props<T extends string> = {
  id?: string;
  options: DropdownOption<T>[];
  placeholder: string;
  /** Show a search field at the top of the list. On by default for long lists. */
  searchable?: boolean;
} & ({ multiple: true; value: T[]; onChange: (v: T[]) => void } | { multiple?: false; value: T; onChange: (v: T) => void });

/**
 * A select set in a details row: the chosen values read as plain text, and a white list opens beneath
 * with checkboxes (several) or a check (one). Arrow keys move, Enter picks, Escape closes; long lists
 * get a search field.
 */
export function Dropdown<T extends string>(props: Props<T>) {
  const { options, placeholder } = props;
  const searchable = props.searchable ?? options.length > 10;
  const selected = props.multiple ? props.value : [props.value];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState({ up: false, max: LIST_MAX });
  const uid = useId();
  const reduce = useReducedMotion();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => [o.label, o.hint, o.value].some((s) => s?.toLowerCase().includes(q)));
  }, [options, query]);

  const show = (at = 0) => {
    setQuery("");
    setActive(Math.max(0, at));
    setOpen(true);
  };
  const hide = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  // Open towards the side with room (below unless it doesn't fit and above has more), and keep the
  // list inside the window, clear of the admin's sticky top bar.
  useLayoutEffect(() => {
    if (!open || !trigger.current || !pop.current || !list.current) return;
    const r = trigger.current.getBoundingClientRect();
    const chrome = pop.current.offsetHeight - list.current.offsetHeight;
    const need = Math.min(list.current.scrollHeight, LIST_MAX) + chrome;
    const below = innerHeight - r.bottom - GAP - EDGE;
    const above = r.top - TOP_BAR - GAP - EDGE;
    const up = need > below && above > below;
    setPlace({ up, max: Math.max(120, Math.min(LIST_MAX, (up ? above : below) - chrome)) });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    (searchable ? search.current : list.current)?.focus();
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open, searchable]);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const pick = (value: T) => {
    if (props.multiple) {
      const next = props.value.includes(value) ? props.value.filter((x) => x !== value) : [...props.value, value];
      // Keep the options' order, so the summary reads the same however they were picked.
      props.onChange(options.map((o) => o.value).filter((x) => next.includes(x)));
    } else {
      props.onChange(value);
      hide();
    }
  };

  const keys = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(shown.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" || (e.key === " " && e.target === list.current)) {
      e.preventDefault();
      if (shown[active]) pick(shown[active].value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      hide();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const labels = options.filter((o) => selected.includes(o.value));
  const listId = `${uid}-list`;

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        id={props.id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? hide(false) : show(options.findIndex((o) => o.value === selected[0])))}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            show();
          }
        }}
        className="group flex w-full items-start justify-between gap-4 text-left text-[0.9375rem] focus:outline-none"
      >
        <span className={clsx("min-w-0", labels.length ? "text-ink" : "text-ink-mute/45")}>
          {labels.length
            ? labels.map((o, i) => (
                <span key={o.value} lang={o.lang}>
                  {o.label}
                  {i < labels.length - 1 && <span className="text-ink-mute">, </span>}
                </span>
              ))
            : placeholder}
        </span>
        <Icon
          name="chevron-down"
          className={clsx(
            "mt-[0.3em] size-3.5 shrink-0 text-ink-mute transition-transform duration-500 ease-out-expo group-hover:text-ink",
            open && "rotate-180",
          )}
          strokeWidth={1.4}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={pop}
            initial={{ opacity: 0, y: reduce ? 0 : place.up ? 6 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : place.up ? 4 : -4, transition: { duration: 0.12 } }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={clsx(
              "absolute inset-x-0 z-40 border border-ink/10 bg-surface",
              place.up ? "bottom-[calc(100%+1rem)] shadow-[0_-24px_48px_-20px_rgb(22_20_18/0.22)]" : "top-[calc(100%+1rem)] shadow-[0_24px_48px_-20px_rgb(22_20_18/0.22)]",
            )}
          >
            {searchable && (
              <div className="flex h-11 items-center gap-2.5 border-b hairline px-4">
                <Icon name="search" className="size-3.5 text-ink-mute" strokeWidth={1.5} />
                <input
                  ref={search}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={keys}
                  placeholder="Search"
                  aria-controls={listId}
                  aria-activedescendant={shown[active] ? `${uid}-${shown[active].value}` : undefined}
                  className="w-full bg-transparent text-[0.875rem] placeholder:text-ink-mute/60 focus:outline-none"
                />
              </div>
            )}
            <ul
              ref={list}
              id={listId}
              role="listbox"
              aria-multiselectable={props.multiple || undefined}
              tabIndex={-1}
              onKeyDown={keys}
              aria-activedescendant={shown[active] ? `${uid}-${shown[active].value}` : undefined}
              style={{ maxHeight: place.max }}
              className="overflow-y-auto overscroll-contain py-1.5 focus:outline-none"
            >
              {shown.map((o, i) => {
                const on = selected.includes(o.value);
                return (
                  <li
                    key={o.value}
                    id={`${uid}-${o.value}`}
                    role="option"
                    aria-selected={on}
                    data-index={i}
                    onPointerMove={() => setActive(i)}
                    onClick={() => pick(o.value)}
                    className={clsx(
                      "flex cursor-pointer items-start gap-3 px-4 py-2.5 text-[0.875rem] transition-colors duration-150",
                      i === active ? "bg-paper" : "bg-transparent",
                    )}
                  >
                    {props.multiple && (
                      <span
                        className={clsx(
                          "mt-[0.2em] flex size-3.5 shrink-0 items-center justify-center border transition-colors duration-200",
                          on ? "border-ink bg-ink text-paper" : "border-ink/25",
                        )}
                        aria-hidden
                      >
                        {on && <Icon name="check" className="size-2.5" strokeWidth={2.25} />}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-4">
                        <span lang={o.lang} className={clsx("inline-flex items-center gap-2", on ? "text-ink" : "text-ink-soft")}>
                          {o.label}
                          {/* One choice: a small tick beside the chosen name, so no row gives up a column for it. */}
                          {!props.multiple && on && <Icon name="check" className="size-3 shrink-0" strokeWidth={2} />}
                        </span>
                        {o.hint && <span className="shrink-0 text-[0.75rem] text-ink-mute tabular-nums">{o.hint}</span>}
                      </span>
                      {o.detail && <span className="mt-0.5 block text-[0.75rem] leading-snug text-ink-mute">{o.detail}</span>}
                    </span>
                  </li>
                );
              })}
              {shown.length === 0 && <li className="px-4 py-3 text-[0.8125rem] text-ink-mute">Nothing matches &lsquo;{query}&rsquo;</li>}
            </ul>
            {props.multiple && (
              <div className="flex h-10 items-center justify-between border-t hairline px-4 text-[0.75rem]">
                <span className="text-ink-mute tabular-nums">{props.value.length ? `${props.value.length} selected` : "None selected"}</span>
                <span className="flex gap-4">
                  {props.value.length > 0 && (
                    <button type="button" onClick={() => props.onChange([])} className="text-ink-mute transition-colors hover:text-ink">
                      Clear
                    </button>
                  )}
                  <button type="button" onClick={() => hide()} className="text-ink transition-colors hover:text-ink-soft">
                    Done
                  </button>
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
