"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Media } from "@/components/media/Media";

type Beat = { image: { src: string; alt: string; position?: string }; content: React.ReactNode };

const ease = [0.16, 1, 0.3, 1] as const;

/** A medium photo pinned beside beats of text; the photo changes as each beat reaches the middle of the screen. */
export function StickyStory({ beats }: { beats: Beat[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const image = beats[active].image;

  return (
    <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
      <div className="md:col-span-5">
        <div className="relative aspect-[4/5] overflow-hidden bg-paper-soft md:sticky md:top-[calc(var(--header-h)+3rem)]">
          <AnimatePresence initial={false}>
            <motion.div
              key={image.src}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease }}
            >
              <Media src={image.src} alt={image.alt} brief="" sizes="(min-width: 768px) 40vw, 100vw" position={image.position} className="size-full" />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className="md:col-span-5 md:col-start-8">
        {beats.map((beat, i) => (
          <div
            key={i}
            data-i={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="flex min-h-[40vh] flex-col justify-center py-8 md:min-h-[75vh]"
          >
            {beat.content}
          </div>
        ))}
      </div>
    </div>
  );
}
