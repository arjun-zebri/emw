"use client";

import clsx from "clsx";
import Link from "next/link";
import { useId } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { signedPct } from "@/lib/admin/format";

/*
 * The admin's building blocks. Same paper, ink and type as the public site, tuned for work:
 * Boska only for page titles and names, Switzer at 14px for everything else, white panels on
 * paper, square corners, hairlines instead of shadows.
 */

// ── Page ────────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  description,
  actions,
  back,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8 md:mb-10">
      {back && (
        <Link href={back.href} className="t-small mb-5 inline-flex items-center gap-1.5 text-ink-mute transition-colors hover:text-ink">
          <Icon name="chevron-left" className="size-3.5" strokeWidth={1.5} />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-[clamp(1.875rem,3vw,2.5rem)] leading-[1.05] tracking-[-0.02em] text-balance">{title}</h1>
          {description && <p className="mt-2 text-[0.875rem] text-ink-mute">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

export function Panel({
  title,
  meta,
  actions,
  children,
  className,
  flush,
  id,
}: {
  title?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** No inner padding, for tables and lists that run edge to edge. */
  flush?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={clsx("min-w-0 border border-ink/[0.09] bg-surface", className)}>
      {(title || actions) && (
        <div className="flex min-h-14 items-center justify-between gap-4 px-5 pt-4 pb-3 sm:px-6">
          <div className="min-w-0">
            {title && <h2 className="text-[0.9375rem] font-medium text-ink">{title}</h2>}
            {meta && <p className="t-small mt-0.5">{meta}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={clsx(!flush && "px-5 pb-5 sm:px-6 sm:pb-6", !flush && !title && !actions && "pt-5 sm:pt-6")}>{children}</div>
    </section>
  );
}

/**
 * A settings section set on the paper rather than in a card: the title and a line of context on
 * the left, the controls on the right, a hairline above.
 */
export function Section({
  title,
  description,
  children,
  actions,
  id,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="grid grid-cols-1 gap-6 border-t hairline py-10 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:gap-16 md:py-12">
      <div>
        <h2 className="font-display text-[1.5rem] leading-[1.1] tracking-[-0.015em]">{title}</h2>
        {description && <p className="mt-2 max-w-[30ch] text-[0.8125rem] leading-relaxed text-ink-mute">{description}</p>}
        {actions && <div className="mt-5">{actions}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** A channel or option as a quiet text toggle: a dot that fills when on. Unavailable options keep their space, empty. */
export function CheckChip({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  if (disabled) return <span className="w-[4.5rem]" aria-hidden />;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx("flex h-8 w-[4.5rem] items-center gap-2 text-[0.8125rem] transition-colors duration-300", checked ? "text-ink" : "text-ink-mute/70 hover:text-ink")}
    >
      <span
        className={clsx("size-2 shrink-0 rounded-full border transition-colors duration-300", checked ? "border-ink bg-ink" : "border-ink/30 bg-transparent")}
        aria-hidden
      />
      {label}
    </button>
  );
}

// ── Figures ─────────────────────────────────────────────────────────────

/** A signed change against the previous period. Colour says whether the move is good, the arrow says which way. */
export function Delta({ value, good = "up", className }: { value: number; good?: "up" | "down"; className?: string }) {
  const flat = Math.abs(value) < 0.005;
  const positive = value > 0 === (good === "up");
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-0.5 text-[0.75rem] font-medium tabular-nums",
        flat ? "text-ink-mute" : positive ? "text-good" : "text-bad",
        className,
      )}
    >
      {!flat && <Icon name={value > 0 ? "arrow-up" : "arrow-down"} className="size-3" strokeWidth={2} />}
      {flat ? "No change" : signedPct(value).replace(/^[+−]/, "")}
    </span>
  );
}

export function Stat({
  label,
  value,
  delta,
  good,
  note,
  children,
  href,
  className,
}: {
  label: string;
  value: React.ReactNode;
  delta?: number;
  good?: "up" | "down";
  note?: React.ReactNode;
  /** A sparkline or meter under the figure. */
  children?: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <p className="text-[0.8125rem] text-ink-mute">{label}</p>
      <p className="mt-2 text-[1.875rem] leading-none font-medium tracking-[-0.025em] text-ink">{value}</p>
      <div className="mt-2.5 flex min-h-4 flex-wrap items-center gap-x-2 gap-y-1">
        {delta !== undefined && <Delta value={delta} good={good} />}
        {note && <span className="t-small text-[0.75rem]">{note}</span>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </>
  );
  const cls = clsx("group block min-w-0 border border-ink/[0.09] bg-surface p-5 sm:p-6", href && "transition-colors hover:border-ink/25", className);
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

// ── Controls ────────────────────────────────────────────────────────────

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";

const btnVariants: Record<BtnVariant, string> = {
  primary: "bg-ink text-paper hover:bg-ink/85",
  secondary: "border border-ink/15 bg-surface text-ink hover:border-ink/40",
  ghost: "text-ink-soft hover:bg-ink/[0.05] hover:text-ink",
  danger: "border border-bad/30 bg-surface text-bad hover:border-bad",
};

export function Btn({
  variant = "secondary",
  size = "md",
  icon,
  href,
  external,
  className,
  children,
  ...props
}: {
  variant?: BtnVariant;
  size?: "sm" | "md";
  icon?: IconName;
  href?: string;
  external?: boolean;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">) {
  const cls = clsx(
    "inline-flex shrink-0 items-center justify-center gap-2 font-medium whitespace-nowrap transition-colors duration-200 select-none disabled:pointer-events-none disabled:opacity-40",
    size === "md" ? "h-9 px-4 text-[0.8125rem]" : "h-7 px-2.5 text-[0.75rem]",
    !children && (size === "md" ? "w-9 px-0" : "w-7 px-0"),
    btnVariants[variant],
    className,
  );
  const content = (
    <>
      {icon && <Icon name={icon} className={size === "md" ? "size-4" : "size-3.5"} strokeWidth={1.5} />}
      {children}
    </>
  );
  if (href) {
    return external ? (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {content}
      </a>
    ) : (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...props}>
      {content}
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex h-9 items-stretch border border-ink/15 bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={clsx(
            "px-3 text-[0.8125rem] transition-colors duration-200",
            value === o.id ? "bg-ink text-paper" : "text-ink-soft hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={clsx("-mb-px flex gap-6 overflow-x-auto border-b hairline", className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={clsx(
            "relative flex h-11 shrink-0 items-center gap-2 text-[0.875rem] transition-colors",
            value === t.id ? "text-ink" : "text-ink-mute hover:text-ink",
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="text-[0.75rem] text-ink-mute tabular-nums">{t.count}</span>}
          <span className={clsx("absolute inset-x-0 bottom-0 h-px bg-ink transition-transform duration-500 ease-out-expo", value === t.id ? "scale-x-100" : "scale-x-0")} />
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative inline-flex h-[18px] w-[32px] shrink-0 items-center transition-colors duration-300 disabled:opacity-30",
        checked ? "bg-ink" : "bg-ink/[0.12] hover:bg-ink/20",
      )}
    >
      <span
        className={clsx(
          "size-3.5 rounded-full bg-surface shadow-[0_1px_2px_rgb(22_20_18/0.2)] transition-transform duration-500 ease-out-expo",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

// ── Forms ───────────────────────────────────────────────────────────────

/** Underlined, like the public site's enquiry form: no boxes. */
export const inputCls =
  "w-full border-0 border-b border-ink/15 bg-transparent px-0 py-2.5 text-[0.9375rem] text-ink placeholder:text-ink-mute/60 transition-colors duration-300 hover:border-ink/35 focus:border-ink focus:outline-none";

export const labelCls = "block text-[0.75rem] text-ink-mute";

export function Field({
  label,
  hint,
  children,
  className,
  htmlFor,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={clsx("min-w-0", className)}>
      <label htmlFor={htmlFor} className={labelCls}>
        {label}
      </label>
      {children}
      {hint && <p className="t-small mt-1.5 text-[0.75rem]">{hint}</p>}
    </div>
  );
}

export function TextField({
  label,
  hint,
  className,
  ...props
}: { label: string; hint?: React.ReactNode; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <input id={id} className={inputCls} {...props} />
    </Field>
  );
}

export function TextArea({
  label,
  hint,
  className,
  ...props
}: { label: string; hint?: React.ReactNode; className?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <textarea id={id} className={clsx(inputCls, "resize-none leading-relaxed")} {...props} />
    </Field>
  );
}

export function Select({
  label,
  options,
  className,
  ...props
}: { label: string; options: { value: string; label: string }[]; className?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} className={className}>
      <div className="relative">
        <select id={id} className={clsx(inputCls, "cursor-pointer appearance-none pr-7")} {...props}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" className="pointer-events-none absolute top-1/2 right-0 size-4 -translate-y-1/2 text-ink-mute" strokeWidth={1.25} />
      </div>
    </Field>
  );
}

/** Multi-select as a row of toggles: the same chips as the public directory's filters. */
export function Chips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; lang?: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  label: string;
}) {
  return (
    <fieldset>
      <legend className={clsx(labelCls, "mb-2.5")}>{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              lang={o.lang}
              onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
              className={clsx(
                "border px-2.5 py-1.5 text-[0.8125rem] transition-colors duration-200",
                on ? "border-ink bg-ink text-paper" : "border-ink/15 bg-surface text-ink-soft hover:border-ink/40 hover:text-ink",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// ── Small things ────────────────────────────────────────────────────────

export type Tone = "neutral" | "good" | "warn" | "bad" | "ink";

const tones: Record<Tone, string> = {
  neutral: "bg-ink/[0.05] text-ink-soft",
  good: "bg-good/10 text-good",
  warn: "bg-warn/10 text-warn",
  bad: "bg-bad/10 text-bad",
  ink: "bg-ink text-paper",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex h-[1.375rem] shrink-0 items-center gap-1.5 px-2 text-[0.75rem] font-medium whitespace-nowrap", tones[tone], className)}>
      {tone !== "neutral" && tone !== "ink" && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

const avatarShades = ["#e6e0d6", "#ddd6c8", "#e9e3da", "#d8d1c4", "#e3dccf"];

export function Avatar({ name, src, size = 32, className }: { name: string; src?: string; size?: number; className?: string }) {
  const initials = name
    .replace(/&/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const shade = avatarShades[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % avatarShades.length];
  return (
    <span
      className={clsx("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full text-ink-soft", className)}
      style={{ width: size, height: size, background: shade, fontSize: size * 0.36 }}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- small thumbnails, some are data URLs from uploads
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <span className="font-medium tracking-[0.02em]">{initials}</span>
      )}
    </span>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex h-5 min-w-5 items-center justify-center border border-ink/15 px-1 font-sans text-[0.6875rem] text-ink-mute">{children}</kbd>;
}

export function Empty({ title, children, action, className }: { title: string; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <p className="font-display text-[1.375rem] tracking-[-0.01em]">{title}</p>
      {children && <p className="t-small mt-2 max-w-[42ch]">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Table styles, shared so every list in the admin lines up the same way. */
export const table = {
  wrap: "relative overflow-x-auto",
  table: "w-full min-w-[640px] border-collapse text-left text-[0.875rem]",
  th: "h-10 border-b hairline px-3 text-[0.75rem] font-normal whitespace-nowrap text-ink-mute first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6",
  td: "border-b border-ink/[0.06] px-3 py-3 align-middle first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6",
  num: "text-right tabular-nums",
  row: "transition-colors hover:bg-paper/70",
};
