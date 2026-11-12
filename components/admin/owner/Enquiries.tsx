"use client";

import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { areaOptions, areas, craftById } from "@/data/taxonomy";
import type { AreaCode, CraftId } from "@/data/types";
import { loadListedVendors, useEnquiries, type ListedVendor } from "@/lib/admin/enquiries";
import { type Facet, facetLabel, type Filters, listingMatches, matches, type Period, PERIODS, type Range, rangeOf, within } from "@/lib/admin/enquiry-filters";
import { ago, plural } from "@/lib/admin/format";
import { useToday } from "@/lib/admin/time";
import { DatePicker } from "../shared/DatePicker";
import { Dropdown } from "../shared/Dropdown";
import { Avatar, Btn, Empty, inputCls, NotYet, PageHeader, Panel } from "../ui";

/** Enquiries per page of the inbox. */
const PAGE = 20;
import { Bone } from "../charts";
import { Thread } from "../vendor/Enquiries";
import { EnquiryInsights } from "./EnquiryInsights";

/**
 * Enquiries for the team: what they add up to over a period, against the one before, then every
 * enquiry behind the figures. Clicking a vendor, category or culture in the figures, or choosing a
 * location, adds it as a filter, shown as a chip under the title; the inbox follows.
 */
export function Enquiries() {
  const { status, error, list: every } = useEnquiries();
  const today = useToday();
  const [vendors, setVendors] = useState<ListedVendor[] | null>(null);
  const [filters, setFilters] = useState<Filters>({ period: "30d", facets: {}, q: "" });
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    loadListedVendors().then(setVendors, () => setVendors([]));
  }, []);

  const bySlug = useMemo(() => new Map((vendors ?? []).map((v) => [v.slug, v])), [vendors]);
  const { range, prev } = useMemo(() => rangeOf(filters, today, every.at(-1)?.sentAt), [filters, today, every]);
  // The facets without the search, for the figures; the inbox adds the search.
  const faceted = useMemo(() => every.filter((e) => matches(e, { ...filters, q: "" }, bySlug)), [every, filters, bySlug]);
  const list = useMemo(() => faceted.filter((e) => within(e, range)), [faceted, range]);
  const before = useMemo(() => (prev ? faceted.filter((e) => within(e, prev)) : undefined), [faceted, prev]);
  const candidates = useMemo(() => (vendors ?? []).filter((v) => listingMatches(v, filters)), [vendors, filters]);
  const inbox = useMemo(() => (filters.q.trim() ? list.filter((e) => matches(e, filters, bySlug)) : list), [list, filters, bySlug]);

  const pages = Math.max(1, Math.ceil(inbox.length / PAGE));
  const at = Math.min(page, pages - 1);
  const onPage = inbox.slice(at * PAGE, at * PAGE + PAGE);
  const current = onPage.find((e) => e.id === selected) ?? null;
  const shown = current ?? onPage[0];

  const update = (change: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...change }));
    setSelected(null);
    setPage(0);
  };
  const turn = (to: number) => {
    setPage(to);
    setSelected(null);
  };
  const pick = (facet: Facet, value: string) => update({ facets: { ...filters.facets, [facet]: filters.facets[facet] === value ? undefined : value } });
  const zoom = (r: Range) => update({ period: "custom", from: r.start, to: r.end });

  const chips = (Object.entries(filters.facets) as [Facet, string | undefined][])
    .filter((c): c is [Facet, string] => !!c[1])
    .map(([facet, value]) => ({
      facet,
      label:
        facet === "vendor"
          ? (bySlug.get(value)?.name ?? value)
          : facet === "craft"
            ? (craftById[value as CraftId]?.name ?? value)
            : facet === "location"
              ? (areas[value as AreaCode] ?? value)
              : value,
    }));

  const ready = status === "ready" && !!vendors && !!today;
  // Only the places some listing covers, Australian states first.
  const places = areaOptions().filter((o) => !vendors || vendors.some((v) => v.areas.includes(o.value)));

  if (status === "error")
    return (
      <>
        <PageHeader title="Enquiries" />
        <Panel>
          <Empty title="Couldn't load enquiries">{error}</Empty>
        </Panel>
      </>
    );

  if (status === "ready" && every.length === 0)
    return (
      <>
        <PageHeader title="Enquiries" />
        <NotYet
          title="No enquiries yet"
          items={[
            { icon: "speech", title: "Are we delivering", detail: "Enquiries and the average per listing, against the period before." },
            { icon: "store", title: "Who's getting value", detail: "The ten listings couples write to most, and the ten to help next." },
            { icon: "search", title: "Where demand is", detail: "By category and the cultures couples name." },
          ]}
        >
          Couples send enquiries from vendor pages. Each one is emailed to the vendor and counted here.
        </NotYet>
      </>
    );

  return (
    <>
      <PageHeader
        title="Enquiries"
        description="What couples send vendors from their listings, against the period before."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-52 border border-ink/15 bg-surface px-3 py-2 transition-colors hover:border-ink/40">
              <Dropdown
                single
                options={[{ value: "all", label: "All locations" }, ...places]}
                value={filters.facets.location ?? "all"}
                onChange={(location: string) => update({ facets: { ...filters.facets, location: location === "all" ? undefined : location } })}
                placeholder="All locations"
              />
            </div>
            <PeriodControl filters={filters} range={range} update={update} />
          </div>
        }
      />

      {chips.length > 0 && (
        <div className="-mt-2 mb-6 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              key={c.facet}
              type="button"
              onClick={() => pick(c.facet, filters.facets[c.facet]!)}
              className="group inline-flex items-center gap-2 border border-ink bg-ink py-1.5 pr-2.5 pl-3 text-[0.8125rem] text-paper"
              aria-label={`Remove ${facetLabel[c.facet]}: ${c.label}`}
            >
              <span className="text-paper/60">{facetLabel[c.facet]}</span>
              {c.label}
              <Icon name="close" className="size-3.5 opacity-60 group-hover:opacity-100" strokeWidth={1.6} />
            </button>
          ))}
          <button type="button" onClick={() => update({ facets: {} })} className="px-2 text-[0.8125rem] text-ink-soft underline decoration-ink/20 underline-offset-4 hover:text-ink">
            Clear all
          </button>
        </div>
      )}

      <EnquiryInsights
        ready={ready}
        list={list}
        before={before}
        every={every}
        range={range}
        prev={prev}
        today={today}
        candidates={candidates}
        facets={filters.facets}
        pick={pick}
        zoom={zoom}
      />

      <div className="mt-14 mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-display text-[1.75rem] leading-none tracking-[-0.02em]">
          {ready ? plural(inbox.length, "enquiry", "enquiries") : "Enquiries"}
        </h2>
        <Search value={filters.q} onChange={(q) => update({ q })} />
      </div>

      {/* A fixed height on wide screens: the list and the enquiry scroll inside it. */}
      <div className="flex flex-col border border-ink/[0.09] bg-surface lg:h-[46rem]">
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[24rem_1fr]">
          {!ready ? (
            <>
              <ul className="border-ink/[0.09] lg:overflow-hidden lg:border-r">
                {Array.from({ length: 9 }, (_, i) => (
                  <li key={i} className="flex gap-3 border-b border-ink/[0.06] px-5 py-4">
                    <Bone className="size-[34px] rounded-full" />
                    <span className="flex-1 space-y-2">
                      <Bone className="h-3.5 w-1/2" />
                      <Bone className="h-3 w-1/3" />
                    </span>
                  </li>
                ))}
              </ul>
              <div className="hidden space-y-4 p-8 lg:block">
                <Bone className="h-7 w-1/3" />
                <Bone className="h-4 w-1/2" />
                <Bone className="mt-8 h-32 w-2/3" />
              </div>
            </>
          ) : inbox.length === 0 ? (
            <div className="flex items-center justify-center lg:col-span-2">
              <Empty title="No enquiries match">Try a longer period, or remove a filter.</Empty>
            </div>
          ) : (
            <>
              <ul className={clsx("border-ink/[0.09] lg:overflow-y-auto lg:border-r", current && "hidden lg:block")}>
                {onPage.map((e) => {
                  const active = shown?.id === e.id;
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(e.id)}
                        aria-current={active ? "true" : undefined}
                        className={clsx("flex w-full gap-3 border-b border-ink/[0.06] px-5 py-4 text-left transition-colors", active ? "lg:bg-paper" : "hover:bg-paper/60")}
                      >
                        <Avatar name={e.name} size={34} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-[0.875rem]">{e.name}</span>
                            <span className="shrink-0 text-[0.75rem] text-ink-soft">{ago(e.sentAt)}</span>
                          </span>
                          <span className="mt-0.5 block truncate text-[0.8125rem] text-ink-soft">To {e.vendorName}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className={clsx("min-h-0 lg:overflow-y-auto", !current && "hidden lg:block")}>
                {shown && <Thread key={shown.id} enquiry={shown} onBack={() => setSelected(null)} hiddenOnMobile={false} team />}
              </div>
            </>
          )}
        </div>
        <div className={clsx("flex h-14 shrink-0 items-center justify-between gap-3 border-t border-ink/[0.09] px-5 text-[0.8125rem]", current && "hidden lg:flex")}>
          <span className="text-ink-soft tabular-nums">{ready ? (inbox.length ? `${at * PAGE + 1}–${Math.min(inbox.length, (at + 1) * PAGE)} of ${inbox.length}` : "None") : <Bone className="h-4 w-24" />}</span>
          <span className="flex gap-2">
            <Btn icon="chevron-left" onClick={() => turn(at - 1)} disabled={!ready || at === 0}>
              Newer
            </Btn>
            <Btn onClick={() => turn(at + 1)} disabled={!ready || at >= pages - 1}>
              Older
            </Btn>
          </span>
        </div>
      </div>
    </>
  );
}

