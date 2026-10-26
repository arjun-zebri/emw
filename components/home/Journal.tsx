import { Media } from "@/components/media/Media";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { journal } from "@/data/images";

/** Three stories side by side, with images, categories and titles all on one line. */
export function Journal() {
  return (
    <section id="journal" className="shell scroll-mt-16 pb-[var(--section)]">
      <SectionHeading>Journal</SectionHeading>
      <div className="grid grid-cols-1 gap-x-[clamp(1rem,1.6vw,1.5rem)] gap-y-10 md:grid-cols-3">
        {journal.map((story, i) => (
          <article key={story.title} data-reveal style={{ "--d": `${i * 0.08}s` } as React.CSSProperties} className="group">
            <div className="overflow-hidden">
              <Media
                {...story.image}
                sizes="(min-width: 768px) 33vw, 100vw"
                className="aspect-[4/5] w-full transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.03]"
              />
            </div>
            <p className="t-small mt-4">{story.category}</p>
            <h3 className="t-title mt-1">{story.title}</h3>
          </article>
        ))}
      </div>
    </section>
  );
}
