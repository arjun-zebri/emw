"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Monogram } from "@/components/brand/Logo";
import { Icon } from "@/components/icons/Icon";
import { Portal } from "@/components/ui/Portal";
import { pendingCount } from "@/lib/admin/feed";
import { enquiries } from "@/lib/admin/people";
import { signIn, signOut, useVendorSlug } from "@/lib/admin/session";
import { useAdmin } from "@/lib/admin/store";
import { getVendor } from "@/lib/vendors";
import { CommandPalette } from "./CommandPalette";
import { NotificationBell } from "./NotificationBell";
import { activeHref, ownerNav, vendorNav, type NavGroup } from "./nav";
import { Toaster } from "./Toaster";
import { Avatar, Kbd } from "./ui";

/** The frame around every admin and vendor-portal page: sidebar, top bar, search and notifications. */
export function AdminShell({ role, children }: { role: "owner" | "vendor"; children: React.ReactNode }) {
  const state = useAdmin();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const nav = role === "owner" ? ownerNav : vendorNav;
  const portalSlug = useVendorSlug();
  const vendorSlug = role === "vendor" ? portalSlug : undefined;
  const vendor = vendorSlug ? getVendor(vendorSlug) : undefined;

  const badges = {
    approvals: pendingCount(state),
    unreplied: vendorSlug ? enquiries.filter((e) => e.vendor === vendorSlug && !e.reply && !state.replies[e.id]).length : 0,
  };

  const user =
    role === "owner"
      ? { name: "East Meets Wed", email: "hello@eastmeetswed.com", src: undefined }
      : { name: vendor?.name ?? "Your business", email: vendor?.contact?.email ?? "", src: vendor?.cover };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((s) => !s);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const sidebar = <Sidebar nav={nav} badges={badges} role={role} user={user} onNavigate={() => setMenu(false)} />;

  return (
    /* Fades in once, on arriving from sign-in or a full load; the shell persists across admin pages. */
    <motion.div
      className="min-h-svh bg-paper lg:pl-[15rem]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
    >
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[15rem] flex-col border-r hairline bg-paper lg:flex">{sidebar}</aside>

      <Portal>
        <AnimatePresence>
          {menu && (
            <div className="fixed inset-0 z-[70] lg:hidden">
              <motion.div className="absolute inset-0 bg-night/25" onClick={() => setMenu(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
              <motion.aside
                className="absolute inset-y-0 left-0 flex w-[17rem] flex-col bg-paper"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
              >
                {sidebar}
              </motion.aside>
            </div>
          )}
        </AnimatePresence>
      </Portal>

      <div className="sticky top-0 z-20 border-b hairline bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-[var(--gutter)]">
          <button type="button" onClick={() => setMenu(true)} aria-label="Open menu" className="-ml-2 p-2 lg:hidden">
            <Icon name="menu" className="size-5" />
          </button>
          <Link href={role === "owner" ? "/admin" : "/account"} aria-label="Home" className="lg:hidden">
            <Monogram className="w-11" />
          </Link>
          <button
            type="button"
            onClick={() => setSearch(true)}
            className="ml-auto flex h-9 min-w-0 items-center gap-2.5 border border-ink/10 bg-surface px-3 text-[0.8125rem] text-ink-mute transition-colors hover:border-ink/25 sm:w-72 lg:ml-0"
          >
            <Icon name="search" className="size-4" strokeWidth={1.5} />
            <span className="hidden flex-1 text-left sm:block">Search or jump to</span>
            <span className="hidden items-center gap-0.5 sm:flex">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
          <div className="flex items-center gap-1 lg:ml-auto">
            <span className="mr-2 hidden items-center gap-1.5 text-[0.75rem] text-ink-mute xl:flex" title="Figures are simulated for the demo">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              Demo data
            </span>
            <a href="/" target="_blank" rel="noreferrer" className="hidden h-9 items-center gap-1.5 px-3 text-[0.8125rem] text-ink-soft transition-colors hover:text-ink sm:flex">
              View site
              <Icon name="arrow-up-right" className="size-3.5" strokeWidth={1.5} />
            </a>
            {role === "owner" && <NotificationBell />}
          </div>
        </div>
      </div>

      <motion.main
        id="main"
        className="mx-auto max-w-[1400px] px-[var(--gutter)] pt-8 pb-24 md:pt-10"
        initial={{ y: 14 }}
        animate={{ y: 0 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.main>

      <CommandPalette open={search} onClose={() => setSearch(false)} role={role} />
      <Toaster />
    </motion.div>
  );
}

type Badges = Record<"approvals" | "unreplied", number>;

function Sidebar({
  nav,
  badges,
  role,
  user,
  onNavigate,
}: {
  nav: NavGroup[];
  badges: Badges;
  role: "owner" | "vendor";
  user: { name: string; email: string; src?: string };
  onNavigate: () => void;
}) {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-3 px-5">
        <Link href={role === "owner" ? "/admin" : "/account"} aria-label="Home" className="transition-opacity hover:opacity-60">
          <Monogram className="w-12" />
        </Link>
        <span className="mt-0.5 border-l hairline pl-3 text-[0.75rem] text-ink-mute">{role === "owner" ? "Admin" : "Vendor"}</span>
      </div>
      {/* The current path is only known at request time on dynamic routes, so the links read it inside Suspense. */}
      <Suspense fallback={<NavLinks nav={nav} badges={badges} onNavigate={onNavigate} />}>
        <ActiveNavLinks nav={nav} badges={badges} onNavigate={onNavigate} />
      </Suspense>
      <UserMenu role={role} user={user} />
    </>
  );
}

function ActiveNavLinks(props: { nav: NavGroup[]; badges: Badges; onNavigate: () => void }) {
  return <NavLinks {...props} active={activeHref(props.nav, usePathname())} />;
}

function NavLinks({ nav, badges, active, onNavigate }: { nav: NavGroup[]; badges: Badges; active?: string; onNavigate: () => void }) {
  return (
    <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 pt-4 pb-6">
      {nav.map((group, gi) => (
        <div key={gi} className={clsx(gi > 0 && "mt-7")}>
          {group.title && <p className="mb-1.5 px-2.5 text-[0.6875rem] text-ink-mute">{group.title}</p>}
          <ul className="space-y-px">
            {group.items.map((item) => {
              const on = item.href === active;
              const count = item.badge ? badges[item.badge] : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={on ? "page" : undefined}
                    className={clsx(
                      "group relative flex h-9 items-center gap-3 px-2.5 text-[0.875rem] transition-colors duration-200",
                      on ? "bg-ink/[0.06] text-ink" : "text-ink-soft hover:bg-ink/[0.03] hover:text-ink",
                    )}
                  >
                    <Icon name={item.icon} className={clsx("size-[1.125rem]", on ? "text-ink" : "text-ink-mute group-hover:text-ink")} strokeWidth={1.4} />
                    <span className="flex-1">{item.label}</span>
                    {count > 0 && <span className="min-w-5 bg-ink px-1.5 text-center text-[0.6875rem] leading-5 font-medium text-paper tabular-nums">{count}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserMenu({ role, user }: { role: "owner" | "vendor"; user: { name: string; email: string; src?: string } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const items = [
    { label: "View the site", icon: "arrow-up-right" as const, run: () => window.open("/", "_blank") },
    role === "owner"
      ? { label: "See a vendor's portal", icon: "store" as const, run: () => (signIn({ role: "vendor", slug: "katrina-lai" }), router.push("/account")) }
      : { label: "Back to the admin", icon: "overview" as const, run: () => (signIn({ role: "owner" }), router.push("/admin")) },
    { label: "Sign out", icon: "logout" as const, run: () => (signOut(), router.push("/login")) },
  ];

  return (
    <div ref={ref} className="relative shrink-0 border-t hairline p-3">
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            className="absolute inset-x-3 bottom-full mb-1 border border-ink/10 bg-surface py-1 shadow-[0_12px_32px_-16px_rgb(22_20_18/0.35)]"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  item.run();
                  setOpen(false);
                }}
                className="flex h-9 w-full items-center gap-3 px-3 text-left text-[0.8125rem] text-ink-soft transition-colors hover:bg-ink/[0.04] hover:text-ink"
              >
                <Icon name={item.icon} className="size-4 text-ink-mute" strokeWidth={1.4} />
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full items-center gap-3 p-1.5 text-left transition-colors hover:bg-ink/[0.03]"
      >
        <Avatar name={user.name} src={user.src} size={32} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.8125rem] font-medium">{user.name}</span>
          <span className="block truncate text-[0.75rem] text-ink-mute">{user.email}</span>
        </span>
        <Icon name="chevron-down" className={clsx("size-4 text-ink-mute transition-transform", open && "rotate-180")} />
      </button>
    </div>
  );
}
