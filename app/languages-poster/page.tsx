import type { Metadata } from "next";
import { languages } from "@/data/taxonomy";
import type { Language } from "@/data/types";
import { languageCounts, vendors } from "@/lib/vendors";
import type { LangRow } from "../languages-options/types";
import { FramedStage, InlinePhotos, PosterList, PosterRow, WindowBehind } from "./Variants";

/*
 * TEMPORARY: five variations on the typographic poster for the languages section, for review.
 * Delete before deploying (with /languages-options, whose types it shares).
 */
export const metadata: Metadata = { title: "Language poster options", robots: { index: false } };

const heading = "Find vendors by language";

function rows(): LangRow[] {
  // English last, so the other languages lead.
  return languageCounts()
    .sort(([a], [b]) => Number(a === "English") - Number(b === "English"))
    .map(([name, count]) => ({
      name,
      count,
      native: languages[name].native,
      lang: languages[name].lang,
      vendors: vendors
        .filter((v) => v.languages?.includes(name as Language))
        .sort((a, b) => Number(!!b.cover) - Number(!!a.cover))
        .map((v) => ({ name: v.name, slug: v.slug, cover: v.cover, discipline: v.discipline })),
    }));
}

function Option({ n, name, children }: { n: number; name: string; children: React.ReactNode }) {
  return (
    <section className="border-t hairline">
      <p className="shell t-nav pt-[calc(var(--header-h)+1rem)] pb-10 text-ink-mute">
        Option {n} · {name}
      </p>
      <div className="shell pb-[clamp(5rem,10vw,9rem)]">{children}</div>
    </section>
  );
}

export default function LanguagePosterOptions() {
  const data = rows();
  return (
    <div className="bg-paper">
      <Option n={1} name="Framed stage">
        <FramedStage rows={data} heading={heading} />
      </Option>
      <Option n={2} name="Poster and vendor row">
        <PosterRow rows={data} heading={heading} />
      </Option>
      <Option n={3} name="Poster and vendor list">
        <PosterList rows={data} heading={heading} />
      </Option>
      <Option n={4} name="Window behind the type">
        <WindowBehind rows={data} heading={heading} />
      </Option>
      <Option n={5} name="Photos within the words">
        <InlinePhotos rows={data} heading={heading} />
      </Option>
    </div>
  );
}
