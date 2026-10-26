"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { photoRatios } from "@/data/photo-ratios";
import { languages, serviceLabels, states } from "@/data/taxonomy";
import type { CraftId } from "@/data/types";
import { filterVendors, filtersToParams, parseFilters, type VendorFilters } from "@/lib/vendors";
import { FilterDrawer, type FilterOptions } from "./FilterDrawer";
import { VendorCard, type VendorCardData } from "./VendorCard";

export type CraftTab = { id: CraftId | null; label: string; count: number };

const ease = [0.16, 1, 0.3, 1] as const;

/** A landscape cover takes a double-width tile, at most one in every five cards, so the grid varies without gaps. */
function wideTiles(cards: VendorCardData[]) {
  let since = Infinity;
  return cards.map(({ vendor }) => {
    const wide = (photoRatios[vendor.cover ?? ""] ?? 0) >= 1.3 && since >= 4;
    since = wide ? 0 : since + 1;
    return wide;
  });
}

export function VendorDirectory({ cards, tabs, options }: { cards: VendorCardData[]; tabs: CraftTab[]; options: FilterOptions }) {
  const params = useSearchParams();
  const filters = useMemo(() => parseFilters(new URLSearchParams(params.toString())), [params]);
  const [drawer, setDrawer] = useState(false);

  // history.replaceState keeps filtering instant; Next syncs it with useSearchParams.
  const apply = useCallback((next: VendorFilters) => {
    const qs = filtersToParams(next).toString();
    window.history.replaceState(null, "", qs ? `/vendors?${qs}` : "/vendors");
  }, []);

  const byVendor = useMemo(() => new Map(cards.map((c) => [c.vendor, c])), [cards]);
  const results = filterVendors(
    cards.map((c) => c.vendor),
    filters,
  ).map((v) => byVendor.get(v)!);
  const wide = wideTiles(results);

  const toggle = (key: "languages" | "areas" | "services", value: string) => {
    const list = filters[key] as string[];
    apply({ ...filters, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] });
  };
  const clear = () => apply({ craft: filters.craft, languages: [], areas: [], services: [], sort: filters.sort });

  const chips = [
    ...filters.languages.map((l) => ({ key: "languages" as const, value: l, label: languages[l].native })),
    ...filters.services.map((s) => ({ key: "services" as const, value: s, label: serviceLabels[s] })),
    ...filters.areas.map((a) => ({ key: "areas" as const, value: a, label: states[a] })),
  ];

  return (
    <div>
      <div className="flex flex-col gap-5 border-b hairline pb-5 md:flex-row md:items-center md:justify-between">
        <nav aria-label="Categories" className="-mx-[var(--gutter)] flex gap-7 overflow-x-auto px-[var(--gutter)] [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const active = (filters.craft ?? null) === tab.id;
            return (
              <button
                key={tab.id ?? "all"}
                type="button"
                onClick={() => apply({ ...filters, craft: tab.id ?? undefined })}
                aria-pressed={active}
                className={clsx("shrink-0 transition-colors duration-300", active ? "text-ink" : "text-ink-mute hover:text-ink")}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-6 text-ink-mute">
          <button type="button" onClick={() => setDrawer(true)} className="flex items-center gap-2 transition-colors hover:text-ink">
            <Icon name="filter" className="size-4" />
            Filters{chips.length > 0 && <span className="text-ink">({chips.length})</span>}
          </button>
          <button
            type="button"
            onClick={() => apply({ ...filters, sort: filters.sort === "az" ? "featured" : "az" })}
            className="transition-colors hover:text-ink"
          >
            Sort: {filters.sort === "az" ? "A–Z" : "Featured"}
          </button>
        </div>
      </div>

      <div className="flex min-h-14 flex-wrap items-center gap-2 py-4">
        <p className="t-small mr-3" aria-live="polite">
          {results.length} {results.length === 1 ? "vendor" : "vendors"}
        </p>
        <AnimatePresence initial={false}>
          {chips.map((chip) => (
            <motion.button
              key={`${chip.key}-${chip.value}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              type="button"
              onClick={() => toggle(chip.key, chip.value)}
              aria-label={`Remove ${chip.label}`}
              className="t-small flex items-center gap-1.5 border hairline px-3 py-1.5 text-ink hover:border-ink"
            >
              {chip.label}
              <Icon name="close" className="size-3" />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {results.length > 0 ? (
        <motion.ul layout className="grid grid-cols-1 gap-x-[clamp(1rem,1.6vw,1.5rem)] gap-y-10 pt-4 sm:grid-cols-2 lg:grid-flow-dense lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {results.map((card, i) => (
              <motion.li
                key={card.vendor.slug}
                className={clsx(wide[i] && "lg:col-span-2")}
                layout
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.8, delay: Math.min(i, 8) * 0.04, ease } }}
                exit={{ opacity: 0, transition: { duration: 0.25 } }}
                transition={{ layout: { duration: 0.7, ease } }}
              >
                <VendorCard
                  data={card}
                  fill={wide[i]}
                  priority={i === 0}
                  sizes={wide[i] ? "(min-width: 1280px) 50vw, (min-width: 1024px) 66vw, (min-width: 640px) 50vw, 100vw" : undefined}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      ) : (
        <div className="py-32 text-center">
          <p className="t-heading mb-6">No vendors match those filters</p>
          <button type="button" onClick={() => apply({ languages: [], areas: [], services: [], sort: filters.sort })} className="t-nav link-line">
            Clear filters
          </button>
        </div>
      )}

      <FilterDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        filters={filters}
        options={options}
        toggle={toggle}
        clear={clear}
        resultCount={results.length}
      />
    </div>
  );
}
