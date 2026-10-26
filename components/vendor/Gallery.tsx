"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { createContext, use, useCallback, useEffect, useRef, useState, ViewTransition } from "react";
import { Icon } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import type { Slot } from "@/data/images";
import { lockScroll } from "@/lib/lenis";

type GalleryContext = { images: Slot[]; name: string; slug: string; open: (index: number) => void };
const Context = createContext<GalleryContext | null>(null);

/**
 * Owns the vendor's photographs and their lightbox, so the images themselves can be laid out
 * anywhere in the page (the opener, the sequence further down) and still open the same set.
 */
export function Gallery({ images, name, slug, children }: { images: Slot[]; name: string; slug: string; children: React.ReactNode }) {
  const [index, setIndex] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const step = useCallback((dir: number) => setIndex((i) => (i === null ? i : (i + dir + images.length) % images.length)), [images.length]);
  const close = useCallback(() => setIndex(null), []);

  const isOpen = index !== null;
  useEffect(() => {
    lockScroll(isOpen);
    if (!isOpen) return;
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [isOpen, close, step]);

  return (
    <Context value={{ images, name, slug, open: setIndex }}>
      {children}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${name} photos`}
            className="fixed inset-0 z-[80] flex flex-col bg-night text-paper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="shell flex h-[var(--header-h)] shrink-0 items-center justify-between">
              <p className="t-small text-paper/60 tabular-nums">
                {index + 1} / {images.length}
              </p>
              <button ref={closeRef} type="button" onClick={close} aria-label="Close" className="p-2 text-paper/70 hover:text-paper">
                <Icon name="close" className="size-5" />
              </button>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-[var(--gutter)] pb-[var(--header-h)]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={index}
                  className="flex size-full items-center justify-center [container-type:size]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45 }}
                >
                  {/* The whole frame, never cropped: as large as fits at the photo's own ratio. */}
                  <span
                    className="block"
                    style={{ aspectRatio: images[index].ratio ?? 0.8, width: `min(100cqw, calc(100cqh * ${images[index].ratio ?? 0.8}))` }}
                  >
                    <Media {...images[index]} sizes="90vw" className="size-full" />
                  </span>
                </motion.div>
              </AnimatePresence>
              {images.length > 1 &&
                [-1, 1].map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => step(dir)}
                    aria-label={dir === 1 ? "Next photo" : "Previous photo"}
                    className={clsx(
                      "absolute top-1/2 -translate-y-1/2 p-3 text-paper/70 transition-colors hover:text-paper",
                      dir === 1 ? "right-[var(--gutter)]" : "left-[var(--gutter)]",
                    )}
                  >
                    <Icon name={dir === 1 ? "arrow" : "arrow-left"} className="size-6" />
                  </button>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Context>
  );
}

/**
 * One photograph that opens the lightbox. The cover (index 0) carries the shared view-transition
 * name, so the directory card morphs into it.
 */
export function GalleryImage({
  index,
  className,
  sizes,
  priority,
  position,
}: {
  index: number;
  className?: string;
  sizes: string;
  priority?: boolean;
  position?: string;
}) {
  const ctx = use(Context)!;
  const image = ctx.images[index];
  const media = (
    <div className="size-full transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.02]">
      <Media {...image} priority={priority} sizes={sizes} position={position} className="size-full" />
    </div>
  );

  return (
    <button
      type="button"
      onClick={() => ctx.open(index)}
      aria-label={`View ${ctx.name} photo ${index + 1} of ${ctx.images.length}`}
      className={clsx("group block cursor-zoom-in overflow-hidden", className)}
    >
      {index === 0 ? (
        <ViewTransition name={`vendor-${ctx.slug}`} share="morph" default="none">
          {media}
        </ViewTransition>
      ) : (
        media
      )}
    </button>
  );
}
