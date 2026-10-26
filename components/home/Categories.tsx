import Link from "next/link";
import { Media } from "@/components/media/Media";
import { craftImages } from "@/data/images";
import { crafts } from "@/data/taxonomy";

export function Categories() {
  return (
    <section className="shell pb-[var(--section)]">
      <ul className="-mx-[var(--gutter)] flex snap-x snap-mandatory gap-[clamp(0.5rem,1vw,1rem)] overflow-x-auto scroll-px-[var(--gutter)] px-[var(--gutter)] [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
        {crafts.map((c, i) => (
          <li key={c.id} data-reveal style={{ "--d": `${i * 0.06}s` } as React.CSSProperties} className="w-[62vw] shrink-0 snap-start md:w-auto">
            <Link href={`/vendors?craft=${c.id}`} transitionTypes={["nav-forward"]} className="group relative block overflow-hidden text-paper">
              <div className="transition-transform duration-[1200ms] ease-out-expo group-hover:scale-[1.04]">
                <Media {...craftImages[c.id]} sizes="(min-width: 768px) 20vw, 62vw" className="aspect-[3/4] w-full" />
              </div>
              <span className="absolute inset-0 bg-gradient-to-t from-night/60 via-night/0 to-night/0" />
              <span className="t-title absolute bottom-4 left-4">{c.short}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
