"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { languages, serviceLabels, states } from "@/data/taxonomy";
import type { Language, Service, StateCode } from "@/data/types";
import { lockScroll } from "@/lib/lenis";
import type { VendorFilters } from "@/lib/vendors";

export type FilterOptions = {
  languages: [Language, number][];
  areas: [StateCode, number][];
  services: [Service, number][];
};

export function FilterDrawer({
  open,
  onClose,
  filters,
  options,
  toggle,
  clear,
  resultCount,
}: {
  open: boolean;
  onClose: () => void;
  filters: VendorFilters;
  options: FilterOptions;
  toggle: (key: "languages" | "areas" | "services", value: string) => void;
  clear: () => void;
  resultCount: number;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lockScroll(open);
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [open, onClose]);

  const sections = [
    {
      key: "languages" as const,
      title: "Language",
      items: options.languages.map(([l]) => ({
        value: l,
        label: languages[l].native === l ? l : `${languages[l].native}  ${l}`,
        lang: languages[l].lang,
        selected: filters.languages.includes(l),
      })),
    },
    {
      key: "services" as const,
      title: "Service",
      items: options.services.map(([s]) => ({ value: s, label: serviceLabels[s], lang: undefined, selected: filters.services.includes(s) })),
    },
    {
      key: "areas" as const,
      title: "Service area",
      items: options.areas.map(([a]) => ({ value: a, label: states[a], lang: undefined, selected: filters.areas.includes(a) })),
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]">
          <motion.div
            className="absolute inset-0 bg-night/30"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            tabIndex={-1}
            data-lenis-prevent
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-paper outline-none"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
          >
            <div className="flex h-[var(--header-h)] shrink-0 items-center justify-between px-6 sm:px-8">
              <p className="t-title">Filters</p>
              <button type="button" onClick={onClose} aria-label="Close filters" className="p-2 text-ink-mute hover:text-ink">
                <Icon name="close" className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-6 sm:px-8">
              {sections.map((section) => (
                <fieldset key={section.key} className="border-t hairline py-7">
                  <legend className="sr-only">{section.title}</legend>
                  <p aria-hidden className="mb-4">
                    {section.title}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {section.items.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        aria-pressed={item.selected}
                        onClick={() => toggle(section.key, item.value)}
                        lang={item.lang}
                        className={clsx(
                          "t-small border px-3 py-2 whitespace-pre transition-colors duration-200",
                          item.selected ? "border-ink bg-ink text-paper" : "hairline text-ink-soft hover:border-ink hover:text-ink",
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-4 border-t hairline px-6 py-5 sm:px-8">
              <button type="button" onClick={clear} className="t-nav link-line text-ink-mute">
                Clear
              </button>
              <Button onClick={onClose}>
                Show {resultCount} {resultCount === 1 ? "vendor" : "vendors"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
