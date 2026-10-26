import type { Metadata } from "next";
import Link from "next/link";
import { Media } from "@/components/media/Media";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { languages } from "@/data/taxonomy";
import type { Language } from "@/data/types";
import { languageCounts, vendors } from "@/lib/vendors";
import { ExpandIndex } from "./ExpandIndex";
import { Poster } from "./Poster";
import { Stage } from "./Stage";
import type { LangRow } from "./types";

/*
 * TEMPORARY: five layouts for the landing page's languages section, for review. Delete before deploying.
 */
export const metadata: Metadata = { title: "Language options", robots: { index: false } };

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

function Option({ n, name, children, bleed }: { n: number; name: string; children: React.ReactNode; bleed?: boolean }) {
  return (
    <section className="border-t hairline">
      <p className="shell t-nav pt-[calc(var(--header-h)+1rem)] pb-10 text-ink-mute">
        Option {n} · {name}
      </p>
      <div className={bleed ? "" : "shell pb-[clamp(5rem,10vw,9rem)]"}>{children}</div>
    </section>
  );
}

export default function LanguageOptions() {
  const data = rows();
  const withPhotos = data.filter((r) => r.vendors.some((v) => v.cover));

  return (
    <div className="bg-paper">
      {/* 1 · Expanding index */}
      <Option n={1} name="Expanding index">
        <SectionHeading>{heading}</SectionHeading>
        <ExpandIndex rows={data} />
      </Option>

      {/* 2 · Tiles */}
      <Option n={2} name="Tiles">
        <SectionHeading>{heading}</SectionHeading>
        <ul className="grid grid-cols-2 border-t border-l hairline md:grid-cols-4">
          {data.map((row) => {
            const cover = row.vendors.find((v) => v.cover)?.cover;
            return (
              <li key={row.name} className="border-r border-b hairline">
                <Link href={`/vendors?lang=${row.name}`} className="group relative flex aspect-square flex-col justify-between overflow-hidden p-[clamp(1rem,2vw,1.75rem)]">
                  {cover && (
                    <span className="absolute inset-0 opacity-0 transition-opacity duration-700 ease-out-quart group-hover:opacity-100">
                      <Media src={cover} alt="" brief="" sizes="25vw" className="size-full" />
                      <span className="absolute inset-0 bg-night/45" />
                    </span>
                  )}
                  <span className="t-small relative transition-colors duration-700 group-hover:text-paper/80">
                    {row.native !== row.name ? row.name : ""}
                  </span>
                  <span lang={row.lang} className="relative font-display text-[clamp(1.9rem,3.4vw,3.4rem)] leading-[1] tracking-[-0.02em] transition-colors duration-700 group-hover:text-paper">
                    {row.native}
                  </span>
                  <span className="t-small relative tabular-nums transition-colors duration-700 group-hover:text-paper/80">
                    {row.count} {row.count === 1 ? "vendor" : "vendors"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Option>

      {/* 3 · Typographic poster */}
      <Option n={3} name="Typographic poster" bleed>
        <Poster rows={data} heading={heading} />
      </Option>

      {/* 4 · Photo stage */}
      <Option n={4} name="Photo stage">
        <SectionHeading>{heading}</SectionHeading>
        <Stage rows={data} />
      </Option>

      {/* 5 · Cards */}
      <Option n={5} name="Cards">
        <SectionHeading>{heading}</SectionHeading>
        <ul className="-mx-[var(--gutter)] flex snap-x snap-mandatory gap-[clamp(0.5rem,1vw,1rem)] overflow-x-auto scroll-px-[var(--gutter)] px-[var(--gutter)] pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {withPhotos.map((row) => {
            const v = row.vendors.find((x) => x.cover)!;
            return (
              <li key={row.name} className="w-[68vw] shrink-0 snap-start md:w-[clamp(16rem,22vw,22rem)]">
                <Link href={`/vendors?lang=${row.name}`} className="group relative block overflow-hidden text-paper">
                  <div className="transition-transform duration-[1200ms] ease-out-expo group-hover:scale-[1.04]">
                    <Media src={v.cover} alt={v.name} brief="" sizes="(min-width: 768px) 22vw, 68vw" className="aspect-[3/4] w-full" />
                  </div>
                  <span className="absolute inset-0 bg-gradient-to-t from-night/70 via-night/10 to-night/0" />
                  <span className="absolute inset-x-5 bottom-5">
                    <span lang={row.lang} className="block font-display text-[clamp(2rem,3vw,3rem)] leading-[1] tracking-[-0.02em]">
                      {row.native}
                    </span>
                    <span className="t-small mt-2 block text-paper/75">
                      {row.native !== row.name && `${row.name} · `}
                      {row.count} {row.count === 1 ? "vendor" : "vendors"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Option>
    </div>
  );
}
