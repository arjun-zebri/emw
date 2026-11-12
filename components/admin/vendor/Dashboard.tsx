"use client";

import clsx from "clsx";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons/Icon";
import { useOwnListing } from "@/lib/account/listing";
import { useEnquiries } from "@/lib/admin/enquiries";
import { longDay, plural } from "@/lib/admin/format";
import { useVendorSlug } from "@/lib/admin/session";
import { useToday } from "@/lib/admin/time";
import { Btn, PageHeader, Panel } from "../ui";
import { ProfileStats } from "./ProfileStats";

export function Dashboard() {
  const slug = useVendorSlug();
  const { listing: vendor } = useOwnListing(slug);
  const enquiries = useEnquiries(slug);
  const now = useToday();
  const name = vendor ? (vendor.person || vendor.name).split(" ")[0] : "";
  const unread = enquiries.list.filter((e) => !e.readAt);
  const photos = vendor?.photos.length ?? 0;

  const tasks: { icon: IconName; title: string; detail: string; href: string; action: string; warn?: boolean }[] = [];
  if (unread.length)
    tasks.push({
      icon: "speech",
      title: `${plural(unread.length, "new enquiry", "new enquiries")}`,
      detail: unread.map((e) => e.name).join(", "),
      href: "/account/enquiries",
      action: "Read",
    });
  if (vendor && photos < 3)
    tasks.push({
      icon: "image",
      title: photos === 0 ? "Your listing has no photos" : `Your listing has ${plural(photos, "photo")}`,
      detail: "Listings with a few strong photos are the ones couples open. Add more from your listing.",
      href: "/account/listing",
      action: "Add photos",
    });

  return (
    <>
      <PageHeader
        title={name ? `Hello, ${name}` : "Hello"}
        description={now ? longDay(now) : undefined}
        actions={
          vendor?.status === "published" && (
            <Btn icon="arrow-up-right" href={`/vendors/${vendor.slug}`} external>
              View your listing
            </Btn>
          )
        }
      />

      {tasks.length > 0 && (
        <Panel className="mb-6" flush>
          <ul>
            {tasks.map((t, i) => (
              <li key={t.title} className={clsx(i > 0 && "border-t border-ink/[0.06]")}>
                <Link href={t.href} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-paper/70 sm:px-6">
                  <span className={clsx("flex size-8 shrink-0 items-center justify-center", t.warn ? "bg-warn/10 text-warn" : "bg-ink/[0.05] text-ink-soft")}>
                    <Icon name={t.icon} className="size-4" strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.875rem]">{t.title}</span>
                    <span className="block text-[0.75rem] text-ink-mute">{t.detail}</span>
                  </span>
                  <span className="hidden items-center gap-1.5 text-[0.8125rem] text-ink-mute transition-colors group-hover:text-ink sm:flex">
                    {t.action}
                    <Icon name="arrow" className="size-3.5 transition-transform duration-500 ease-out-expo group-hover:translate-x-0.5" strokeWidth={1.5} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <ProfileStats slug={slug} enquiries={enquiries.list} enquiriesReady={enquiries.status === "ready"} />
    </>
  );
}
