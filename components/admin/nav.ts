import type { IconName } from "@/components/icons/Icon";

/** `soon`: not built yet (still sample data). Greyed out in the sidebar and left out of search. */
export type NavItem = { href: string; label: string; icon: IconName; badge?: "approvals" | "unread"; soon?: true };
export type NavGroup = { title?: string; items: NavItem[] };

export const ownerNav: NavGroup[] = [
  {
    title: "Insights",
    items: [
      { href: "/admin/traffic", label: "Traffic", icon: "trend" },
      { href: "/admin/enquiries", label: "Enquiries", icon: "speech" },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/admin/approvals", label: "Approvals", icon: "inbox", badge: "approvals" },
      { href: "/admin/vendors", label: "Vendors", icon: "store" },
      { href: "/admin/journal", label: "Journal", icon: "pen" },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/admin/notifications", label: "Notifications", icon: "bell" },
      { href: "/admin/account", label: "Account", icon: "cog" },
    ],
  },
];

// Settings (your account, plan and billing, notifications) open from the account menu at the foot.
export const vendorNav: NavGroup[] = [
  {
    items: [
      { href: "/account/listing", label: "Your listing", icon: "store" },
      { href: "/account", label: "Dashboard", icon: "overview" },
      { href: "/account/enquiries", label: "Enquiries", icon: "speech", badge: "unread" },
    ],
  },
];

/** The nav item a path belongs to: the longest href that prefixes it. */
export function activeHref(groups: NavGroup[], pathname: string) {
  const all = groups.flatMap((g) => g.items.map((i) => i.href));
  return all.filter((h) => pathname === h || pathname.startsWith(`${h}/`)).sort((a, b) => b.length - a.length)[0];
}
