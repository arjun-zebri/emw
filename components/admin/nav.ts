import type { IconName } from "@/components/icons/Icon";

/** `soon`: not built yet (still sample data). Greyed out in the sidebar and left out of search. */
export type NavItem = { href: string; label: string; icon: IconName; badge?: "approvals" | "unreplied"; soon?: true };
export type NavGroup = { title?: string; items: NavItem[] };

export const ownerNav: NavGroup[] = [
  { items: [{ href: "/admin", label: "Overview", icon: "overview", soon: true }] },
  {
    title: "Insights",
    items: [
      { href: "/admin/traffic", label: "Traffic", icon: "trend", soon: true },
      { href: "/admin/enquiries", label: "Enquiries", icon: "speech", soon: true },
      { href: "/admin/revenue", label: "Revenue", icon: "coin", soon: true },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/admin/approvals", label: "Approvals", icon: "inbox", badge: "approvals" },
      { href: "/admin/vendors", label: "Vendors", icon: "store", soon: true },
      { href: "/admin/couples", label: "Couples", icon: "heart", soon: true },
      { href: "/admin/journal", label: "Journal", icon: "pen", soon: true },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/admin/notifications", label: "Notifications", icon: "bell" },
      { href: "/admin/settings", label: "Team", icon: "people", soon: true },
    ],
  },
];

export const vendorNav: NavGroup[] = [
  {
    items: [
      { href: "/account", label: "Dashboard", icon: "overview" },
      { href: "/account/enquiries", label: "Enquiries", icon: "speech", badge: "unreplied" },
      { href: "/account/listing", label: "Your listing", icon: "store" },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/account/billing", label: "Plan & billing", icon: "card", soon: true },
      { href: "/account/notifications", label: "Notifications", icon: "bell", soon: true },
    ],
  },
];

/** The nav item a path belongs to: the longest href that prefixes it. */
export function activeHref(groups: NavGroup[], pathname: string) {
  const all = groups.flatMap((g) => g.items.map((i) => i.href));
  return all.filter((h) => pathname === h || pathname.startsWith(`${h}/`)).sort((a, b) => b.length - a.length)[0];
}
