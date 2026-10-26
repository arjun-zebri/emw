"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Portal } from "@/components/ui/Portal";
import { signOut } from "@/lib/admin/session";
import { useAdmin } from "@/lib/admin/store";
import { adminVendors } from "@/lib/admin/vendors";
import { ownerNav, vendorNav } from "./nav";
import { Avatar, Kbd } from "./ui";

type Command = { id: string; label: string; detail?: string; group: string; icon?: IconName; avatar?: { name: string; src?: string }; run: () => void };

/** ⌘K: jump to any page, vendor or post, or start a common task, without reaching for the sidebar. */
export function CommandPalette({ open, onClose, role }: { open: boolean; onClose: () => void; role: "owner" | "vendor" }) {
  const router = useRouter();
  const state = useAdmin();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => router.push(href);
    const nav = (role === "owner" ? ownerNav : vendorNav).flatMap((g) => g.items);
    const pages = nav.map((n) => ({ id: n.href, label: n.label, group: "Go to", icon: n.icon, run: go(n.href) }));
    if (role === "vendor") {
      return [
        ...pages,
        { id: "public", label: "See your public listing", group: "Do", icon: "arrow-up-right", run: () => window.open("/vendors", "_blank") },
        { id: "out", label: "Sign out", group: "Do", icon: "logout", run: () => (signOut(), router.push("/login")) },
      ];
    }
    return [
      { id: "new-vendor", label: "Add a vendor", group: "Do", icon: "plus", run: go("/admin/vendors/new") },
      { id: "new-post", label: "Write a journal post", group: "Do", icon: "pen", run: go("/admin/journal/new") },
      { id: "approvals", label: "Review what's waiting for approval", group: "Do", icon: "inbox", run: go("/admin/approvals") },
      { id: "weekly", label: "Preview the weekly summary email", group: "Do", icon: "mail", run: go("/admin/notifications?preview=weekly-summary") },
      { id: "export", label: "Export couples as CSV", group: "Do", icon: "download", run: go("/admin/couples?export=1") },
      ...pages,
      ...adminVendors(state).map((v) => ({
        id: `v-${v.slug}`,
        label: v.name,
        detail: v.discipline,
        group: "Vendors",
        avatar: { name: v.name, src: v.cover },
        run: go(`/admin/vendors/${v.slug}`),
      })),
      ...state.posts.map((p) => ({ id: `p-${p.id}`, label: p.title, detail: p.status === "published" ? "Published" : p.status === "draft" ? "Draft" : "Scheduled", group: "Journal", icon: "pen" as const, run: go(`/admin/journal/${p.id}`) })),
      { id: "out", label: "Sign out", group: "Do", icon: "logout", run: () => (signOut(), router.push("/login")) },
    ];
  }, [role, router, state]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.filter((c) => c.group !== "Vendors" && c.group !== "Journal").slice(0, 12);
    const words = q.split(/\s+/);
    return commands
      .filter((c) => words.every((w) => `${c.label} ${c.detail ?? ""} ${c.group}`.toLowerCase().includes(w)))
      .sort((a, b) => Number(b.label.toLowerCase().startsWith(q)) - Number(a.label.toLowerCase().startsWith(q)))
      .slice(0, 30);
  }, [commands, query]);

  // Reset each time it opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setIndex(0);
    }
  }

  useEffect(() => {
    if (open) requestAnimationFrame(() => input.current?.focus());
  }, [open]);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const run = (c?: Command) => {
    if (!c) return;
    onClose();
    c.run();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(results[index]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[75] flex items-start justify-center px-4 pt-[12vh]">
            <motion.div className="absolute inset-0 bg-night/25" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Search"
              className="relative w-full max-w-xl border border-ink/10 bg-surface shadow-[0_32px_64px_-24px_rgb(22_20_18/0.45)]"
              initial={{ opacity: 0, y: -8, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.99, transition: { duration: 0.15 } }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex h-14 items-center gap-3 border-b hairline px-4">
                <Icon name="search" className="size-[1.125rem] text-ink-mute" strokeWidth={1.5} />
                <input
                  ref={input}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setIndex(0);
                  }}
                  onKeyDown={onKey}
                  placeholder={role === "owner" ? "Search vendors, posts and pages" : "Search"}
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="command-results"
                  aria-activedescendant={results[index] ? `cmd-${results[index].id}` : undefined}
                  className="h-full flex-1 bg-transparent text-[0.9375rem] placeholder:text-ink-mute/70 focus:outline-none"
                />
                <Kbd>esc</Kbd>
              </div>
              <ul ref={list} id="command-results" role="listbox" className="max-h-[min(26rem,60vh)] overflow-y-auto overscroll-contain py-2">
                {results.length === 0 && <li className="px-4 py-8 text-center text-[0.8125rem] text-ink-mute">Nothing matches “{query}”</li>}
                {results.map((c, i) => {
                  const header = c.group !== results[i - 1]?.group ? c.group : null;
                  return (
                    <li key={c.id} role="presentation">
                      {header && <p className="px-4 pt-3 pb-1.5 text-[0.6875rem] text-ink-mute first:pt-1">{header}</p>}
                      <div
                        id={`cmd-${c.id}`}
                        role="option"
                        aria-selected={i === index}
                        data-index={i}
                        onPointerMove={() => setIndex(i)}
                        onClick={() => run(c)}
                        className={clsx("mx-2 flex h-10 cursor-pointer items-center gap-3 px-2.5 text-[0.875rem]", i === index ? "bg-ink/[0.05] text-ink" : "text-ink-soft")}
                      >
                        {c.avatar ? <Avatar name={c.avatar.name} src={c.avatar.src} size={22} /> : <Icon name={c.icon ?? "arrow"} className="size-4 text-ink-mute" strokeWidth={1.4} />}
                        <span className="truncate">{c.label}</span>
                        {c.detail && <span className="truncate text-[0.75rem] text-ink-mute">{c.detail}</span>}
                        {i === index && <Icon name="arrow" className="ml-auto size-3.5 text-ink-mute" strokeWidth={1.5} />}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
