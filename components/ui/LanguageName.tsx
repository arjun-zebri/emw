import clsx from "clsx";
import { languages } from "@/data/taxonomy";
import type { Language } from "@/data/types";

/**
 * A language in its own script, then its English name, so a couple who can't read the script still knows
 * what it says. The pair never breaks across lines. Languages we don't list show as the vendor wrote them;
 * one whose native name is its English name (Filipino) shows once.
 */
export function LanguageName({ name, className, english }: { name: string; className?: string; english?: string }) {
  const known = name in languages ? languages[name as Language] : undefined;
  if (!known) return <span className={className}>{name}</span>;
  return (
    <span className={clsx("whitespace-nowrap", className)}>
      <span lang={known.lang}>{known.native}</span>
      {known.native !== name && <span className={clsx("ml-[0.4em]", english)}>{name}</span>}
    </span>
  );
}
