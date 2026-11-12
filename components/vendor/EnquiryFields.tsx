"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { dayInput, isoDay, parseDayInput, type Place } from "@/lib/enquiry-fields";

/*
 * The Enquire form's two fields that do more than take text: the wedding day, typed as DD/MM/YYYY
 * or picked from a calendar, and the venue, found by search or typed as a suburb or city.
 */

export const fieldLine =
  "w-full border-b hairline bg-transparent py-3 text-ink placeholder:text-ink-mute/70 transition-colors focus:border-ink focus:outline-none";

const ease = [0.16, 1, 0.3, 1] as const;
const weekdays = ["M", "T", "W", "T", "F", "S", "S"];
const monthName = new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric", timeZone: "UTC" });

/** Closes a popover on a click outside it or Escape (which then goes no further, so the form stays open). */
function useDismiss(open: boolean, ref: React.RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      close();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, ref, close]);
}

const todayIso = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(new Date());

/** "1403" → "14/03", "14032027" → "14/03/2027": slashes appear as they type. */
function maskDay(raw: string, previous: string) {
  if (raw.length < previous.length) return raw; // Deleting: leave it be.
  if (/[^\d/]/.test(raw)) return raw;
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean);
  let out = parts.join("/");
  if (digits.length === 2 || digits.length === 4) out += "/";
  return out;
}

