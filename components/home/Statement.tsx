import Link from "next/link";
import { Media } from "@/components/media/Media";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { siteImages } from "@/data/images";

const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

/*
 * About, as a staggered spread: a tea ceremony and, set lower, a couple in a qun gua, with the story
 * aligned to the bottom of the lower photo. The story is the client's own, from their post
 * "Eight trays, seven trays"; the founder isn't named there, so isn't here.
 */
export function Statement() {
  return (
    <section id="about" className="shell scroll-mt-16 pt-[clamp(6rem,12vw,10rem)] pb-[var(--section)]">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        <figure data-reveal className="md:col-span-4">
          <div data-reveal-media>
            <Media {...siteImages.statement} sizes="(min-width: 768px) 33vw, 100vw" position="78% 40%" className="aspect-[4/5] w-full" />
          </div>
          <Credit href="/vendors/mona-chungchao-civil-marriage-celebrant">Mona Chungchao</Credit>
        </figure>
        <figure data-reveal style={d(0.1)} className="ml-auto w-2/3 md:col-span-3 md:mt-[55%] md:ml-0 md:w-full">
          <div data-reveal-media>
            <Media {...siteImages.statementPortrait} sizes="(min-width: 768px) 25vw, 66vw" className="aspect-[3/4] w-full" />
          </div>
          <Credit href="/vendors/citrus-7-photography">Citrus 7 Photography</Credit>
        </figure>
        <div data-reveal style={d(0.2)} className="mt-8 md:col-span-4 md:col-start-9 md:mt-0 md:self-end md:pb-[1.85rem]">
          <h2 className="t-heading">Eight trays, seven trays</h2>
          <p className="t-body mt-6">
            Newly engaged, a Vietnamese-Australian bride asked her family how many trays a tea ceremony needs. Her
            grandmother said eight. Her grandfather said seven.
          </p>
          <p className="t-body mt-4">
            East Meets Wed began with that conversation: a journal and directory for couples keeping their traditions, and
            the reasons behind them.
          </p>
          <ArrowLink href="https://eastmeetswed.com/eight-trays-seven-trays/" className="mt-8">
            Read the story
          </ArrowLink>
        </div>
      </div>
    </section>
  );
}

function Credit({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <figcaption className="t-small mt-3">
      <Link href={href} className="link-line">
        {children}
      </Link>
    </figcaption>
  );
}
