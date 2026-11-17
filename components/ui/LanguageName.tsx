import clsx from "clsx";
import { languages } from "@/data/taxonomy";
import type { Language } from "@/data/types";
import { BoskaMarks } from "./BoskaMarks";

/**
 * A language in its own script, then its English name, so a couple who can't read the script still knows
 * what it says. The pair never breaks across lines. Languages we don't list show as the vendor wrote them;
 * one whose native name is its English name (Filipino) shows once. `serif` when the native name is set in
 * Boska, so Vietnamese keeps its tone marks in that face (see `BoskaMarks`).
 */
export function LanguageName({ name, className, english, serif }: { name: string; className?: string; english?: string; serif?: boolean }) {
  const known = name in languages ? languages[name as Language] : undefined;
  if (!known) return <span className={className}>{name}</span>;
  return (
    <span className={clsx("whitespace-nowrap", className)}>
      <span lang={known.lang}>{serif ? <NativeName name={name as Language} /> : known.native}</span>
      {known.native !== name && <span className={clsx("ml-[0.4em]", english)}>{name}</span>}
    </span>
  );
}

/** A language's own name for a serif setting: Vietnamese with its tone marks drawn from Boska's accents. */
export function NativeName({ name }: { name: Language }) {
  const { native, lang } = languages[name];
  return lang === "vi" ? <BoskaMarks text={native} /> : native;
}
