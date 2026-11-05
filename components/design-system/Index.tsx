"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { scrollToElement } from "@/lib/lenis";

/** The chapter list: sticky beside the content from lg, marking the chapter in view. */
export function Index({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => !!el);
    // A chapter is current while it crosses a band a third of the way down the screen.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-33% 0px -66% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  const go = (e: React.MouseEvent, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    scrollToElement(el, 72);
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <nav aria-label="Design system">
      <ul className="flex flex-wrap gap-x-5 gap-y-2 lg:flex-col lg:gap-0">
        {items.map((item) => {
          const on = active === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => go(e, item.id)}
                aria-current={on ? "location" : undefined}
                className={clsx("group flex items-center gap-3 py-1 text-[0.875rem] transition-colors duration-300 lg:py-1.5", on ? "text-ink" : "text-ink-mute hover:text-ink")}
              >
                <span aria-hidden className="hidden w-5 lg:block">
                  <span
                    className={clsx("block h-px origin-left bg-current transition-transform duration-500 ease-out-expo", on ? "scale-x-100" : "scale-x-0 group-hover:scale-x-50")}
                  />
                </span>
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
