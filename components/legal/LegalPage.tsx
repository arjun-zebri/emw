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
        {/* Each section a row across the page: its heading on the left, its text on the right. */}
        <div className="mt-[clamp(2.5rem,5vw,4rem)]">
          {page.sections.length === 0 ? (
            <div className="grid grid-cols-1 gap-4 border-t hairline pt-6 md:grid-cols-12 md:gap-8">
              <p className="t-body md:col-span-8 md:col-start-5">Our terms and conditions will be published here soon.</p>
            </div>
          ) : (
            page.sections.map((s) => (
              <section key={s.heading} className="grid grid-cols-1 gap-4 border-t hairline py-8 md:grid-cols-12 md:gap-8 md:py-10">
                <h2 className="t-title md:col-span-4">{s.heading}</h2>
                <div className="space-y-3 md:col-span-8 lg:col-span-7">
                  {s.paragraphs.map((p) => (
                    <p key={p} className="t-body [overflow-wrap:anywhere]">
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </article>
    </PageTransition>
  );
}
