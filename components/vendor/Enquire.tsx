"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { Portal } from "@/components/ui/Portal";
import { lockScroll } from "@/lib/lenis";

const guestOptions = ["Under 80", "80–200", "200–400", "400+"];
const input =
  "w-full border-b hairline bg-transparent py-3 text-ink placeholder:text-ink-mute/70 focus:border-ink focus:outline-none transition-colors";
const naClass = (on: boolean) =>
  clsx("t-small shrink-0 border px-2.5 py-1 transition-colors", on ? "border-ink bg-ink text-paper" : "hairline text-ink-soft hover:border-ink hover:text-ink");

/** A text field that can be answered "Not applicable" instead, e.g. a date for an engagement shoot. */
function OrNotApplicable({ id, label, na, onNa, ...props }: { id: string; label: string; na: boolean; onNa: (na: boolean) => void } & React.ComponentProps<"input">) {
  return (
    <div className="flex items-center gap-3 border-b hairline transition-colors focus-within:border-ink">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        placeholder={na ? `${label}: not applicable` : label}
        disabled={na}
        className="min-w-0 flex-1 bg-transparent py-3 text-ink placeholder:text-ink-mute/70 focus:outline-none disabled:placeholder:text-ink-mute"
        {...props}
      />
      <button type="button" aria-pressed={na} aria-label={`${label}: not applicable`} onClick={() => onNa(!na)} className={naClass(na)}>
        Not applicable
      </button>
    </div>
  );
}

/**
 * Enquire button and its slide-over form. Once the button has scrolled away, a slim bar keeps it
 * to hand at the foot of the screen. The demo stops at a confirmation.
 */
export function Enquire({ vendorName, className }: { vendorName: string; className?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [guests, setGuests] = useState<string | null>(null);
  const [na, setNa] = useState({ date: false, venue: false });
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
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSent(true);
                    }}
                    className="flex flex-1 flex-col px-6 pb-8 sm:px-8"
                  >
                    <h2 className="t-heading mb-8">{vendorName}</h2>
                    <div className="space-y-2">
                      <label htmlFor={`${id}-names`} className="sr-only">Your names</label>
                      <input id={`${id}-names`} required placeholder="Your names" autoComplete="name" className={input} />
                      <label htmlFor={`${id}-email`} className="sr-only">Email</label>
                      <input id={`${id}-email`} type="email" required placeholder="Email" autoComplete="email" className={input} />
                      <OrNotApplicable id={`${id}-date`} label="Wedding date" na={na.date} onNa={(date) => setNa((n) => ({ ...n, date }))} />
                      <OrNotApplicable id={`${id}-venue`} label="Location or venue" na={na.venue} onNa={(venue) => setNa((n) => ({ ...n, venue }))} />
                      <label htmlFor={`${id}-traditions`} className="sr-only">Cultures and traditions</label>
                      <input id={`${id}-traditions`} placeholder="Cultures and traditions" className={input} />
                    </div>
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
                          className={naClass(guests === "Not applicable")}
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
                    <textarea id={`${id}-message`} rows={4} placeholder="Message" className={clsx(input, "mt-6 resize-none")} />
                    <Button type="submit" className="mt-auto w-full">
                      Send enquiry
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
