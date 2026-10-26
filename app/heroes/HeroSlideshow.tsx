"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Media } from "@/components/media/Media";
import { ArrowLink } from "@/components/ui/ArrowLink";

type Slide = { src: string; by: string; href: string; position?: string };

const DURATION = 5500;

/** Slow crossfading slides, each credited to the vendor who shot it. */
export function HeroSlideshow({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setIndex((i) => (i + 1) % slides.length), DURATION);
    return () => clearTimeout(t);
  }, [index, slides.length]);

  return (
    <>
      {slides.map((s, i) => (
        <div
          key={s.src}
          className={clsx("absolute inset-0 transition-opacity duration-[1600ms] ease-out", i === index ? "opacity-100" : "opacity-0")}
        >
          <div className={clsx("size-full", i === index && "animate-[slide-drift_7s_linear_both]")}>
            <Media src={s.src} alt={`Photographed by ${s.by}`} brief="" sizes="100vw" className="size-full" position={s.position} />
          </div>
        </div>
      ))}
      <span className="absolute inset-0 bg-gradient-to-t from-night/55 via-night/0 to-night/30" />
      <div className="shell absolute inset-x-0 bottom-0 flex flex-col gap-8 pb-[clamp(2rem,5vw,4rem)] md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="t-display max-w-[11ch]">Weddings that belong to two worlds</h1>
          <div className="mt-8">
            <ArrowLink href="/vendors">Find vendors</ArrowLink>
          </div>
        </div>
        <div className="w-full max-w-xs">
          <p className="t-small mb-3 text-paper/75">
            Photographed by{" "}
            <Link href={slides[index].href} className="link-line text-paper">
              {slides[index].by}
            </Link>
          </p>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${slides.length}, 1fr)` }}>
            {slides.map((s, i) => (
              <button key={s.src} type="button" onClick={() => setIndex(i)} aria-label={`Show photo by ${s.by}`} className="py-2">
                <span className="block h-px bg-paper/30">
                  <span
                    key={i === index ? `on-${index}` : "off"}
                    className={clsx("block h-full origin-left bg-paper", i === index ? "animate-[slide-progress_5.5s_linear_both]" : i < index ? "scale-x-100" : "scale-x-0")}
                  />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes slide-drift{from{scale:1.08}to{scale:1}}@keyframes slide-progress{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}</style>
    </>
  );
}
