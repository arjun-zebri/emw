"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

export type Value = { title: string; body: string; visual: React.ReactNode };

/**
 * What a listing gives a vendor, one thing at a time. On large screens the list holds still on the
 * left while each picture scrolls past on the right; the one in the middle of the screen lights its
 * line and opens its sentence. On phones each picture sits above its words.
 */
export function ValueStory({ items }: { items: Value[] }) {
  const [active, setActive] = useState(0);
  const panels = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    panels.current.forEach((p) => p && io.observe(p));
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-12">
      <div className="hidden lg:col-span-4 lg:block">
        <ol className="sticky top-[calc(var(--header-h)+3rem)] border-t hairline">
          {items.map((it, i) => (
            <li key={it.title} className="border-b hairline">
              <button
                type="button"
                onClick={() => panels.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" })}
                className={clsx("t-title block w-full py-5 text-left text-[clamp(1.375rem,1.9vw,1.75rem)] transition-colors duration-500", i === active ? "text-ink" : "text-ink/25 hover:text-ink/50")}
              >
                {it.title}
              </button>
              <div className={clsx("grid transition-[grid-template-rows,opacity] duration-700 ease-out-expo", i === active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                <p className="t-body overflow-hidden pr-6 [&:not(:empty)]:pb-6">{it.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="space-y-[clamp(4rem,8vw,7rem)] lg:col-span-7 lg:col-start-6 lg:space-y-[18vh] lg:py-[8vh]">
        {items.map((it, i) => (
          <div
            key={it.title}
            ref={(el) => {
              panels.current[i] = el;
            }}
            data-i={i}
          >
            <div data-reveal suppressHydrationWarning>
              {it.visual}
            </div>
            <div className="mt-6 lg:hidden">
              <h3 className="t-title text-[1.5rem]">{it.title}</h3>
              <p className="t-body mt-2">{it.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
