"use client";

import clsx from "clsx";
import type { Language } from "@/data/types";
import { LanguageName } from "@/components/ui/LanguageName";

/** The question at the top of a step, and one plain line under it. */
export function StepHead({ title, children, id }: { title: string; children?: React.ReactNode; id?: string }) {
  return (
    <div className="mb-[clamp(2rem,5vh,3rem)]">
      <h1 id={id} tabIndex={-1} className="font-display text-[clamp(2rem,3.6vw,3.25rem)] leading-[1.02] tracking-[-0.025em] text-balance outline-none">
        {title}
      </h1>
      {children && <p className="t-body mt-4 max-w-[52ch]">{children}</p>}
    </div>
  );
}

/** A large choice: white on paper, ink edge when chosen. */
export function Tile({ on, onClick, className, children, ...rest }: { on: boolean; onClick: () => void; className?: string; children: React.ReactNode } & React.AriaAttributes) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={clsx(
        "relative flex flex-col items-start border bg-surface p-4 text-left transition-[border-color,box-shadow,transform] duration-300 ease-out-expo active:scale-[0.98] sm:p-5",
        on ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : "hairline hover:border-ink/40",
        className,
      )}
      {...rest}
    >
      {children}
      <Check on={on} className={clsx("absolute top-3 right-3 transition-opacity duration-300", on ? "opacity-100" : "opacity-0")} />
    </button>
  );
}

/** A square tick box. The tick is drawn on its own 20px grid so it sits dead centre. */
export function Check({ on, className }: { on: boolean; className?: string }) {
  return (
    <span aria-hidden className={clsx("grid size-5 shrink-0 place-items-center border transition-colors duration-200", on ? "border-ink bg-ink text-paper" : "border-ink/35 bg-surface", className)}>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={clsx("size-3.5 transition-opacity", on ? "opacity-100" : "opacity-0")}>
        <path d="M5 10.4 8.4 13.6 15 6.6" />
      </svg>
    </span>
  );
}

/** A small choice in a wrapping row. */
export function Chip({ on, onClick, children, lang }: { on: boolean; onClick: () => void; children: React.ReactNode; lang?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      lang={lang}
      onClick={onClick}
      className={clsx(
        "inline-flex h-11 items-center gap-2 border px-4 text-[0.9375rem] transition-colors duration-300",
        on ? "border-ink bg-ink text-paper" : "hairline bg-surface text-ink hover:border-ink/40",
      )}
    >
      {children}
    </button>
  );
}

export const inputClass =
  "w-full border-b hairline bg-transparent py-3 text-[1.0625rem] text-ink placeholder:text-ink-mute/60 transition-colors focus:border-ink focus:outline-none";

/** A labelled field: label above, underlined input, a note or count beneath. */
export function Field({ label, note, htmlFor, children }: { label: string; note?: React.ReactNode; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="t-small block text-ink">
        {label}
      </label>
      {children}
      {note && <p className="t-small mt-2">{note}</p>}
    </div>
  );
}

/** Their card as it will sit in the directory: cover, name, one line, their languages in their own scripts. */
export function CardPreview({ cover, name, line, languages, className }: { cover?: string; name: string; line: string; languages: Language[]; className?: string }) {
  const tongues = languages.filter((l) => l !== "English");
  return (
    <div className={clsx("flex flex-col", className)}>
      <div className="relative aspect-[4/5] overflow-hidden bg-[#d3d2cf]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local blob of their own photo
          <img src={cover} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="absolute inset-0 grid place-items-center p-6 text-center text-[0.75rem] text-ink/45">Your cover photo</span>
        )}
      </div>
      <p className={clsx("t-title mt-4", !name && "text-ink-mute/40")}>{name || "Your business name"}</p>
      <p className="t-small mt-1.5 flex flex-wrap gap-x-3.5">
        <span className={clsx(!line && "text-ink-mute/50")}>{line || "What you do"}</span>
        {tongues.map((l) => (
          <LanguageName key={l} name={l} className="text-ink-mute/75" />
        ))}
      </p>
    </div>
  );
}
