"use client";

import clsx from "clsx";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons/Icon";
import { useEnquiries } from "@/lib/admin/enquiries";
import { longDay, plural } from "@/lib/admin/format";
import { useVendorSlug } from "@/lib/admin/session";
import { hoursSince, useToday } from "@/lib/admin/time";
import { getVendor } from "@/lib/static-vendors";
import { Btn, NotYet, PageHeader, Panel } from "../ui";

export function Dashboard() {
  const slug = useVendorSlug();
  const vendor = getVendor(slug);
  const enquiries = useEnquiries(slug);
  const now = useToday();
  const name = (vendor?.person ?? vendor?.signoff ?? vendor?.name ?? "there").split(" ")[0];
  const waiting = enquiries.list.filter((e) => !e.repliedAt);
  const late = waiting.filter((e) => hoursSince(e.sentAt) >= 48);
  const photos = vendor ? [vendor.cover, ...(vendor.gallery ?? [])].filter(Boolean).length : 0;

  const tasks: { icon: IconName; title: string; detail: string; href: string; action: string; warn?: boolean }[] = [];
  if (waiting.length)
    tasks.push({
      icon: "speech",
      warn: late.length > 0,
      title: `${plural(waiting.length, "enquiry", "enquiries")} waiting for a reply`,
      detail: late.length ? `${late[0].name} has waited ${Math.round(hoursSince(late[0].sentAt))} hours. Couples usually book whoever replies first.` : waiting.map((e) => e.name).join(", "),
      href: "/account/enquiries",
      action: "Reply",
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
        title={`Hello, ${name}`}
        description={now ? longDay(now) : undefined}
        actions={
          <Btn icon="arrow-up-right" href={`/vendors/${slug}`} external>
            View your listing
          </Btn>
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

      <NotYet
        title="Your numbers start at launch"
        items={[
          { icon: "eye", title: "Profile views", detail: "How many couples open your listing, day by day." },
          { icon: "arrow-up-right", title: "Clicks", detail: "Visits to your website, Instagram and Facebook from your listing." },
          { icon: "speech", title: "Enquiries", detail: "How many couples write to you, and how quickly you reply." },
          { icon: "search", title: "How they find you", detail: "The searches and categories that lead couples to you." },
        ]}
      >
        Once the new site is live, you&rsquo;ll see how couples find and use your listing here.
      </NotYet>
    </>
  );
}
