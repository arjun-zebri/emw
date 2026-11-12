"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { readTrail } from "@/components/site/Trail";
import { Button } from "@/components/ui/Button";
import { Portal } from "@/components/ui/Portal";
import { sendEnquiry } from "@/lib/enquiries-actions";
import { lockScroll } from "@/lib/lenis";
import { DateField, fieldLine, VenueField } from "./EnquiryFields";

const label = "t-small mb-1 block text-ink";
const optional = <span className="text-ink-mute"> (optional)</span>;

/**
 * Enquire button and its slide-over form. Once the button has scrolled away, a slim bar keeps it
 * to hand at the foot of the screen. Sending saves the enquiry and emails it to the vendor
 * (lib/enquiries-actions.ts).
 */
export function Enquire({ vendorName, greeting, slug, className }: { vendorName: string; /** The vendor's first name, or the business name. */ greeting: string; slug: string; className?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState({ text: "", region: undefined as string | undefined });
  const [docked, setDocked] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const openedAt = useRef(0);

  // Dock the bar once the in-page button has gone off the top, and stand it down over the footer.
  useEffect(() => {
    const el = trigger.current;
    const footer = document.querySelector("footer");
    if (!el) return;
    let past = false;
    let atFooter = false;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === el) past = !e.isIntersecting && e.boundingClientRect.top < 0;
        else atFooter = e.isIntersecting;
      }
      setDocked(past && !atFooter);
    });
    io.observe(el);
    if (footer) io.observe(footer);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    lockScroll(open);
    if (!open) return;
    openedAt.current = Date.now();
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button ref={trigger} onClick={() => setOpen(true)} className={className}>
        Enquire
      </Button>

      <AnimatePresence>
        {docked && !open && (
          <motion.div
            className="fixed inset-x-0 bottom-0 z-40 border-t hairline bg-paper/90 backdrop-blur-xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="shell flex h-16 items-center justify-between gap-6">
              <p className="t-title truncate">{vendorName}</p>
              <Button onClick={() => setOpen(true)} className="h-10 shrink-0 px-6">
                Enquire
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Portal>
        <AnimatePresence>
          {open && (
            <div className="fixed inset-0 z-[70]">
              <motion.div
                className="absolute inset-0 bg-night/30"
                onClick={() => setOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              />
              <motion.div
                ref={panel}
                role="dialog"
                aria-modal="true"
                aria-label={`Enquire with ${vendorName}`}
                tabIndex={-1}
                data-lenis-prevent
                className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto bg-paper outline-none"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
              >
                <div className="flex h-[var(--header-h)] shrink-0 items-center justify-end px-6 sm:px-8">
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-2 text-ink-mute hover:text-ink">
                    <Icon name="close" className="size-5" />
                  </button>
                </div>

                {!sent ? (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (sending) return;
                      if (!date) {
                        setError("Add your wedding date as DD/MM/YYYY.");
                        return;
                      }
                      const f = new FormData(e.currentTarget);
                      const field = (k: string) => (f.get(k) as string | null) ?? undefined;
                      setSending(true);
                      setError(undefined);
                      const r = await sendEnquiry({
                        slug,
                        name: field("name") ?? "",
                        email: field("email") ?? "",
                        weddingDate: date,
                        region: venue.region,
                        venue: venue.text,
                        traditions: field("traditions"),
                        languages: field("languages"),
                        guests: field("guests"),
                        message: field("message"),
                        website: field("website"),
                        filledMs: openedAt.current ? Date.now() - openedAt.current : undefined,
                        trail: readTrail() ?? undefined,
                      }).catch(() => ({ status: "error" as const, message: "That didn't send. Please check your email address and try again." }));
                      setSending(false);
                      if (r.status === "ok") setSent(true);
                      else setError(r.message);
                    }}
                    className="flex flex-1 flex-col px-6 pb-8 sm:px-8"
                  >
                    <h2 className="t-heading mb-8 text-balance">Say hello to {greeting}</h2>
                    <div className="space-y-6">
                      <div>
                        <label htmlFor={`${id}-names`} className={label}>
                          Your names
                        </label>
                        <input id={`${id}-names`} name="name" required maxLength={200} autoComplete="name" className={fieldLine} />
                      </div>
                      <div>
                        <label htmlFor={`${id}-email`} className={label}>
                          Email
                        </label>
                        <input id={`${id}-email`} name="email" type="email" required maxLength={320} autoComplete="email" className={fieldLine} />
                      </div>
                      <DateField id={`${id}-date`} label="Date" value={date} onChange={setDate} />
                      <VenueField id={`${id}-venue`} label="Venue / Location" value={venue.text} onChange={(text, region) => setVenue({ text, region })} />
                      <div>
                        <label htmlFor={`${id}-traditions`} className={label}>
                          Cultures / traditions{optional}
                        </label>
                        <input
                          id={`${id}-traditions`}
                          name="traditions"
                          maxLength={300}
                          placeholder="e.g. tea ceremony, lion dance. Not sure yet? Say that too."
                          className={fieldLine}
                        />
                      </div>
                      <div>
                        <label htmlFor={`${id}-languages`} className={label}>
                          Languages required{optional}
                        </label>
                        <input id={`${id}-languages`} name="languages" maxLength={300} className={fieldLine} />
                      </div>
                      <div>
                        <label htmlFor={`${id}-guests`} className={label}>
                          Guests{optional}
                        </label>
                        <input
                          id={`${id}-guests`}
                          name="guests"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={99999}
                          step={1}
                          placeholder="Approximate number"
                          className={clsx(fieldLine, "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none")}
                        />
                      </div>
                      <div>
                        <label htmlFor={`${id}-message`} className={label}>
                          Message
                        </label>
                        <textarea
                          id={`${id}-message`}
                          name="message"
                          required
                          maxLength={5000}
                          rows={4}
                          placeholder="Tell us about your wedding"
                          className={clsx(fieldLine, "resize-none")}
                        />
                      </div>
                    </div>
                    {/* Hidden from people; bots fill it in, and the server drops what they send. */}
                    <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] size-px opacity-0" />
                    {error && (
                      <p role="alert" className="t-small mt-6 text-bad">
                        {error}
                      </p>
                    )}
                    <Button type="submit" disabled={sending} className="mt-10 w-full">
                      {sending ? "Sending" : "Send enquiry"}
                    </Button>
                  </form>
                ) : (
                  <div role="status" className="flex flex-1 flex-col items-start justify-center px-6 pb-24 sm:px-8">
                    <Icon name="check" className="mb-6 size-8" />
                    <p className="t-heading mb-3">Thank you for enquiring</p>
                    <p className="t-body">{vendorName} will get back to you directly by email.</p>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}
