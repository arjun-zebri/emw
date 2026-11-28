"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { day, plural } from "@/lib/admin/format";
import type { PlacedVendor } from "@/lib/admin/placement";
import { toast } from "@/lib/admin/toast";
import { sendWelcome, welcomePreview, welcomeStatus, type WelcomePreview, type WelcomeTarget } from "@/lib/admin/welcome";
import { thumbUrl } from "@/lib/supabase/storage";
import { Drawer } from "../Drawer";
import { EmailFrame, EmailHeader } from "../shared/EmailFrame";
import { Btn } from "../ui";

/**
 * Before the welcome email goes: the email itself, exactly as the selected vendor will get it, who
 * it goes to, who it can't (no email on the listing), and who already had one. With several
 * vendors, the list sits on the left like a mail client and picking one shows theirs. One button
 * sends to everyone it can.
 */
export function WelcomeSheet({ vendors, onClose, onSent }: { vendors: PlacedVendor[]; onClose: () => void; onSent?: () => void }) {
  const open = vendors.length > 0;
  const [targets, setTargets] = useState<WelcomeTarget[]>();
  const [busy, setBusy] = useState(false);
  // The vendors shown, kept while the sheet slides away so it doesn't empty as it goes.
  const [shown, setShown] = useState(vendors);
  const key = vendors.map((v) => v.id).join();
  const [viewing, setViewing] = useState<string>();
  const [previews, setPreviews] = useState<Record<string, WelcomePreview | null>>({});
  if (open && shown.map((v) => v.id).join() !== key) {
    setShown(vendors);
    setTargets(undefined);
    setViewing(vendors[0]?.id);
  }
  const current = viewing ?? shown[0]?.id;
  const preview = current ? previews[current] : undefined;

  // Each vendor's email, rendered on the server the first time it's looked at.
  useEffect(() => {
    if (!current || current in previews) return;
    let live = true;
    welcomePreview(current).then(
      (p) => live && setPreviews((all) => ({ ...all, [current]: p })),
      () => live && setPreviews((all) => ({ ...all, [current]: null })),
    );
    return () => {
      live = false;
    };
  }, [current, previews]);

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

  const many = shown.length > 1;

  return (
    <Drawer
      open={open}
      width={many ? "max-w-[72rem]" : "max-w-[46rem]"}
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
      <div className={clsx("grid grid-cols-1", many && "lg:h-full lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]")}>
        <div className={clsx(many && "lg:overflow-y-auto lg:border-r lg:hairline")}>
          <p className="px-6 py-5 text-[0.875rem] leading-relaxed text-ink-soft">
            Their link lasts 14 days and lets them choose a password on the way into their listing.{many ? " Choose a vendor to see theirs." : ""}
          </p>
          <ul className="border-t hairline">
            {shown.map((v) => {
              const t = of(v.id);
              const active = many && v.id === current;
              const Row = many ? "button" : "div";
              return (
                <li key={v.id} className="border-b hairline">
                  <Row
                    {...(many ? { type: "button" as const, onClick: () => setViewing(v.id), "aria-current": active } : {})}
                    className={clsx("relative flex w-full items-center gap-4 px-6 py-3 text-left transition-colors duration-300", many && (active ? "bg-surface" : "hover:bg-surface/60"))}
                  >
                    {many && <span className={clsx("absolute inset-y-0 left-0 w-0.5 bg-ink transition-transform duration-500 ease-out-expo", active ? "scale-y-100" : "scale-y-0")} />}
                    {v.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage photo, no image optimisation
                      <img src={thumbUrl(v.cover.src)} alt="" className="size-12 shrink-0 bg-paper-soft object-cover" style={{ objectPosition: v.cover.focus }} />
                    ) : (
                      <span className="size-12 shrink-0 bg-paper-soft" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] text-ink">{v.name}</span>
                      {t ? (
                        <span className={clsx("block truncate text-[0.8125rem]", t.why ? "text-bad" : "text-ink-soft")}>
                          {t.why ?? t.email}
                          {!t.why && t.sentAt && <span> · Welcome sent {day(new Date(t.sentAt).toISOString())}</span>}
                        </span>
                      ) : (
                        <Skeleton className="mt-1.5 h-3.5 w-48" />
                      )}
                    </span>
                  </Row>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="min-w-0 bg-paper-soft px-3 py-6 sm:px-8 sm:py-8 lg:overflow-y-auto">
          <div className="mx-auto max-w-[600px]">
            {preview ? (
              <>
                <EmailHeader from={preview.from} to={preview.to} subject={preview.subject} />
                <EmailFrame key={preview.id} html={preview.html} title={preview.subject} />
              </>
            ) : preview === null ? (
              <p className="px-1 text-[0.9375rem] text-ink-soft">Couldn&apos;t show this email. Close the sheet and try again.</p>
            ) : (
              <EmailSkeleton />
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}

/** The email while it renders: the header lines, the cover photo and the first lines of words. */
function EmailSkeleton() {
  return (
    <div aria-hidden>
      <div className="mb-5 space-y-2 px-1">
        <Skeleton className="h-3.5 w-64" />
        <Skeleton className="h-3.5 w-52" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>
      <div className="bg-paper">
        <Skeleton className="aspect-[3/2] w-full" />
        <div className="space-y-3 px-[8%] pt-10 pb-12">
          <Skeleton className="h-12 w-3/5" />
          <Skeleton className="mt-6 h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-8 h-[4.75rem] w-full" />
        </div>
      </div>
    </div>
  );
}
