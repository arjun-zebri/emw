"use client";

import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { Portal } from "@/components/ui/Portal";
import { languages, serviceLabels } from "@/data/taxonomy";
import type { Service } from "@/data/types";
import { lockScroll } from "@/lib/lenis";
import { type AreaFilter, areaFilterLabel, isState, type LanguageFilter, type VendorFilters } from "@/lib/vendors";

export type FilterOptions = {
  languages: [LanguageFilter, number][];
  areas: [AreaFilter, number][];
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
      id: "languages",
      title: "Language",
      items: options.languages.map(([l]) => ({
        value: l,
        label: l === "Other" || languages[l].native === l ? l : `${languages[l].native}  ${l}`,
        lang: l === "Other" ? undefined : languages[l].lang,
        selected: filters.languages.includes(l),
      })),
    },
    {
      key: "services" as const,
      id: "services",
      title: "Service",
      items: options.services.map(([s]) => ({ value: s, label: serviceLabels[s], lang: undefined, selected: filters.services.includes(s) })),
    },
    {
      key: "areas" as const,
      id: "areas",
      title: "Location",
      items: options.areas
        // Overseas regions are held back for now: Australia only.
        .filter(([a]) => a === "AUS")
        .map(([a]) => ({ value: a, label: areaFilterLabel(a), lang: undefined, selected: filters.areas.includes(a) })),
    },
  ];
  // Once Australia is on, its states open beneath to narrow it.
  const states = options.areas.filter(([a]) => isState(a)).map(([a]) => ({ value: a, label: areaFilterLabel(a, true), selected: filters.areas.includes(a) }));
  const showStates = filters.areas.includes("AUS") && states.length > 0;
  const reduce = useReducedMotion();
  const statesRef = useRef<HTMLDivElement>(null);
  const chip = (selected: boolean) =>
    clsx(
      "t-small border px-3 py-2 whitespace-pre transition-colors duration-200",
      selected ? "border-ink bg-ink text-paper" : "hairline text-ink-soft hover:border-ink hover:text-ink",
    );

  return (
    <Portal>
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
                  <fieldset key={section.id} className="border-t hairline py-7">
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
                          className={chip(item.selected)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <AnimatePresence initial={false}>
                      {section.key === "areas" && showStates && (
                        <motion.div
                          key="states"
                          role="group"
                          aria-label="States"
                          className="overflow-hidden"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: reduce ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
                          // At the foot of the drawer the states would open out of sight, so bring them into view.
                          onAnimationComplete={(def) => {
                            if (typeof def === "object" && "height" in def && def.height === "auto")
                              statesRef.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
                          }}
                          ref={statesRef}
                        >
                          <div className="flex flex-wrap gap-2 pt-2">
                            {states.map((s, i) => (
                              <motion.button
                                key={s.value}
                                type="button"
                                aria-pressed={s.selected}
                                onClick={() => toggle("areas", s.value)}
                                className={chip(s.selected)}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: reduce ? 0 : 0.45, delay: reduce ? 0 : 0.04 * i, ease: [0.16, 1, 0.3, 1] }}
                              >
                                {s.label}
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
    </Portal>
  );
}
