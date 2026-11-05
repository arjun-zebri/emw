import clsx from "clsx";
import { Icon } from "@/components/icons/Icon";

/*
 * The design system's own layout pieces. They use only the site's tokens and type styles, so the
 * page documenting the system is also built from it.
 */

/** One chapter: a hairline, the title on the left, a single line of context on the right. */
export function Chapter({ id, title, intro, children }: { id: string; title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-[calc(var(--header-h)+1rem)] border-t hairline pt-[clamp(2.5rem,5vw,4rem)] pb-[clamp(4.5rem,9vw,8rem)]">
      <div className="mb-[clamp(2.5rem,5vw,4rem)] grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-8">
        <h2 id={`${id}-title`} className="t-heading md:col-span-5">
          {title}
        </h2>
        {intro && <p className="t-body max-w-[52ch] text-pretty md:col-span-7 md:pt-2">{intro}</p>}
      </div>
      <div className="space-y-[clamp(3.5rem,7vw,6rem)]">{children}</div>
    </section>
  );
}

/** A titled part of a chapter. */
export function Part({ title, note, children, className }: { title: string; note?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-6 flex flex-col gap-1.5 md:flex-row md:items-baseline md:justify-between md:gap-8">
        <h3 className="t-title">{title}</h3>
        {note && <p className="t-small max-w-[56ch] md:text-right">{note}</p>}
      </div>
      {children}
    </div>
  );
}

const grounds = {
  paper: "bg-paper border hairline",
  soft: "bg-paper-soft",
  night: "bg-night text-paper",
  surface: "bg-surface border border-ink/[0.09]",
};

/** A framed area that shows a live example on one of the grounds. */
export function Stage({
  children,
  ground = "soft",
  className,
  caption,
}: {
  children: React.ReactNode;
  ground?: keyof typeof grounds;
  className?: string;
  caption?: React.ReactNode;
}) {
  return (
    <figure className="flex min-w-0 flex-col">
      <div className={clsx("relative min-w-0 flex-1", grounds[ground], className)}>{children}</div>
      {caption && <figcaption className="t-small mt-3">{caption}</figcaption>}
    </figure>
  );
}

/** Label and value pairs under an example. */
export function Spec({ items, className }: { items: [string, React.ReactNode][]; className?: string }) {
  return (
    <dl className={clsx("border-t hairline", className)}>
      {items.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 border-b hairline py-2.5 text-[0.875rem] md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
          <dt className="t-small pt-px">{label}</dt>
          <dd className="min-w-0 text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A do or a don't: the example on top, the verdict and a line of reason under it. */
export function Rule({ ok, children, visual, className }: { ok: boolean; children: React.ReactNode; visual: React.ReactNode; className?: string }) {
  return (
    <figure className={clsx("min-w-0", className)}>
      <div className="relative min-w-0">{visual}</div>
      <figcaption className={clsx("mt-3 flex gap-2.5 border-t pt-3 text-[0.875rem]", ok ? "border-ink" : "border-bad/60")}>
        <Icon name={ok ? "check" : "close"} className={clsx("mt-0.5 size-4", ok ? "text-ink" : "text-bad")} strokeWidth={1.5} />
        <span className="min-w-0">
          <span className="font-medium">{ok ? "Do. " : "Don’t. "}</span>
          <span className="text-ink-soft">{children}</span>
        </span>
      </figcaption>
    </figure>
  );
}

/** Inline token or class name. */
export function Token({ children }: { children: React.ReactNode }) {
  return <code className="bg-ink/[0.05] px-1.5 py-0.5 font-mono text-[0.8125em] text-ink-soft">{children}</code>;
}
