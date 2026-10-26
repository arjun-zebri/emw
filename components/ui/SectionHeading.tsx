import clsx from "clsx";
import { ArrowLink } from "./ArrowLink";

/**
 * Section opener: a hairline, then the title in Boska, with an optional link on its baseline.
 * Used for every titled section on the landing page so they share one rhythm.
 */
/** The section title style, for sections that place their title themselves. */
export const sectionTitle = "font-display text-[clamp(2rem,3.3vw,3.4rem)] leading-[1] tracking-[-0.025em] text-balance";

export function SectionHeading({
  children,
  link,
  className,
}: {
  children: React.ReactNode;
  link?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div className={clsx("mb-[clamp(2rem,4vw,3.5rem)] flex items-end justify-between gap-8 border-t hairline pt-[var(--section)]", className)}>
      <h2 data-reveal className={clsx("max-w-[24ch]", sectionTitle)}>
        {children}
      </h2>
      {link && (
        <div data-reveal style={{ "--d": "0.1s" } as React.CSSProperties} className="hidden shrink-0 pb-[0.3em] md:block">
          <ArrowLink href={link.href} transitionTypes={["nav-forward"]}>
            {link.label}
          </ArrowLink>
        </div>
      )}
    </div>
  );
}
