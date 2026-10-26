import type { Metadata } from "next";
import Link from "next/link";
import { Monogram } from "@/components/brand/Logo";
import { Media } from "@/components/media/Media";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { HeroSearch } from "./HeroSearch";
import { HeroSlideshow } from "./HeroSlideshow";

/*
 * TEMPORARY: hero layout options for review. Delete before deploying (and the SiteHeader
 * exception for this route). Six different hero designs, each with sharp source images.
 */
export const metadata: Metadata = { title: "Hero styles", robots: { index: false } };

const img = (file: string) => `/images/hero/${file}.jpg`;
const headline = "Weddings that belong to two worlds";

function Label({ n, name, dark }: { n: number; name: string; dark?: boolean }) {
  return (
    <p className={`t-nav absolute top-[calc(var(--header-h)+0.75rem)] left-[var(--gutter)] z-20 px-3 py-2 ${dark ? "bg-ink text-paper" : "bg-paper text-ink"}`}>
      Style {n} · {name}
    </p>
  );
}

function Nav({ light }: { light?: boolean }) {
  return (
    <div className={`shell absolute inset-x-0 top-0 z-10 flex h-[var(--header-h)] items-center justify-between ${light ? "text-paper" : "text-ink"}`}>
      <Monogram className="w-[4.5rem]" />
      <span className="t-nav hidden gap-10 md:flex">
        <span>Vendors</span>
        <span>Journal</span>
        <span>About</span>
        <span>List your business</span>
      </span>
    </div>
  );
}

function Shade({ strength = "55" }: { strength?: "40" | "55" | "70" }) {
  const from = { "40": "from-night/40", "55": "from-night/55", "70": "from-night/70" }[strength];
  return <span className={`absolute inset-0 bg-gradient-to-t ${from} via-night/0 to-night/30`} />;
}

export default function HeroStyles() {
  return (
    <div className="bg-paper">
      {/* 1 · Full bleed */}
      <section className="relative h-[100svh] min-h-[36rem] overflow-hidden text-paper">
        <Media src={img("folkstone-weddings-01")} alt="Two brides walking in late light" brief="" priority sizes="100vw" className="absolute! inset-0 size-full" position="60% 50%" />
        <Shade />
        <Nav light />
        <Label n={1} name="Full bleed" />
        <div className="shell absolute inset-x-0 bottom-0 flex flex-col gap-8 pb-[clamp(2rem,5vw,4rem)] md:flex-row md:items-end md:justify-between">
          <h1 className="t-display max-w-[11ch]">{headline}</h1>
          <ArrowLink href="/vendors">Find vendors</ArrowLink>
        </div>
      </section>

      {/* 2 · Diptych */}
      <section className="relative h-[100svh] min-h-[36rem] overflow-hidden text-paper">
        <div className="absolute inset-0 grid grid-cols-2 gap-px bg-paper">
          <Media src={img("mona-chungchao-civil-marriage-celebrant-02")} alt="A tea ceremony" brief="" sizes="50vw" className="size-full" position="72% 50%" />
          <Media src={img("yaya-films-01")} alt="A couple on a Melbourne bridge at sunset" brief="" sizes="50vw" className="size-full" position="52% 50%" />
        </div>
        <span className="absolute inset-0 bg-night/25" />
        <Nav light />
        <Label n={2} name="Diptych" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-10 px-[var(--gutter)] text-center">
          <h1 className="t-display max-w-[14ch]">{headline}</h1>
          <ArrowLink href="/vendors">Find vendors</ArrowLink>
        </div>
      </section>

      {/* 3 · Search as a sentence */}
      <section className="relative h-[100svh] min-h-[36rem] overflow-hidden text-paper">
        <Media src={img("melbourne-harp-piano-deon-entwisle-01")} alt="A couple and harpist" brief="" sizes="100vw" className="absolute! inset-0 size-full" position="40% 50%" />
        <span className="absolute inset-0 bg-night/45" />
        <Nav light />
        <Label n={3} name="Search as a sentence" />
        <div className="shell absolute inset-0 flex flex-col justify-center">
          <HeroSearch />
        </div>
      </section>

      {/* 4 · Editorial split */}
      <section className="relative grid h-[100svh] min-h-[36rem] overflow-hidden md:grid-cols-12">
        <Nav />
        <Label n={4} name="Editorial split" dark />
        <div className="flex flex-col justify-end gap-8 px-[var(--gutter)] pt-[var(--header-h)] pb-[clamp(2rem,5vw,4rem)] md:col-span-5">
          <h1 className="t-display">{headline}</h1>
          <p className="t-body max-w-[36ch]">Celebrants, photographers, florists and musicians who know how to bring two cultures into one day.</p>
          <ArrowLink href="/vendors">Find vendors</ArrowLink>
        </div>
        <div className="relative hidden md:col-span-7 md:block">
          <Media src={img("kindred-visuals-03")} alt="A laughing couple outside a bluestone church" brief="" sizes="60vw" className="absolute! inset-0 size-full" position="45% 50%" />
        </div>
      </section>

      {/* 5 · Inset frame */}
      <section className="relative h-[100svh] min-h-[36rem] overflow-hidden">
        <Nav />
        <Label n={5} name="Inset frame" dark />
        <div className="absolute inset-x-[var(--gutter)] top-[var(--header-h)] bottom-[clamp(5rem,12vw,9rem)]">
          <Media src={img("invictus-quartet-02")} alt="A string quartet in an arched hall" brief="" sizes="100vw" className="size-full" position="50% 60%" />
        </div>
        <div className="shell absolute inset-x-0 bottom-0 flex items-end justify-between gap-8 pb-[clamp(1.5rem,3vw,2.5rem)]">
          <h1 className="font-display text-[clamp(3.25rem,9.5vw,10rem)] leading-[0.85] tracking-[-0.04em] text-paper mix-blend-difference">
            Two worlds, one day
          </h1>
          <Link href="/vendors" className="t-nav link-line mb-3 hidden shrink-0 md:inline">
            Find vendors
          </Link>
        </div>
      </section>

      {/* 6 · Slideshow with credits */}
      <section className="relative h-[100svh] min-h-[36rem] overflow-hidden text-paper">
        <HeroSlideshow
          slides={[
            { src: img("folkstone-weddings-01"), by: "Folkstone Weddings", href: "/vendors/folkstone-weddings", position: "60% 50%" },
            { src: img("kindred-visuals-03"), by: "Kindred Visuals", href: "/vendors/kindred-visuals", position: "45% 50%" },
            { src: img("melbourne-harp-piano-deon-entwisle-01"), by: "Melbourne Harp Piano", href: "/vendors/melbourne-harp-piano-deon-entwisle", position: "40% 50%" },
            { src: img("yaya-films-01"), by: "Yaya Films", href: "/vendors/yaya-films", position: "52% 50%" },
          ]}
        />
        <Nav light />
        <Label n={6} name="Slideshow with credits" />
      </section>
    </div>
  );
}
