"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { day, plural } from "@/lib/admin/format";
import type { PlacedVendor } from "@/lib/admin/placement";
import { toast } from "@/lib/admin/toast";
import { sendWelcome, welcomeStatus, type WelcomeTarget } from "@/lib/admin/welcome";
import { thumbUrl } from "@/lib/supabase/storage";
import { Drawer } from "../Drawer";
import { Btn } from "../ui";

/**
 * Before the welcome email goes: who it goes to, who it can't (no email on the listing), and who
 * already had one. One button sends to everyone it can.
 */
export function WelcomeSheet({ vendors, onClose, onSent }: { vendors: PlacedVendor[]; onClose: () => void; onSent?: () => void }) {
  const open = vendors.length > 0;
  const [targets, setTargets] = useState<WelcomeTarget[]>();
  const [busy, setBusy] = useState(false);
  // The vendors shown, kept while the sheet slides away so it doesn't empty as it goes.
  const [shown, setShown] = useState(vendors);
  const key = vendors.map((v) => v.id).join();
  if (open && shown.map((v) => v.id).join() !== key) {
    setShown(vendors);
    setTargets(undefined);
  }

  useEffect(() => {
    if (!key) return;
    let live = true;
    welcomeStatus(key.split(",")).then(
      (t) => live && setTargets(t),
      () => live && setTargets([]),
    );
    return () => {
      live = false;
    };
  }, [key]);

  const of = (id: string) => targets?.find((t) => t.id === id);
  const ready = shown.filter((v) => of(v.id) && !of(v.id)?.why);
  const send = async () => {
    if (busy || !ready.length) return;
    setBusy(true);
    const r = await sendWelcome(ready.map((v) => v.id)).catch(() => ({ sent: [] as string[], skipped: ready.map((v) => ({ id: v.id, why: "Something went wrong" })) }));
    setBusy(false);
    const failed = r.skipped.map((s) => shown.find((v) => v.id === s.id)?.name).filter(Boolean);
    toast(
      r.sent.length
        ? `Welcome sent to ${r.sent.length === 1 ? shown.find((v) => v.id === r.sent[0])?.name : plural(r.sent.length, "vendor")}${failed.length ? `. Couldn't send to ${failed.join(", ")}` : ""}`
        : `Couldn't send to ${failed.join(", ")}`,
    );
    if (r.sent.length) {
      onSent?.();
      onClose();
    } else {
      welcomeStatus(shown.map((v) => v.id)).then(setTargets, () => undefined);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Send the welcome email"
      footer={
        <div className="flex items-center justify-between gap-4">
          <p className="text-[0.875rem] text-ink-soft">
            {targets ? (ready.length ? `Goes to ${plural(ready.length, "vendor")}` : "No one to send to") : <Skeleton className="h-4 w-32" />}
          </p>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Btn>
            <Btn variant="primary" icon="send" onClick={() => void send()} disabled={busy || !ready.length}>
              {busy ? "Sending" : "Send"}
            </Btn>
          </div>
        </div>
      }
    >
      <div className="px-6 py-6">
        <p className="text-[0.9375rem] leading-relaxed text-ink-soft">
          Their cover photo, a note from you, and a way into their listing, where they choose a password. The link lasts 14 days. You can see it in{" "}
          <a href="/admin/notifications" className="text-ink underline decoration-ink/20 underline-offset-4 hover:decoration-ink">
            Notifications
          </a>
          .
        </p>
      </div>
      <ul className="border-t hairline">
        {shown.map((v) => {
          const t = of(v.id);
          return (
            <li key={v.id} className="flex items-center gap-4 border-b hairline px-6 py-3">
              {v.cover ? (
                // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage photo, no image optimisation
                <img src={thumbUrl(v.cover.src)} alt="" className="size-12 shrink-0 bg-paper-soft object-cover" style={{ objectPosition: v.cover.focus }} />
              ) : (
                <span className="size-12 shrink-0 bg-paper-soft" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.9375rem] text-ink">{v.name}</p>
                {t ? (
                  <p className={clsx("truncate text-[0.8125rem]", t.why ? "text-bad" : "text-ink-soft")}>
                    {t.why ?? t.email}
                    {!t.why && t.sentAt && <span> · Welcome sent {day(new Date(t.sentAt).toISOString())}</span>}
                  </p>
                ) : (
                  <Skeleton className="mt-1.5 h-3.5 w-48" />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Drawer>
  );
}
