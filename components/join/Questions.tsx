"use client";

import clsx from "clsx";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";

/** Short answers to what vendors ask before they apply. One open at a time. */
export function Questions({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="border-t hairline">
      {items.map((it, i) => {
        const on = open === i;
        return (
          <li key={it.q} className="border-b hairline">
            <button type="button" aria-expanded={on} onClick={() => setOpen(on ? null : i)} className="flex w-full items-center justify-between gap-6 py-5 text-left">
              <span className="t-title text-[1.25rem]">{it.q}</span>
              <Icon name="plus" className={clsx("size-4 shrink-0 transition-transform duration-500 ease-out-expo", on && "rotate-45")} />
            </button>
            <div className={clsx("grid transition-[grid-template-rows,opacity] duration-500 ease-out-expo", on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
              <p className="t-body max-w-[60ch] overflow-hidden [&:not(:empty)]:pb-6">{it.a}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
