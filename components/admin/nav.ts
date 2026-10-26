import type { IconName } from "@/components/icons/Icon";

export type NavItem = { href: string; label: string; icon: IconName; badge?: "approvals" | "unreplied" };
export type NavGroup = { title?: string; items: NavItem[] };

export const ownerNav: NavGroup[] = [
  { items: [{ href: "/admin", label: "Overview", icon: "overview" }] },
  {
    title: "Insights",
    items: [
      { href: "/admin/traffic", label: "Traffic", icon: "trend" },
      { href: "/admin/enquiries", label: "Enquiries", icon: "speech" },
      { href: "/admin/revenue", label: "Revenue", icon: "coin" },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/admin/approvals", label: "Approvals", icon: "inbox", badge: "approvals" },
      { href: "/admin/vendors", label: "Vendors", icon: "store" },
      { href: "/admin/couples", label: "Couples", icon: "heart" },
      { href: "/admin/journal", label: "Journal", icon: "pen" },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/admin/notifications", label: "Notifications", icon: "bell" },
      { href: "/admin/settings", label: "Team", icon: "people" },
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
      { href: "/account/billing", label: "Plan & billing", icon: "card" },
      { href: "/account/notifications", label: "Notifications", icon: "bell" },
    ],
  },
];

/** The nav item a path belongs to: the longest href that prefixes it. */
export function activeHref(groups: NavGroup[], pathname: string) {
  const all = groups.flatMap((g) => g.items.map((i) => i.href));
  return all.filter((h) => pathname === h || pathname.startsWith(`${h}/`)).sort((a, b) => b.length - a.length)[0];
}
