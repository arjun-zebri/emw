"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { Portal } from "@/components/ui/Portal";
import { readTrail } from "@/components/site/Trail";
import { areaOptions, cultureNames } from "@/data/taxonomy";
import { today } from "@/lib/admin/time";
import { sendEnquiry } from "@/lib/enquiries-actions";
import { GUESTS, NOT_APPLICABLE, NOT_DECIDED, weddingLabel, weddingMonths } from "@/lib/enquiry-fields";
import { lockScroll } from "@/lib/lenis";

// GUESTS in lib/enquiry-fields.ts, less "Not applicable", which has its own switch.
const guestOptions = GUESTS.filter((g) => g !== NOT_APPLICABLE);
const input =
  "w-full border-b hairline bg-transparent py-3 text-ink placeholder:text-ink-mute/70 focus:border-ink focus:outline-none transition-colors";
const chip = (on: boolean) =>
  clsx("t-small border px-2.5 py-1 transition-colors", on ? "border-ink bg-ink text-paper" : "hairline text-ink-soft hover:border-ink hover:text-ink");

/** A native select drawn as one of the form's underlined lines: the placeholder in grey until something is chosen. */
function Choice({ id, label, value, onChange, children }: { id: string; label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative border-b hairline transition-colors focus-within:border-ink">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx("w-full cursor-pointer appearance-none bg-transparent py-3 pr-8 focus:outline-none", value ? "text-ink" : "text-ink-mute/70")}
      >
        <option value="">{label}</option>
        {children}
      </select>
      <Icon name="chevron-down" className="pointer-events-none absolute top-1/2 right-0 size-4 -translate-y-1/2 text-ink-mute" strokeWidth={1.4} />
    </div>
  );
}

