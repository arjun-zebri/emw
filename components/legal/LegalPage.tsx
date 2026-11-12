import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/PageTransition";
import type { LegalPage as Page } from "@/data/legal";
import { pageMeta } from "@/lib/seo";

/** Kept out of search until the client's own text replaces the placeholder. */
export function legalMeta(page: Page, path: string): Metadata {
  return { ...pageMeta({ title: page.title, description: page.description, path }), ...(!page.final && { robots: { index: false } }) };
}

/** A plain reading page: the title, then each section's heading and paragraphs in one measure. */
export function LegalPage({ page }: { page: Page }) {
  return (
    <PageTransition>
      <article className="shell pt-[calc(var(--header-h)+clamp(3rem,8vw,6rem))] pb-[clamp(6rem,12vw,10rem)]">
        <h1 data-intro-in className="t-display">
          {page.title}
        </h1>
        <div className="mt-[clamp(2.5rem,5vw,4rem)] max-w-[62ch] border-t hairline pt-[clamp(2rem,4vw,3rem)]">
          {page.sections.length === 0 ? (
            <p className="t-body">Our terms and conditions will be published here soon.</p>
          ) : (
            page.sections.map((s) => (
              <section key={s.heading} className="mb-10 last:mb-0">
                <h2 className="t-title mb-4">{s.heading}</h2>
                {s.paragraphs.map((p) => (
                  <p key={p} className="t-body mt-3 [overflow-wrap:anywhere]">
                    {p}
                  </p>
                ))}
              </section>
            ))
          )}
        </div>
      </article>
    </PageTransition>
  );
}
