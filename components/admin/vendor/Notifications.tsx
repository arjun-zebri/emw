"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { alertDefs, type AlertDef, type Channel } from "@/lib/admin/alerts";
import { useVendorSlug } from "@/lib/admin/session";
import { update, useAdmin } from "@/lib/admin/store";
import { toast } from "@/lib/admin/toast";
import { getVendor } from "@/lib/vendors";
import { Drawer } from "../Drawer";
import { AlertMatrix, type MatrixGroup } from "../shared/AlertMatrix";
import { EmailPreview } from "../shared/EmailPreview";
import { PageHeader } from "../ui";

const byId = (ids: string[]) => ids.map((id) => alertDefs.find((a) => a.id === id)!);

const groups: MatrixGroup[] = [
  { title: "Enquiries", alerts: byId(["vendor-enquiry", "vendor-reply-reminder"]) },
  { title: "Your listing", alerts: byId(["vendor-review", "vendor-renewal"]) },
];

export function VendorNotifications() {
  const slug = useVendorSlug();
  const state = useAdmin();
  const vendor = getVendor(slug);
  const [preview, setPreview] = useState<AlertDef | null>(null);
  const email = vendor?.contact?.email ?? "your email";
  const phone = vendor?.contact?.phone;

  const key = (a: AlertDef) => `${slug}:${a.id}`;
  const isOn = (a: AlertDef, c: Channel) => (state.alerts[key(a)] ?? a.defaults).includes(c);
  const set = (a: AlertDef, c: Channel, on: boolean) => {
    update((s) => {
      const current = s.alerts[key(a)] ?? a.defaults;
      return { alerts: { ...s.alerts, [key(a)]: on ? [...current, c] : current.filter((x) => x !== c) } };
    });
    if (c === "sms" && on) toast(`Texts will go to ${phone}`);
  };

  return (
    <>
      <PageHeader title="Notifications" description="Replies to enquiries always go straight to the couple, whatever you choose here." />

      <div className="space-y-6">
        <section className="border border-ink/[0.09] bg-surface">
          <div className="px-6 pt-5 pb-4">
            <h2 className="text-[1.0625rem] font-medium">Where we reach you</h2>
            <p className="mt-0.5 text-[0.875rem] text-ink-mute">Change these on your listing</p>
          </div>
          <div className="grid grid-cols-1 border-t border-ink/[0.06] md:grid-cols-2">
            <div className="flex items-center gap-4 px-6 py-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-paper-soft text-ink-soft">
                <Icon name="mail" className="size-[1.125rem]" strokeWidth={1.25} />
              </span>
              <div className="min-w-0">
                <p className="text-[0.9375rem]">Email</p>
                <p className="mt-0.5 truncate text-[0.8125rem] text-ink-mute">{email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 border-t border-ink/[0.06] px-6 py-5 md:border-t-0 md:border-l">
              <span className={clsx("flex size-10 shrink-0 items-center justify-center rounded-full bg-paper-soft text-ink-soft", !phone && "opacity-40")}>
                <Icon name="phone" className="size-[1.125rem]" strokeWidth={1.25} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.9375rem]">Text message</p>
                <p className="mt-0.5 truncate text-[0.8125rem] text-ink-mute">{phone ?? "No mobile number yet"}</p>
              </div>
              {!phone && (
                <Link href="/account/listing" className="link-line shrink-0 text-[0.8125rem] text-ink-soft hover:text-ink">
                  Add a number
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className="border border-ink/[0.09] bg-surface pt-5">
          <AlertMatrix groups={groups} channels={["email", "sms"]} isOn={isOn} set={set} channelOff={(c) => c === "sms" && !phone} onPreview={setPreview} />
        </section>
      </div>

      <Drawer open={!!preview} onClose={() => setPreview(null)} title={preview?.title ?? ""} width="max-w-2xl">
        {preview && <EmailPreview id={preview.id} vendorSlug={slug} />}
      </Drawer>
    </>
  );
}
