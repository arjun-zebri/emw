import clsx from "clsx";

/*
 * The design system's own layout pieces. They use only the site's tokens and type styles, so the
 * page documenting the system is also built from it.
 */

/** One building block: a hairline, its name, then the live example. */
export function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-[calc(var(--header-h)+1rem)] border-t hairline pt-6 pb-[clamp(3.5rem,7vw,5.5rem)]">
      <h2 id={`${id}-title`} className="t-heading mb-[clamp(1.5rem,3vw,2.5rem)]">
        {title}
      </h2>
      <div className="space-y-[clamp(2rem,4vw,3rem)]">{children}</div>
    </section>
  );
}

const grounds = {
  paper: "bg-paper border hairline",
  soft: "bg-paper-soft",
  night: "bg-night text-paper",
};

/** A framed area that shows a live example on one of the grounds, with a short label under it. */
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

/** A class or token name. */
export function Token({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-[0.75rem] text-ink-mute">{children}</code>;
}
