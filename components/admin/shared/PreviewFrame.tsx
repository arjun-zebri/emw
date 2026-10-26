"use client";

import clsx from "clsx";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { Monogram } from "@/components/brand/Logo";
import { Icon } from "@/components/icons/Icon";
import { primaryNav, vendorCta } from "@/components/site/nav";
import { lockScroll } from "@/lib/lenis";

/**
 * A full-screen preview of a public page, under the site's own header: a night bar on top with the
 * views (if there's more than one) and the way back. Escape closes it; focus returns to where it was.
 */
export function PreviewFrame<T extends string>({
  views,
  view,
  onView,
  onClose,
  children,
}: {
  views?: { id: T; label: string }[];
  view?: T;
  onView?: (v: T) => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const close = useRef<HTMLButtonElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    lockScroll(true);
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      lockScroll(false);
      before?.focus();
    };
  }, [onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Preview"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[80] flex flex-col bg-paper"
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-4 bg-night px-[var(--gutter)] text-paper">
        {views && views.length > 1 ? (
          <div role="tablist" aria-label="Preview" className="flex gap-6">
            {views.map((o) => (
              <button
                key={o.id}
                type="button"
                role="tab"
                aria-selected={view === o.id}
                onClick={() => {
                  onView?.(o.id);
                  scroller.current?.scrollTo({ top: 0 });
                }}
                className={clsx(
                  "border-b pb-0.5 text-[0.8125rem] transition-colors duration-300",
                  view === o.id ? "border-paper text-paper" : "border-transparent text-paper/50 hover:text-paper",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[0.8125rem] text-paper/70">Preview</p>
        )}
        <button
          ref={close}
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 text-[0.8125rem] text-paper/70 transition-colors hover:text-paper focus:outline-none focus-visible:text-paper focus-visible:underline"
        >
          Back to editing
          <Icon name="close" className="size-4" strokeWidth={1.5} />
        </button>
      </div>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div aria-hidden className="pointer-events-none select-none">
          <header className="shell flex h-[var(--header-h)] items-center justify-between">
            <Monogram className="w-[4.5rem]" />
            <nav className="hidden items-center gap-10 md:flex">
              {[...primaryNav, vendorCta].map((item) => (
                <span key={item.href} className="t-nav">
                  {item.label}
                </span>
              ))}
            </nav>
          </header>
        </div>
        {children}
      </div>
    </motion.div>
  );
}
