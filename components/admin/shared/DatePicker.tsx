"use client";

import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { day, month as monthName } from "@/lib/admin/format";
import { addMonths, dayNumber, isoDay, TODAY } from "@/lib/admin/time";

const GAP = 16; // between the row and the calendar
const EDGE = 16; // kept clear at the window's edge
const TOP_BAR = 64; // the admin's sticky top bar
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** Monday-first weeks for the month holding `key` ("YYYY-MM"), padded with the days either side. */
function weeks(key: string) {
  const first = dayNumber(`${key}-01`);
  const start = first - ((new Date(first * 86_400_000).getUTCDay() + 6) % 7);
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => isoDay(start + w * 7 + d)));
}

/**
 * A date set in a details row like the dropdowns: the date reads as text, and a calendar opens
 * beneath (or above, if there's no room). Arrow keys move by day and week, Page Up and Down by month,
 * Enter picks, Escape closes. Dates are "YYYY-MM-DD", as everywhere in the admin.
 */
export function DatePicker({ id, value, onChange }: { id?: string; value: string; onChange: (iso: string) => void }) {
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(value || TODAY);
  const [place, setPlace] = useState({ up: false });
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const shown = focus.slice(0, 7);

  const show = () => {
    setFocus(value || TODAY);
    setOpen(true);
  };
  const hide = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };
  const pick = (iso: string) => {
    onChange(iso);
    hide();
  };

  useLayoutEffect(() => {
    if (!open || !trigger.current || !pop.current) return;
    const r = trigger.current.getBoundingClientRect();
    const need = pop.current.offsetHeight;
    const below = innerHeight - r.bottom - GAP - EDGE;
    const above = r.top - TOP_BAR - GAP - EDGE;
    setPlace({ up: need > below && above > below });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  // Keep keyboard focus on the focused day as it moves, including across months.
  useEffect(() => {
    if (open) grid.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus();
  }, [open, focus]);

  const keys = (e: React.KeyboardEvent) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in step) setFocus(isoDay(dayNumber(focus) + step[e.key]));
    else if (e.key === "PageUp") setFocus(addMonths(focus, -1));
    else if (e.key === "PageDown") setFocus(addMonths(focus, 1));
    else if (e.key === "Home") setFocus(TODAY);
    else if (e.key === "Escape") hide();
    else if (e.key === "Tab") return setOpen(false);
    else return;
    e.preventDefault();
  };

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? hide(false) : show())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            show();
          }
        }}
        className="group flex w-full items-center justify-between gap-4 text-left text-[0.9375rem] text-ink focus:outline-none"
      >
        {day(value || TODAY, { year: true, weekday: true })}
        <Icon name="calendar" className="size-3.5 shrink-0 text-ink-mute transition-colors group-hover:text-ink" strokeWidth={1.4} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={pop}
            role="dialog"
            aria-label="Choose a date"
            initial={{ opacity: 0, y: reduce ? 0 : place.up ? 6 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : place.up ? 4 : -4, transition: { duration: 0.12 } }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={clsx(
              "absolute right-0 z-40 w-[19rem] max-w-full border border-ink/10 bg-surface p-4 sm:max-w-none",
              place.up ? "bottom-[calc(100%+1rem)] shadow-[0_-24px_48px_-20px_rgb(22_20_18/0.22)]" : "top-[calc(100%+1rem)] shadow-[0_24px_48px_-20px_rgb(22_20_18/0.22)]",
            )}
          >
            <div className="flex items-center justify-between">
              <p className="t-title text-[1.125rem]" aria-live="polite">
                {monthName(shown, true)}
              </p>
              <span className="flex">
                {(
                  [
                    [-1, "chevron-left", "Previous month"],
                    [1, "chevron-right", "Next month"],
                  ] as const
                ).map(([step, icon, label]) => (
                  <button
                    key={icon}
                    type="button"
                    aria-label={label}
                    onClick={() => setFocus(addMonths(focus, step))}
                    className="flex size-8 items-center justify-center text-ink-mute transition-colors hover:text-ink"
                  >
                    <Icon name={icon} className="size-4" strokeWidth={1.4} />
                  </button>
                ))}
              </span>
            </div>

            <div ref={grid} role="grid" onKeyDown={keys} className="mt-3">
              <div role="row" className="grid grid-cols-7">
                {WEEKDAYS.map((d, i) => (
                  <span key={i} role="columnheader" className="flex h-8 items-center justify-center text-[0.6875rem] text-ink-mute">
                    {d}
                  </span>
                ))}
              </div>
              {weeks(shown).map((week) => (
                <div key={week[0]} role="row" className="grid grid-cols-7">
                  {week.map((iso) => {
                    const selected = iso === value;
                    const outside = iso.slice(0, 7) !== shown;
                    const today = iso === TODAY;
                    return (
                      <button
                        key={iso}
                        type="button"
                        role="gridcell"
                        data-day={iso}
                        tabIndex={iso === focus ? 0 : -1}
                        aria-selected={selected}
                        aria-label={day(iso, { year: true, weekday: true })}
                        onClick={() => pick(iso)}
                        className={clsx(
                          "relative flex h-9 items-center justify-center text-[0.8125rem] tabular-nums transition-colors duration-200 focus:outline-none",
                          selected
                            ? "bg-ink text-paper"
                            : clsx("hover:bg-paper focus-visible:bg-paper", outside ? "text-ink-mute/45" : "text-ink-soft hover:text-ink"),
                          iso === focus && !selected && "focus-visible:ring-1 focus-visible:ring-ink/30 focus-visible:ring-inset",
                        )}
                      >
                        {Number(iso.slice(8))}
                        {today && <span className={clsx("absolute bottom-1.5 size-[3px] rounded-full", selected ? "bg-paper" : "bg-ink")} aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-3 border-t hairline pt-3 text-[0.75rem]">
              <button type="button" onClick={() => pick(TODAY)} className="text-ink transition-colors hover:text-ink-soft">
                Today
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
