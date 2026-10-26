import { languages } from "@/data/taxonomy";
import type { Language } from "@/data/types";
import { languageCounts, vendors } from "@/lib/vendors";
import { LanguageIndex } from "./LanguageIndex";

export function Languages() {
  // English last, so the other languages lead.
  const counts = languageCounts().sort(([a], [b]) => Number(a === "English") - Number(b === "English"));
  const rows = counts.map(([name, count]) => ({
    name,
    count,
    native: languages[name].native,
    lang: languages[name].lang,
    vendors: vendors
      .filter((v) => v.languages?.includes(name as Language))
      .sort((a, b) => Number(!!b.cover) - Number(!!a.cover))
      .map((v) => ({ name: v.name, slug: v.slug, cover: v.cover, discipline: v.discipline })),
  }));

  return (
    <section className="shell pb-[var(--section)]">
      {/* The rule and spacing match SectionHeading; the title sits in the left column of the spread. */}
      <div className="border-t hairline pt-[var(--section)]">
        <LanguageIndex rows={rows} title="Find vendors by language" />
      </div>
    </section>
  );
}