/** The wedding month, three years ahead by year, or not decided, or not applicable (an engagement shoot). */
function WeddingMonth({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const months = weddingMonths(today().slice(0, 7));
  const years = [...new Set(months.map((m) => m.slice(0, 4)))];
  return (
    <Choice id={id} label="Wedding date" value={value} onChange={onChange}>
      {years.map((y) => (
        <optgroup key={y} label={y}>
          {months
            .filter((m) => m.startsWith(y))
            .map((m) => (
              <option key={m} value={m}>
                {weddingLabel(m)}
              </option>
            ))}
        </optgroup>
      ))}
      <optgroup label="Or">
        <option value={NOT_DECIDED}>Not decided yet</option>
        <option value={NOT_APPLICABLE}>Not applicable</option>
      </optgroup>
    </Choice>
  );
}

/**
 * Enquire button and its slide-over form. Once the button has scrolled away, a slim bar keeps it
 * to hand at the foot of the screen. Sending saves the enquiry and emails it to the vendor
 * (lib/enquiries-actions.ts).
 */
export function Enquire({ vendorName, slug, className }: { vendorName: string; slug: string; className?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [guests, setGuests] = useState<string | null>(null);
  const [month, setMonth] = useState("");
  const [region, setRegion] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [other, setOther] = useState(false);
  const [docked, setDocked] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

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
                      const f = new FormData(e.currentTarget);
                      const field = (k: string) => (f.get(k) as string | null) ?? undefined;
                      setSending(true);
                      setError(undefined);
                      const r = await sendEnquiry({
                        slug,
                        name: field("name") ?? "",
                        email: field("email") ?? "",
                        weddingDate: month || undefined,
                        region: region || undefined,
                        venue: field("venue"),
                        cultures: picked,
                        traditions: other ? field("traditions") : undefined,
                        guests: guests ?? undefined,
                        message: field("message"),
                        website: field("website"),
                        trail: readTrail() ?? undefined,
                      }).catch(() => ({ status: "error" as const, message: "That didn't send. Check your connection and try again." }));
                      setSending(false);
                      if (r.status === "ok") setSent(true);
                      else setError(r.message);
                    }}
                    className="flex flex-1 flex-col px-6 pb-8 sm:px-8"
                  >
                    <h2 className="t-heading mb-8">{vendorName}</h2>
                    <div className="space-y-2">
                      <label htmlFor={`${id}-names`} className="sr-only">Your names</label>
                      <input id={`${id}-names`} name="name" required maxLength={200} placeholder="Your names" autoComplete="name" className={input} />
                      <label htmlFor={`${id}-email`} className="sr-only">Email</label>
                      <input id={`${id}-email`} name="email" type="email" required maxLength={320} placeholder="Email" autoComplete="email" className={input} />
                      <WeddingMonth id={`${id}-date`} value={month} onChange={setMonth} />
                      <Choice id={`${id}-region`} label="Where" value={region} onChange={setRegion}>
                        {(["Australia", "Overseas"] as const).map((g) => (
                          <optgroup key={g} label={g}>
                            {areaOptions()
                              .filter((o) => o.group === g)
                              .map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                          </optgroup>
                        ))}
                        <optgroup label="Or">
                          <option value={NOT_DECIDED}>Not decided yet</option>
                        </optgroup>
                      </Choice>
                      <label htmlFor={`${id}-venue`} className="sr-only">Venue</label>
                      <input id={`${id}-venue`} name="venue" maxLength={300} placeholder="Venue, if you know it" className={input} />
                    </div>
                    <fieldset className="mt-8">
                      <legend className="t-small mb-3">
                        Cultures <span className="text-ink-mute">(optional)</span>
                      </legend>
                      <div className="flex flex-wrap gap-1.5">
                        {cultureNames.map((c) => (
                          <button
                            key={c}
                            type="button"
                            aria-pressed={picked.includes(c)}
                            onClick={() => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))}
                            className={chip(picked.includes(c))}
                          >
                            {c}
                          </button>
                        ))}
                        <button type="button" aria-pressed={other} onClick={() => setOther(!other)} className={chip(other)}>
                          Other
                        </button>
                      </div>
                      {other && (
                        <>
                          <label htmlFor={`${id}-traditions`} className="sr-only">Other cultures and traditions</label>
                          <input id={`${id}-traditions`} name="traditions" maxLength={300} autoFocus placeholder="In your words" className={clsx(input, "mt-2")} />
                        </>
                      )}
                    </fieldset>
                    <fieldset className="mt-8">
                      <legend className="mb-3 flex w-full items-center justify-between gap-3">
                        <span className="t-small">
                          Guests <span className="text-ink-mute">(optional)</span>
                        </span>
                        <button
                          type="button"
                          aria-pressed={guests === "Not applicable"}
                          aria-label="Guests: not applicable"
                          onClick={() => setGuests(guests === "Not applicable" ? null : "Not applicable")}
                          className={chip(guests === "Not applicable")}
                        >
                          Not applicable
                        </button>
                      </legend>
                      <div className="grid grid-cols-4 gap-1.5">
                        {guestOptions.map((g) => (
                          <button
                            key={g}
                            type="button"
                            aria-pressed={guests === g}
                            onClick={() => setGuests(guests === g ? null : g)}
                            className={clsx(
                              "t-small border py-2 transition-colors",
                              guests === g ? "border-ink bg-ink text-paper" : "hairline text-ink-soft hover:border-ink",
                            )}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <label htmlFor={`${id}-message`} className="sr-only">Message</label>
                    <textarea id={`${id}-message`} name="message" maxLength={5000} rows={4} placeholder="Message" className={clsx(input, "mt-6 resize-none")} />
                    {/* Hidden from people; bots fill it in, and the server drops what they send. */}
                    <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] size-px opacity-0" />
                    {error && (
                      <p role="alert" className="t-small mt-6 text-bad">
                        {error}
                      </p>
                    )}
                    <Button type="submit" disabled={sending} className="mt-auto w-full">
                      {sending ? "Sending" : "Send enquiry"}
                    </Button>
                  </form>
                ) : (
                  <div role="status" className="flex flex-1 flex-col items-start justify-center px-6 pb-24 sm:px-8">
                    <Icon name="check" className="mb-6 size-8" />
                    <p className="t-heading mb-3">Enquiry sent</p>
                    <p className="t-body">{vendorName} will reply by email.</p>
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
