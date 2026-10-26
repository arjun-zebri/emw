import type { Metadata } from "next";
import { Media } from "@/components/media/Media";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { StickyStory } from "./StickyStory";

/*
 * TEMPORARY: five layouts for the landing page's About section, for review. Delete before
 * deploying. The copy is the client's own story, from their post "Eight trays, seven trays".
 */
export const metadata: Metadata = { title: "About options", robots: { index: false } };

const photos = {
  tea: { src: "/images/hero/mona-chungchao-civil-marriage-celebrant-02.jpg", alt: "A young guest offers tea to the bride and groom" },
  qunGua: { src: "/images/vendors/citrus-7-photography/05.jpg", alt: "A bride in a qun gua beside her partner" },
  laughing: { src: "/images/vendors/citrus-7-photography/01.jpg", alt: "A couple laughing, in black and white" },
  vows: { src: "/images/vendors/mona-chungchao-civil-marriage-celebrant/03.jpg", alt: "A couple exchanging vows beneath stained glass" },
  cake: { src: "/images/vendors/nikki-z-wedding-services/01.jpg", alt: "A couple cutting their cake as the MC laughs" },
};

const title = "Eight trays, seven trays";
const story = "Newly engaged, a Vietnamese-Australian bride asked her family how many trays a tea ceremony needs. Her grandmother said eight. Her grandfather said seven.";
const began = "East Meets Wed began with that conversation: a journal and directory for couples keeping their traditions, and the reasons behind them.";

function ReadTheStory({ className }: { className?: string }) {
  return (
    <ArrowLink href="https://eastmeetswed.com/eight-trays-seven-trays/" className={className}>
      Read the story
    </ArrowLink>
  );
}

function Copy({ className }: { className?: string }) {
  return (
    <div className={className}>
      <h2 className="t-heading">{title}</h2>
      <p className="t-body mt-6">{story}</p>
      <p className="t-body mt-4">{began}</p>
      <ReadTheStory className="mt-8" />
    </div>
  );
}

function Option({ n, name, children, bleed }: { n: number; name: string; children: React.ReactNode; bleed?: boolean }) {
  return (
    <section className="border-t hairline">
      <p className="shell t-nav pt-[calc(var(--header-h)+1rem)] pb-10 text-ink-mute">
        Option {n} · {name}
      </p>
      <div className={bleed ? "" : "shell"}>{children}</div>
      <div className="h-[clamp(5rem,10vw,9rem)]" />
    </section>
  );
}

export default function AboutOptions() {
  return (
    <div className="bg-paper">
      {/* 1 · Sticky story */}
      <Option n={1} name="Sticky story">
        <StickyStory
          beats={[
            {
              image: { ...photos.tea, position: "78% 40%" },
              content: (
                <>
                  <h2 className="t-heading">{title}</h2>
                  <p className="t-body mt-6 max-w-[38ch]">{story}</p>
                </>
              ),
            },
            {
              image: photos.qunGua,
              content: (
                <>
                  <p className="t-body max-w-[38ch]">{began}</p>
                  <ReadTheStory className="mt-8" />
                </>
              ),
            },
          ]}
        />
      </Option>

      {/* 2 · Staggered pair */}
      <Option n={2} name="Staggered pair">
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-12">
          <Media {...photos.tea} brief="" sizes="(min-width: 768px) 33vw, 100vw" position="78% 40%" className="aspect-[4/5] w-full md:col-span-4" />
          <Media {...photos.qunGua} brief="" sizes="(min-width: 768px) 25vw, 60vw" className="aspect-[3/4] w-2/3 md:col-span-3 md:mt-[40%] md:w-full" />
          <Copy className="md:col-span-4 md:col-start-9 md:self-end" />
        </div>
      </Option>

      {/* 3 · Half and half */}
      <Option n={3} name="Half and half" bleed>
        <div className="grid grid-cols-1 md:min-h-[90svh] md:grid-cols-2">
          <Media {...photos.tea} brief="" sizes="(min-width: 768px) 50vw, 100vw" position="72% 40%" className="aspect-[4/5] w-full md:aspect-auto md:h-full" />
          <div className="flex items-center bg-paper-soft px-[var(--gutter)] py-16 md:px-[clamp(3rem,7vw,8rem)]">
            <Copy className="max-w-[30rem]" />
          </div>
        </div>
      </Option>

      {/* 4 · Album */}
      <Option n={4} name="Album">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <h2 className="t-heading md:col-span-4">{title}</h2>
          <div className="md:col-span-5 md:col-start-7">
            <p className="t-body">{story}</p>
            <p className="t-body mt-4">{began}</p>
            <ReadTheStory className="mt-8" />
          </div>
        </div>
        <div className="-mx-[var(--gutter)] mt-[clamp(3rem,6vw,5rem)] flex snap-x snap-mandatory gap-[clamp(0.5rem,1vw,1rem)] overflow-x-auto px-[var(--gutter)] [scrollbar-width:none] md:mx-0 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
          {[
            { ...photos.qunGua, aspect: "aspect-[2/3]", grow: 2 },
            { ...photos.tea, aspect: "aspect-[3/2]", grow: 4.5 },
            { ...photos.laughing, aspect: "aspect-[2/3]", grow: 2 },
            { ...photos.vows, aspect: "aspect-[2/3]", grow: 2 },
          ].map((p) => (
            <div key={p.src} className="w-[70vw] shrink-0 snap-start md:w-auto md:min-w-0 md:shrink md:grow md:basis-0" style={{ flexGrow: p.grow }}>
              <Media src={p.src} alt={p.alt} brief="" sizes="(min-width: 768px) 30vw, 70vw" className={`${p.aspect} w-full`} />
            </div>
          ))}
        </div>
      </Option>

      {/* 5 · Inset card */}
      <Option n={5} name="Inset card">
        <div className="grid grid-cols-1 items-center gap-10 bg-paper-soft p-[clamp(1.5rem,4vw,4rem)] md:grid-cols-12 md:gap-8">
          <Media {...photos.qunGua} brief="" sizes="(min-width: 768px) 33vw, 100vw" className="aspect-[4/5] w-full md:col-span-5" />
          <Copy className="md:col-span-5 md:col-start-7" />
        </div>
      </Option>
    </div>
  );
}
