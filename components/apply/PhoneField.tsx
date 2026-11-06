"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { countries, countryByCode, flag, formatPhone } from "@/lib/apply/countries";

/**
 * A phone number with its country: the flag and code on the left open a short list, and the number
 * sets itself in groups of four as it's typed. A leading 0 is dropped, since the code replaces it.
 */
export function PhoneField({ id, country, value, onCountry, onChange }: { id: string; country: string; value: string; onCountry: (code: string) => void; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const current = countryByCode(country);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    addEventListener("pointerdown", close);
    return () => removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const choose = (code: string) => {
    onCountry(code);
    setOpen(false);
    input.current?.focus();
  };

  return (
    <div ref={wrap} className="relative">
      <div className="flex items-end border-b hairline transition-colors focus-within:border-ink">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Country code, ${current.name} ${current.dial}`}
          onClick={() => {
            setActive(Math.max(0, countries.findIndex((c) => c.code === current.code)));
            setOpen((o) => !o);
          }}
          onKeyDown={(e) => {
            if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
              e.preventDefault();
              setActive(Math.max(0, countries.findIndex((c) => c.code === current.code)));
              setOpen(true);
            } else if (open) {
              const keys: Record<string, () => void> = {
                ArrowDown: () => setActive((i) => Math.min(countries.length - 1, i + 1)),
                ArrowUp: () => setActive((i) => Math.max(0, i - 1)),
                Enter: () => choose(countries[active].code),
                Escape: () => setOpen(false),
              };
              if (keys[e.key]) {
                e.preventDefault();
                keys[e.key]();
              }
            }
          }}
          className="flex shrink-0 items-center gap-2 py-3 pr-4 text-[1.0625rem] text-ink"
        >
          <span className="text-[1.25rem] leading-none">{flag(current.code)}</span>
          <span className="tabular-nums">{current.dial}</span>
          <Icon name="arrow-down" className={clsx("size-3.5 text-ink-mute transition-transform duration-300", open && "rotate-180")} />
        </button>
        <span aria-hidden className="mb-3.5 h-5 w-px bg-line" />
        <input
          ref={input}
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={formatPhone(value)}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 14))}
          placeholder="4123 4567 8"
          className="min-w-0 flex-1 bg-transparent py-3 pl-4 text-[1.0625rem] tracking-[0.02em] text-ink tabular-nums placeholder:text-ink-mute/50 focus:outline-none"
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={list}
            role="listbox"
            aria-label="Country"
            data-lenis-prevent
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full left-0 z-20 mt-2 max-h-[18rem] w-[18rem] overflow-y-auto border hairline bg-surface py-1.5 shadow-[0_24px_48px_-24px_rgb(22_20_18/0.25)]"
          >
            {countries.map((c, i) => (
              <li
                key={c.code}
                role="option"
                aria-selected={c.code === current.code}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(c.code)}
                className={clsx("flex cursor-pointer items-center gap-3 px-4 py-2.5 text-[0.9375rem]", i === active && "bg-paper")}
              >
                <span className="text-[1.125rem] leading-none">{flag(c.code)}</span>
                <span className="flex-1 text-ink">{c.name}</span>
                <span className="text-ink-mute tabular-nums">{c.dial}</span>
                <span aria-hidden className="grid w-4 shrink-0 place-items-center">
                  {c.code === current.code && <Icon name="check" className="size-4" />}
                </span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