/** The wedding day. `value` is "YYYY-MM-DD" once what they typed or picked is a real day, else "". */
export function DateField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (iso: string) => void }) {
  const [text, setText] = useState(value ? dayInput(value) : "");
  const [open, setOpen] = useState(false);
  const [bad, setBad] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useDismiss(open, wrap, () => setOpen(false));

  const type = (raw: string) => {
    const next = maskDay(raw, text);
    setText(next);
    setBad(false);
    onChange(parseDayInput(next) ?? "");
  };
  const pick = (iso: string) => {
    setText(dayInput(iso));
    setBad(false);
    onChange(iso);
    setOpen(false);
  };

  return (
    <div ref={wrap} className="relative">
      <label htmlFor={id} className="t-small mb-1 block text-ink">
        {label}
      </label>
      <div className={clsx("flex items-center border-b transition-colors focus-within:border-ink", bad ? "border-bad" : "hairline")}>
        <input
          id={id}
          value={text}
          onChange={(e) => type(e.target.value)}
          onBlur={() => setBad(!!text && !parseDayInput(text))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD/MM/YYYY"
          required
          aria-invalid={bad || undefined}
          aria-describedby={bad ? `${id}-hint` : undefined}
          className="min-w-0 flex-1 bg-transparent py-3 text-ink tabular-nums placeholder:text-ink-mute/70 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Choose the date from a calendar"
          aria-expanded={open}
          className="-mr-1 p-2 text-ink-mute transition-colors hover:text-ink"
        >
          <Icon name="calendar" className="size-[1.125rem]" strokeWidth={1.4} />
        </button>
      </div>
      {bad && (
        <p id={`${id}-hint`} className="t-small mt-1.5 text-bad">
          Write it as DD/MM/YYYY, like 14/03/2027.
        </p>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
            transition={{ duration: 0.35, ease }}
            className="absolute inset-x-0 top-full z-10 mt-2 border hairline bg-paper p-4 shadow-[0_18px_40px_-20px_rgb(22_20_18/0.35)]"
          >
            <Calendar selected={value} onPick={pick} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A month at a time, Monday first. Past days can't be picked. */
function Calendar({ selected, onPick }: { selected: string; onPick: (iso: string) => void }) {
  const today = todayIso();
  const start = selected || today;
  const [view, setView] = useState({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) });
  const first = new Date(Date.UTC(view.y, view.m - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(view.y, view.m, 0)).getUTCDate();
  const cells = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const step = (n: number) => setView(({ y, m }) => ({ y: m + n > 12 ? y + 1 : m + n < 1 ? y - 1 : y, m: ((m + n + 11) % 12) + 1 }));
  const thisMonth = today.slice(0, 7) === `${view.y}-${String(view.m).padStart(2, "0")}`;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => step(-1)} disabled={thisMonth} aria-label="Previous month" className="p-1.5 text-ink-mute hover:text-ink disabled:opacity-30">
          <Icon name="chevron-left" className="size-4" strokeWidth={1.4} />
        </button>
        <p className="t-title text-[1.125rem]" aria-live="polite">
          {monthName.format(first)}
        </p>
        <button type="button" onClick={() => step(1)} aria-label="Next month" className="p-1.5 text-ink-mute hover:text-ink">
          <Icon name="chevron-right" className="size-4" strokeWidth={1.4} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {weekdays.map((d, i) => (
          <span key={i} className="t-small pb-2 text-ink-mute" aria-hidden>
            {d}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const iso = isoDay(view.y, view.m, d)!;
          const past = iso < today;
          const on = iso === selected;
          return (
            <button
              key={i}
              type="button"
              disabled={past}
              onClick={() => onPick(iso)}
              aria-pressed={on}
              aria-label={dayInput(iso)}
              className={clsx(
                "h-9 text-[0.875rem] tabular-nums transition-colors",
                on ? "bg-ink text-paper" : past ? "text-ink-mute/40" : "text-ink hover:bg-ink/[0.06]",
                iso === today && !on && "underline underline-offset-4",
              )}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The venue: as they type, places matching it come up with their addresses (app/api/places); picking
 * one fills in the venue and its address. Anything typed stands on its own too, for a suburb or city
 * when the venue isn't booked.
 */
export function VenueField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (text: string, region?: string) => void }) {
  const list = useId();
  // The places found, with the words they were found for, so a stale answer never shows.
  const [result, setResult] = useState<{ q: string; places: Place[] }>();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // The text of the place they picked, so it isn't searched for again.
  const [picked, setPicked] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  useDismiss(open, wrap, () => setOpen(false));

  const q = value.trim();
  const searchable = q.length >= 3 && q !== picked;
  const places = searchable && result?.q === q ? result.places : [];
  const loading = searchable && result?.q !== q;

  useEffect(() => {
    if (!searchable) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/places?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? (r.json() as Promise<Place[]>) : []))
        .catch(() => [] as Place[])
        .then((found) => {
          if (ctrl.signal.aborted) return;
          setResult({ q, places: found });
          setActive(-1);
        });
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, searchable]);

  const choose = (p: Place) => {
    const text = p.address ? `${p.name}, ${p.address}` : p.name;
    setPicked(text);
    onChange(text, p.region);
    setOpen(false);
  };
  const showing = open && searchable && (loading || places.length > 0);

  return (
    <div ref={wrap} className="relative">
      <label htmlFor={id} className="t-small mb-1 block text-ink">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => {
          setPicked(null);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!showing || !places.length) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a + (e.key === "ArrowDown" ? 1 : -1) + places.length) % places.length);
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            choose(places[active]);
          }
        }}
        role="combobox"
        aria-expanded={showing}
        aria-controls={list}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${list}-${active}` : undefined}
        autoComplete="off"
        required
        maxLength={300}
        placeholder="Start typing the venue, suburb or city"
        className={fieldLine}
      />
      <AnimatePresence>
        {showing && (
          <motion.ul
            id={list}
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
            transition={{ duration: 0.35, ease }}
            className="absolute inset-x-0 top-full z-10 mt-2 border hairline bg-paper py-1.5 shadow-[0_18px_40px_-20px_rgb(22_20_18/0.35)]"
          >
            {loading && places.length === 0
              ? [0, 1, 2].map((i) => (
                  <li key={i} aria-hidden className="px-4 py-2.5">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="mt-1.5 h-3 w-4/5" />
                  </li>
                ))
              : places.map((p, i) => (
                  <li
                    key={`${p.name}-${p.address}`}
                    id={`${list}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => choose(p)}
                    onPointerEnter={() => setActive(i)}
                    className={clsx("cursor-pointer px-4 py-2.5 transition-colors", i === active && "bg-ink/[0.05]")}
                  >
                    <span className="block text-[0.9375rem] text-ink">{p.name}</span>
                    {p.address && <span className="t-small mt-0.5 block truncate">{p.address}</span>}
                  </li>
                ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
