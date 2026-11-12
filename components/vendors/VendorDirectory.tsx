"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { countSearch } from "@/components/site/Analytics";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { languages, serviceLabels } from "@/data/taxonomy";
import type { CraftId } from "@/data/types";
import { type AreaFilter, areaFilterLabel, filterVendors, filtersToParams, isOverseas, parseFilters, toggleArea, type VendorFilters } from "@/lib/vendors";
import { FilterDrawer, type FilterOptions } from "./FilterDrawer";
import { VendorCard, type VendorCardData } from "./VendorCard";

export type CraftTab = { id: CraftId | null; label: string; count: number };

const ease = [0.16, 1, 0.3, 1] as const;

/** The vendors the team chose in Approvals take a double-width tile; the dense grid flow keeps it free of gaps. */
const isWide = ({ vendor }: VendorCardData) => !!vendor.largeTile && !!vendor.cover;

/** "Canada", "Canada and Europe", "Canada, Europe and Asia". */
const listOf = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0]);

export function VendorDirectory({ cards, tabs, options }: { cards: VendorCardData[]; tabs: CraftTab[]; options: FilterOptions }) {
  const params = useSearchParams();
  const filters = useMemo(() => parseFilters(new URLSearchParams(params.toString())), [params]);
  const [drawer, setDrawer] = useState(false);
  // The search box filters from its own state, so typing never waits on the address bar.
  const [query, setQuery] = useState(filters.q);

  // history.replaceState keeps filtering instant; Next syncs it with useSearchParams.
  const apply = useCallback((next: VendorFilters) => {
    const qs = filtersToParams(next).toString();
    window.history.replaceState(null, "", qs ? `/vendors?${qs}` : "/vendors");
  }, []);

  const byVendor = useMemo(() => new Map(cards.map((c) => [c.vendor, c])), [cards]);
  const results = filterVendors(
    cards.map((c) => c.vendor),
    { ...filters, q: query },
  ).map((v) => byVendor.get(v)!);
  const wide = results.map(isWide);

  // For Admin → Traffic: the words, once typing stops, and how many listings match them on their
  // own (not narrowed by the filters), so a search that finds no one shows who to sign up.
  useEffect(() => {
    if (query.trim().length < 2) return;
    const t = setTimeout(() => countSearch(query, filterVendors(cards.map((c) => c.vendor), { ...parseFilters(new URLSearchParams()), q: query }).length), 1500);
    return () => clearTimeout(t);
  }, [query, cards]);
  // Chosen overseas regions with no vendors at all yet.
  const empty = new Set(options.areas.filter(([, n]) => n === 0).map(([a]) => a));
  const abroad = filters.areas.filter((a) => isOverseas(a) && empty.has(a)).map((a) => areaFilterLabel(a));

  const toggle = (key: "languages" | "areas" | "services", value: string) => {
    if (key === "areas") return apply({ ...filters, areas: toggleArea(filters.areas, value as AreaFilter) });
    const list = filters[key] as string[];
    apply({
      ...filters,
      [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
    });
  };
  const clear = () =>
    apply({
      craft: filters.craft,
      languages: [],
      areas: [],
      services: [],
      q: query,
      sort: filters.sort,
    });
  const search = (q: string) => {
    setQuery(q);
    apply({ ...filters, q });
  };

  const chips = [
    ...filters.languages.map((l) => ({
      key: "languages" as const,
      value: l,
      label: l === "Other" ? "Other languages" : languages[l].native,
    })),
    ...filters.services.map((s) => ({
      key: "services" as const,
      value: s,
      label: serviceLabels[s],
    })),
    ...filters.areas.map((a) => ({
      key: "areas" as const,
      value: a,
      label: areaFilterLabel(a),
    })),
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
        <div className="flex flex-wrap items-center gap-x-6 gap-y-5 text-ink-mute">
          <label className="group flex min-w-0 basis-full items-center gap-2.5 py-1.5 md:w-60 md:basis-auto">
            <Icon name="search" className="size-4 shrink-0 transition-colors group-focus-within:text-ink" />
            <span className="sr-only">Search vendors</span>
            <input
              type="search"
              value={query}
              onChange={(e) => search(e.target.value)}
              placeholder="Search"
              enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink-mute focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button type="button" onClick={() => search("")} aria-label="Clear search" className="shrink-0 hover:text-ink">
                <Icon name="close" className="size-3.5" />
              </button>
            )}
          </label>
          <button type="button" onClick={() => setDrawer(true)} className="flex shrink-0 items-center gap-2 transition-colors hover:text-ink">
            <Icon name="filter" className="size-4" />
            Filters
            {chips.length > 0 && <span className="text-ink">({chips.length})</span>}
          </button>
          <button
            type="button"
            onClick={() =>
              apply({
                ...filters,
                sort: filters.sort === "az" ? "featured" : "az",
              })
            }
            className="shrink-0 transition-colors hover:text-ink"
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
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.8,
                    delay: Math.min(i, 8) * 0.04,
                    ease,
                  },
                }}
                exit={{ opacity: 0, transition: { duration: 0.25 } }}
                transition={{ layout: { duration: 0.7, ease } }}
              >
                <VendorCard
                  data={card}
                  aspect="aspect-[3/2] sm:aspect-[4/5]"
                  position="50% 35%"
                  fill={wide[i]}
                  priority={i === 0}
                  sizes={wide[i] ? "(min-width: 1280px) 50vw, (min-width: 1024px) 66vw, (min-width: 640px) 50vw, 100vw" : undefined}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      ) : abroad.length ? (
        // Overseas regions are open before they have vendors: invite the ones who work there.
        <div className="mx-auto max-w-[34rem] py-32 text-center">
          <p className="t-heading mb-4">No vendors in {listOf(abroad)} yet</p>
          <p className="t-body mb-8">
            East Meets Wed is growing beyond Australia. If you work with couples in {listOf(abroad)}, we&rsquo;d love to hear from you.
          </p>
          <ArrowLink href="/list-your-business" transitionTypes={["nav-forward"]}>
            List your business
          </ArrowLink>
        </div>
      ) : (
        <div className="mx-auto max-w-[34rem] py-32 text-center">
          <p className="t-heading mb-4">No matches found just yet</p>
          <p className="t-body mb-8">We&rsquo;re adding new vendors all the time. Try fewer filters to see more.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              apply({
                languages: [],
                areas: [],
                services: [],
                q: "",
                sort: filters.sort,
              });
            }}
            className="t-nav link-line"
          >
            {query.trim() ? "Clear search and filters" : "Clear filters"}
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
