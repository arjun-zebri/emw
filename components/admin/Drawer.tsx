"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Portal } from "@/components/ui/Portal";
import { lockScroll } from "@/lib/lenis";

/** Whether `el` is the last open modal on the page (portals stack in the order they open). */
export function isTopLayer(el: HTMLElement | null) {
  const modals = document.querySelectorAll('[aria-modal="true"]');
  return !!el && modals[modals.length - 1] === el;
}

/** A slide-over panel from the right, the same motion as the public site's filters and enquiry form. */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  width = "max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  // The latest onClose, so a parent passing a new function each render doesn't re-run the effect
  // (which would pull focus back to the panel mid-typing).
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  // Pages stay alive, hidden, after they're left (<Activity>). A sheet that was sliding away when its
  // page was hidden can be left half-gone and impossible to close; starting the sheet afresh when its
  // page shows again (effects run again then) clears it.
  const [shown, setShown] = useState(0);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- runs each time the page is shown again, which is the point
  useEffect(() => setShown((n) => n + 1), []);

  useEffect(() => {
    lockScroll(open);
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    // Escape closes only the top layer: a lightbox or preview opened from inside the panel goes first.
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && isTopLayer(panel.current) && close.current();
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      // Also when the page goes away with the panel still open (a link inside it), or the next page can't scroll.
      lockScroll(false);
      prev?.focus();
    };
  }, [open]);

  return (
    <Portal>
      <AnimatePresence key={shown}>
        {open && (
          <div className="fixed inset-0 z-[70]">
            <motion.div
              className="absolute inset-0 bg-night/25"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            />
            <motion.div
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-label={typeof title === "string" ? title : undefined}
              tabIndex={-1}
              className={clsx("absolute inset-y-0 right-0 flex w-full flex-col bg-paper outline-none", width)}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
            >
              <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b hairline px-6">
                <div className="min-w-0 truncate text-[0.9375rem] font-medium">{title}</div>
                <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 p-2 text-ink-mute transition-colors hover:text-ink">
                  <Icon name="close" className="size-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
              {footer && <div className="flex shrink-0 items-center justify-end gap-2 border-t hairline bg-paper px-6 py-4">{footer}</div>}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
