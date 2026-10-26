"use client";

import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/icons/Icon";
import { Portal } from "@/components/ui/Portal";
import { dismiss, useToasts } from "@/lib/admin/toast";

export function Toaster() {
  const toasts = useToasts();
  return (
    <Portal>
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-[80] flex flex-col items-center gap-2 px-4">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, transition: { duration: 0.2 } }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto flex min-h-11 max-w-md items-center gap-3 bg-ink py-2 pr-2 pl-4 text-[0.8125rem] text-paper shadow-[0_12px_32px_-12px_rgb(22_20_18/0.5)]"
            >
              <Icon name="check" className="size-4 text-paper/70" strokeWidth={1.5} />
              <span className="flex-1">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action!.run();
                    dismiss(t.id);
                  }}
                  className="px-2 py-1 font-medium text-paper underline-offset-4 hover:underline"
                >
                  {t.action.label}
                </button>
              )}
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="p-1.5 text-paper/50 hover:text-paper">
                <Icon name="close" className="size-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Portal>
  );
}
