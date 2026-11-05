"use client";

import Link from "next/link";
import { useEnquiries } from "@/lib/admin/enquiries";
import { ago, day, plural } from "@/lib/admin/format";
import { hoursSince } from "@/lib/admin/time";
import { getVendor } from "@/lib/static-vendors";
import { Avatar, Badge, Empty, NotYet, PageHeader, Panel, Stat } from "../ui";

/** Every enquiry couples have sent from vendor pages, newest first, and whether the vendor has replied. */
export function Enquiries() {
  const { status, error, list } = useEnquiries();
  const replied = list.filter((e) => e.repliedAt);
  const late = list.filter((e) => !e.repliedAt && hoursSince(e.sentAt) >= 48);
  const vendors = new Set(list.map((e) => e.vendorSlug)).size;

  return (
    <>
      <PageHeader title="Enquiries" description="Leads couples send to vendors, and whether they've had a reply." />

      {status === "loading" ? (
        <Panel>
          <Empty title="Loading">Fetching enquiries.</Empty>
        </Panel>
      ) : status === "error" ? (
        <Panel>
          <Empty title="Couldn't load enquiries">{error}</Empty>
        </Panel>
      ) : list.length === 0 ? (
        <NotYet
          title="No enquiries yet"
          items={[
            { icon: "speech", title: "Every enquiry", detail: "Who wrote, to which vendor, their wedding date and message." },
            { icon: "clock", title: "Replies", detail: "Which vendors have replied, and who has kept a couple waiting." },
          ]}
        >
          Couples send enquiries from vendor pages once the new site is live. Each one appears here and goes to the vendor.
        </NotYet>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Enquiries" value={list.length} note={`To ${plural(vendors, "vendor")}`} />
            <Stat label="Replied to" value={replied.length} note={`${Math.round((replied.length / list.length) * 100)}% of enquiries`} />
            <Stat label="Waiting over two days" value={late.length} note={late.length ? "Worth a nudge" : "Nobody waiting long"} />
            <Stat label="Latest" value={day(list[0].sentAt)} note={ago(list[0].sentAt)} />
          </div>

          <Panel title="Latest enquiries" className="mt-4" flush>
            <ul>
              {list.map((e) => {
                const waiting = hoursSince(e.sentAt);
                return (
                  <li key={e.id} className="flex items-center gap-3 border-t border-ink/[0.06] px-5 py-3 sm:px-6">
                    <Avatar name={e.name} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.8125rem]">
                        {e.name} <span className="text-ink-mute">to</span>{" "}
                        <Link href={`/admin/vendors/${e.vendorSlug}`} className="link-line">
                          {getVendor(e.vendorSlug)?.name ?? e.vendorName}
                        </Link>
                      </span>
                      <span className="block truncate text-[0.75rem] text-ink-mute">
                        {[e.weddingDate && `Wedding ${day(e.weddingDate)}`, `sent ${ago(e.sentAt)}`].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    {e.repliedAt ? <Badge tone="good">Replied</Badge> : <Badge tone={waiting > 48 ? "bad" : "neutral"}>Waiting {Math.round(waiting)}h</Badge>}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </>
      )}
    </>
  );
}
