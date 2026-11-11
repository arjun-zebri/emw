"use client";

import clsx from "clsx";
import { useCallback, useId, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { FilterDrawer, type FilterOptions } from "@/components/vendors/FilterDrawer";
import type { AreaCode, Language, Service } from "@/data/types";
import type { VendorFilters } from "@/lib/vendors";

/*
 * Interactive examples for the design system. Each one uses the component or the exact classes the
 * site uses, so what you try here is what a couple gets.
 */

// The enquiry form's field style (components/vendor/Enquire.tsx).
const input =
  "w-full border-b hairline bg-transparent py-3 text-ink placeholder:text-ink-mute/70 focus:border-ink focus:outline-none transition-colors";

export function FieldsDemo() {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={`${id}-names`} className="sr-only">
        Your names
      </label>
      <input id={`${id}-names`} placeholder="Your names" className={input} />
      <label htmlFor={`${id}-email`} className="sr-only">
        Email
      </label>
      <input id={`${id}-email`} type="email" placeholder="Email" className={input} />
      <label htmlFor={`${id}-msg`} className="sr-only">
        Message
      </label>
      <textarea id={`${id}-msg`} rows={3} placeholder="Message" className={clsx(input, "resize-none")} />
    </div>
  );
}

const guestOptions = ["Under 80", "80–200", "200–400", "400+"];

export function GuestsDemo() {
  const [guests, setGuests] = useState<string | null>("80–200");
  return (
    <fieldset>
      <legend className="t-small mb-3">Guests</legend>
      <div className="grid grid-cols-4 gap-1.5">
        {guestOptions.map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={guests === g}
            onClick={() => setGuests(g)}
            className={clsx("t-small border py-2 transition-colors", guests === g ? "border-ink bg-ink text-paper" : "hairline text-ink-soft hover:border-ink")}
          >
            {g}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function ChipsDemo({ items }: { items: { value: string; label: string; lang?: string }[] }) {
  const [on, setOn] = useState<string[]>([items[0]?.value].filter(Boolean));
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const selected = on.includes(item.value);
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={selected}
            lang={item.lang}
            onClick={() => setOn(selected ? on.filter((v) => v !== item.value) : [...on, item.value])}
            className={clsx(
              "t-small border px-3 py-2 whitespace-pre transition-colors duration-200",
              selected ? "border-ink bg-ink text-paper" : "hairline text-ink-soft hover:border-ink hover:text-ink",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/** The newsletter field, on the night ground. */
export function NightFieldDemo() {
  const id = useId();
  const [sent, setSent] = useState(false);
  if (sent)
    return (
      <p className="text-paper/80">
        Thank you, you&apos;re on the list.{" "}
        <button type="button" onClick={() => setSent(false)} className="link-line text-paper/50">
          Reset
        </button>
      </p>
    );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
      className="flex items-center border-b border-paper/25 transition-colors focus-within:border-paper"
    >
      <label htmlFor={id} className="sr-only">
        Email address
      </label>
      <input id={id} type="email" required placeholder="Email address" className="w-full bg-transparent py-3 text-paper placeholder:text-paper/35 focus:outline-none" />
      <button type="submit" aria-label="Subscribe" className="p-2 text-paper/70 transition-colors hover:text-paper">
        <Icon name="arrow" className="size-4" />
      </button>
    </form>
  );
}

type Facets = { languages: Language[]; services: Service[]; areas: AreaCode[] };

/** The directory's real filter drawer, with its own local filters. */
export function DrawerDemo({ options, facets }: { options: FilterOptions; facets: Facets[] }) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<VendorFilters>({ languages: [], areas: [], services: [], q: "", sort: "featured" });
  const close = useCallback(() => setOpen(false), []);

  const toggle = (key: "languages" | "areas" | "services", value: string) =>
    setFilters((f) => {
      const list = f[key] as string[];
      return { ...f, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
    });

  // The same rule as filterVendors: any match within a group, every group must match.
  const count = facets.filter(
    (v) =>
      (!filters.languages.length || filters.languages.some((l) => l !== "Other" && v.languages.includes(l))) &&
      (!filters.services.length || filters.services.some((s) => v.services.includes(s))) &&
      (!filters.areas.length || filters.areas.some((a) => v.areas.includes(a))),
  ).length;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-3">
        <Icon name="filter" className="size-4" />
        Open the filter drawer
      </Button>
      <FilterDrawer
        open={open}
        onClose={close}
        filters={filters}
        options={options}
        toggle={toggle}
        clear={() => setFilters({ languages: [], areas: [], services: [], q: "", sort: "featured" })}
        resultCount={count}
      />
    </>
  );
}