/** The period, top right: a preset, or two dates. Days are Melbourne days. */
function PeriodControl({ filters, range, update }: { filters: Filters; range: Range; update: (c: Partial<Filters>) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-44 border border-ink/15 bg-surface px-3 py-2 transition-colors hover:border-ink/40">
        <Dropdown
          single
          options={PERIODS.map((p) => ({ value: p.id, label: p.label }))}
          value={filters.period}
          onChange={(period: Period) => update(period === "custom" ? { period, from: range.start, to: range.end } : { period })}
          placeholder="Period"
        />
      </div>
      {filters.period === "custom" && (
        <>
          <div className="w-48 border border-ink/15 bg-surface px-3 py-2">
            <DatePicker value={filters.from ?? range.start} onChange={(from) => update({ from })} />
          </div>
          <span className="text-ink-soft">to</span>
          <div className="w-48 border border-ink/15 bg-surface px-3 py-2">
            <DatePicker value={filters.to ?? range.end} onChange={(to) => update({ to })} />
          </div>
        </>
      )}
    </div>
  );
}

/** The inbox search, matching every word, a moment after typing stops. */
function Search({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => {
    if (text === value) return;
    const t = setTimeout(() => onChange(text), 250);
    return () => clearTimeout(t);
  }, [text, value, onChange]);
  return (
    <label className="relative block sm:w-80">
      <span className="sr-only">Search enquiries</span>
      <Icon name="search" className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-ink-mute" strokeWidth={1.4} />
      <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search names, venues, messages" className={clsx(inputCls, "pl-6")} />
    </label>
  );
}
