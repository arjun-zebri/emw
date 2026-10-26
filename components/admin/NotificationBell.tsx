"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { feed } from "@/lib/admin/feed";
import { ago } from "@/lib/admin/format";
import { update, useAdmin } from "@/lib/admin/store";

const toneCls = { neutral: "text-ink-mute", good: "text-good", warn: "text-warn", bad: "text-bad" };

export function NotificationBell() {
  const state = useAdmin();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const items = feed(state);
  const unread = items.filter((i) => !state.read.includes(i.id));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("pointerdown", onDown);
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("pointerdown", onDown);
      removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markRead = (ids: string[]) => update((s) => ({ read: [...new Set([...s.read, ...ids])] }));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Notifications, ${unread.length} unread`}
        className="relative flex size-9 items-center justify-center text-ink-soft transition-colors hover:text-ink"
      >
        <Icon name="bell" className="size-5" strokeWidth={1.4} />
        {unread.length > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-bad ring-2 ring-paper" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-x-3 top-16 z-50 flex max-h-[min(36rem,calc(100svh-6rem))] flex-col border border-ink/10 bg-surface shadow-[0_24px_48px_-24px_rgb(22_20_18/0.35)] sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-[24rem]"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex h-12 shrink-0 items-center justify-between border-b hairline px-4">
              <p className="text-[0.875rem] font-medium">Notifications</p>
              {unread.length > 0 && (
                <button type="button" onClick={() => markRead(items.map((i) => i.id))} className="text-[0.75rem] text-ink-mute hover:text-ink">
                  Mark all as read
                </button>
              )}
            </div>
            <ul className="flex-1 overflow-y-auto overscroll-contain">
              {items.map((item) => {
                const isUnread = !state.read.includes(item.id);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        markRead([item.id]);
                        setOpen(false);
                      }}
                      className="flex gap-3 border-b border-ink/[0.05] px-4 py-3 transition-colors hover:bg-paper"
                    >
                      <Icon name={item.icon} className={clsx("mt-0.5 size-4", toneCls[item.tone])} strokeWidth={1.5} />
                      <span className="min-w-0 flex-1">
                        <span className={clsx("block text-[0.8125rem] leading-snug", isUnread ? "text-ink" : "text-ink-soft")}>{item.title}</span>
                        {item.detail && <span className="mt-0.5 block truncate text-[0.75rem] text-ink-mute">{item.detail}</span>}
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="text-[0.6875rem] text-ink-mute">{ago(item.at)}</span>
                        {isUnread && <span className="size-1.5 rounded-full bg-ink" aria-label="Unread" />}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link href="/admin/notifications" onClick={() => setOpen(false)} className="flex h-11 shrink-0 items-center justify-center gap-1.5 text-[0.75rem] text-ink-mute hover:text-ink">
              Choose what you&apos;re alerted about
              <Icon name="arrow" className="size-3.5" strokeWidth={1.5} />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
