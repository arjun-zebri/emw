import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { Questions } from "@/components/join/Questions";
import { Media } from "@/components/media/Media";
import { PageTransition } from "@/components/motion/PageTransition";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Button } from "@/components/ui/Button";
import { sectionTitle } from "@/components/ui/SectionHeading";
import { vendorCover } from "@/data/images";
import { showcase } from "@/data/events";
import { languages } from "@/data/taxonomy";
import type { Vendor } from "@/data/types";
import { getListings } from "@/lib/listings";
import { locationLabel } from "@/lib/vendors";

export const metadata: Metadata = {
  title: "List your business",
  description: "Join East Meets Wed, the wedding directory for couples bringing two cultures together.",
};

const APPLY = "/list-your-business/apply";
const HERO_VENDOR = "invictus-quartet";
const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

// The listing shown as the example: the first of these that's published with two more photos and a language besides English.
const examplePicks = ["gabiera-film-photographer", "yaya-films", "at-last-film-and-photography", "stephanie-nguyen-artistry", "sugar-bee-flowers"];

// Why here and not a general directory. Each line is something the site does today; keep it that way.
const gives = [
  {
    title: "Couples who need what you know",
    body: "Every couple here is planning a wedding across two cultures. They’re looking for someone who already knows how a tea ceremony sits beside a church service, not someone they’ll have to explain it to.",
  },
  {
    title: "Found in their family’s language",
    body: "Couples and their parents search by language, and yours show in their own script. A family looking for a Teochew-speaking celebrant or an MC who works in Filipino finds you.",
  },
  {
    title: "Enquiries that arrive with the details",
    body: "Couples write with their date, their guest numbers and the traditions they’re bringing together, so you know from the first message whether it’s right for you.",
  },
  {
    title: "A short list, chosen by hand",
    body: "The team approves every listing. Couples trust what they find here, and your work isn’t lost among every supplier in the country.",
  },
];

/*
 * What vendors ask before they apply, in the order they ask it. Every answer is how the site works
 * today. Still to come from the client: prices, cancelling a plan, how long review takes, and the
 * Showcase; add those answers when they're confirmed, not before.
 */
const questions = [
  { q: "Who can apply?", a: "Any wedding business that works with couples bringing two cultures together, wherever you are in Australia. Celebrants, photographers, florists, musicians, planners, venues and everyone in between." },
  { q: "Is it only for certain cultures?", a: "No. East Meets Wed is open to every culture. If the couples you work with are blending two families and their traditions, you belong here." },
  { q: "What does it cost to apply?", a: "Nothing. If your listing is approved you choose a plan, and it goes live once you subscribe. You’ll see each plan and its price before you pay anything." },
  { q: "What do I need to apply?", a: "Your business name, what you do, the languages you work in, where you’re based and where you’ll travel, up to 12 photos, a few words about your work, and an email for enquiries." },
  { q: "How long does it take?", a: "About ten minutes. Your answers are saved in your browser as you go, so you can stop and pick up where you left off." },
  { q: "Do I need an account?", a: "Yes, so the listing stays yours to manage. Sign in with Google or Microsoft, or use your email and a password." },
  { q: "What photos work best?", a: "Your own work, large and sharp: 2000 pixels or more on the long side is ideal. We can’t take anything under 1600. You can add up to 12, and five or more fills your page well." },
  { q: "Can I use photos a photographer took for me?", a: "Yes, with their permission. Before you send your application you confirm the photos are yours to share, or that the photographer has said yes." },
  { q: "Who writes my listing?", a: "You do, in your own words. Before you send it you can preview your page exactly as couples will see it." },
  { q: "Will my email and phone number be public?", a: "No. They stay private, and enquiries come to you directly. Your website, Instagram and Facebook are linked from your listing." },
  { q: "How do couples find me?", a: "They browse the directory by what you do, where you work and the languages you speak, and each listing has its own page." },
  { q: "What happens after I apply?", a: "Someone from the East Meets Wed team looks at your listing. We’ll email you when it’s approved, or tell you if anything’s missing." },
  { q: "Can I change my listing later?", a: "Yes. Once you’re live you can sign in and update your photos, your story and your details whenever you like." },
  { q: "I was listed on the old East Meets Wed site. Do I need to apply?", a: "No. Your listing has moved across to the new site. Use Vendor login to manage it." },
  { q: "Can I list more than one business?", a: "Yes. Apply once for each business, with its own photos and story." },
];

/*
 * The invitation to vendors, made like the rest of the site: photography first, few words. Vendors
 * at work fill the screen; then a real listing beside what one gives you; the Showcase; how quick
 * it is; the answers; and the way in, over a wall of the vendors already here.
 */
export default async function ListYourBusiness() {
  const vendors = await getListings();
  const withCover = vendors.filter((v) => v.cover);
  const fits = (v: Vendor) => v.slug !== HERO_VENDOR && (v.gallery?.length ?? 0) >= 2 && (v.languages ?? []).some((l) => l !== "English");
  const example = examplePicks.map((s) => withCover.find((v) => v.slug === s && fits(v))).find(Boolean) ?? withCover.find(fits);
  const others = withCover.filter((v) => v.slug !== example?.slug);
  const wall = others.slice(0, 12);

  return (
    <PageTransition>
      <div>
        {/* A string quartet playing a ceremony, edge to edge. */}
        <section id="hero" className="relative h-[100svh] min-h-[40rem] overflow-hidden bg-night text-paper">
          <div className="hero-media absolute inset-0">
            <Media
              src={`/images/vendors/${HERO_VENDOR}/02.jpg`}
              alt="Invictus Quartet playing a ceremony under an arched glass roof, the guests seated before them"
              brief=""
              tone="dark"
              priority
              sizes="100vw"
              position="50% 45%"
              className="size-full"
            />
          </div>
          <span className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/25 to-night/0" />
          <span className="absolute inset-0 bg-gradient-to-r from-night/55 via-night/10 to-night/0" />
          <span className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-night/45 to-night/0" />
          <div className="shell absolute inset-x-0 bottom-0 grid grid-cols-1 gap-8 pb-[clamp(2rem,5vw,4rem)] lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h1 data-intro-in className="t-display max-w-[14ch] text-balance">
                Be found by couples bringing two cultures together
              </h1>
              <p data-intro-in style={d(0.12)} className="mt-6 max-w-[44ch] text-[1.0625rem] leading-[1.65] text-paper/80">
                East Meets Wed is the wedding directory and journal for couples blending cultures. Show them your work, the
                languages you speak and the traditions you know.
              </p>
              <div data-intro-in style={d(0.24)} className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Button href={APPLY} variant="paper">
                  Start your listing
                </Button>
                <Link href="/login?as=vendor" className="t-nav link-line text-paper/80 hover:text-paper">
                  Vendor login
                </Link>
              </div>
            </div>
            <div data-intro-in style={d(0.32)} className="flex flex-col justify-end gap-5 lg:col-span-4 lg:col-start-9 lg:items-end">
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[0.875rem] text-paper/85 lg:justify-end">
                <li className="flex items-center gap-2">
                  <Icon name="clock" className="size-4 text-paper/60" />
                  About 10 minutes
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="eye" className="size-4 text-paper/60" />
                  Reviewed by our team
                </li>
              </ul>
              <Link href={`/vendors/${HERO_VENDOR}`} className="t-small link-line text-paper/55 hover:text-paper">
                Invictus Quartet
              </Link>
            </div>
          </div>
        </section>

        <section className="shell py-[var(--section)]">
          <div className="grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:grid-rows-[1fr_auto_auto_1fr] lg:gap-x-8 lg:gap-y-0">
            <div data-reveal suppressHydrationWarning className="lg:col-span-5 lg:col-start-8 lg:row-start-2">
              <h2 className={`${sectionTitle} max-w-[16ch]`}>Not another wedding directory</h2>
              <p className="t-body mt-5 max-w-[44ch] text-[1.0625rem] text-ink">
                General directories list everyone for everyone. This one is only for couples marrying across two cultures, and the
                vendors who know how.
              </p>
            </div>
            {example && (
              <div className="lg:col-span-7 lg:col-start-1 lg:row-span-4 lg:row-start-1">
                <Example vendor={example} />
              </div>
            )}
            <ul className="border-t hairline lg:col-span-5 lg:col-start-8 lg:row-start-3 lg:mt-[clamp(1.75rem,3vw,2.5rem)] lg:self-start">
              {gives.map((g, i) => (
                <li key={g.title} data-reveal suppressHydrationWarning style={d(0.06 * i)} className="border-b hairline py-5">
                  <h3 className="t-title text-[clamp(1.3125rem,1.7vw,1.5rem)]">{g.title}</h3>
                  <p className="t-body mt-2 max-w-[46ch]">{g.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Showcase />


        <section className="shell py-[var(--section)]">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-8">
            <div data-reveal suppressHydrationWarning className="md:col-span-4">
              <h2 className={sectionTitle}>Live in three steps</h2>
              <p className="t-body mt-5 max-w-[34ch]">Most vendors finish in one sitting. If you can’t, it’s saved for when you can.</p>
              <Button href={APPLY} className="mt-8">
                Start your listing
              </Button>
            </div>
            <ol className="grid grid-cols-1 border-t hairline sm:grid-cols-3 md:col-span-8">
              {[
                { title: "Tell us about your work", body: "What you do, your languages and where you travel.", time: "3 minutes" },
                { title: "Add your photos and story", body: "Your best work, and a few words in your own voice.", time: "5 minutes" },
                { title: "Send it to the team", body: "We review it by hand and email you when it’s approved.", time: "2 minutes" },
              ].map((s, i) => (
                <li key={s.title} data-reveal suppressHydrationWarning style={d(i * 0.08)} className="border-b hairline py-7 sm:border-b-0 sm:border-l sm:px-7 sm:first:border-l-0 sm:first:pl-0">
                  <p className="t-small flex items-center gap-2">
                    <Icon name="clock" className="size-3.5" />
                    {s.time}
                  </p>
                  <h3 className="t-title mt-6 text-[1.5rem]">{s.title}</h3>
                  <p className="t-body mt-2">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="shell pb-[var(--section)]">
          <div className="grid grid-cols-1 gap-10 border-t hairline pt-[var(--section)] md:grid-cols-12 md:gap-8">
            <div data-reveal suppressHydrationWarning className="md:col-span-4">
              <h2 className={sectionTitle}>Questions</h2>
              <p className="t-body mt-5 max-w-[30ch]">Everything vendors ask us before they apply.</p>
            </div>
            <div data-reveal suppressHydrationWarning className="md:col-span-8">
              <Questions items={questions} />
            </div>
          </div>
        </section>

        {wall.length >= 6 && <Wall vendors={wall} />}
      </div>
    </PageTransition>
  );
}

/**
 * A real listing, as the work leads it: the cover beside two more of their photos, then their
 * name, one line and their languages in their own scripts, and the way to their page.
 */
function Example({ vendor }: { vendor: Vendor }) {
  const [a, b] = vendor.gallery ?? [];
  const tongues = (vendor.languages ?? []).filter((l) => l !== "English");
  return (
    <figure data-reveal suppressHydrationWarning>
      <Link href={`/vendors/${vendor.slug}`} className="group grid grid-cols-5 gap-[clamp(0.375rem,0.8vw,0.75rem)]" aria-label={`${vendor.name}’s page`}>
        <div className="col-span-3 overflow-hidden">
          <div className="transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.03]">
            <Media {...vendorCover(vendor)} sizes="(min-width: 1024px) 35vw, 60vw" className="aspect-[4/5] w-full" />
          </div>
        </div>
        <div className="col-span-2 grid grid-rows-2 gap-[clamp(0.375rem,0.8vw,0.75rem)]">
          {[a, b].map((src) => (
            <Media key={src} src={src} alt="" brief="" sizes="(min-width: 1024px) 23vw, 40vw" className="size-full" />
          ))}
        </div>
      </Link>
      <figcaption className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <p className="t-title text-[clamp(1.5rem,2.2vw,2rem)]">{vendor.name}</p>
          <p className="t-small mt-1 text-ink">
            {vendor.discipline}, {locationLabel(vendor)}
          </p>
          {tongues.length > 0 && (
            <p className="mt-1.5 flex flex-wrap gap-x-3 font-display text-[1.0625rem] text-ink-soft">
              {tongues.map((l) => (
                <span key={l} lang={languages[l].lang}>
                  {languages[l].native}
                </span>
              ))}
            </p>
          )}
        </div>
        <ArrowLink href={`/vendors/${vendor.slug}`}>See their page</ArrowLink>
      </figcaption>
    </figure>
  );
}

/**
 * The Showcase, told by the event itself: the room opens the section edge to edge with its name on
 * it, then what it is and what listed vendors get beside two moments from the day.
 */
function Showcase() {
  const { floor, moments } = showcase.photos;
  return (
    <section>
      <div className="relative overflow-hidden bg-night text-paper">
        <div data-reveal-media suppressHydrationWarning>
          <Media src={floor.src} alt={floor.alt} brief={floor.brief} tone="dark" sizes="100vw" className="aspect-[4/5] w-full sm:aspect-[16/9] lg:aspect-[21/9]" />
        </div>
        <span className="absolute inset-0 bg-gradient-to-t from-night/75 via-night/10 to-night/0" />
        <div className="shell absolute inset-x-0 bottom-0 pb-[clamp(1.75rem,4vw,3.5rem)]">
          <p data-reveal suppressHydrationWarning className="text-[0.9375rem] text-paper/75">
            {showcase.when} · {showcase.where}
          </p>
          <h2 data-reveal suppressHydrationWarning style={d(0.08)} className="t-display mt-3 max-w-[16ch] text-[clamp(2.5rem,5.4vw,5.5rem)] text-balance">
            {showcase.name}
          </h2>
        </div>
      </div>
      <div className="shell mt-[clamp(2.5rem,5vw,4.5rem)] grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
        <div data-reveal suppressHydrationWarning className="lg:col-span-5 lg:self-center">
          <p className="t-body max-w-[42ch] text-[1.125rem] text-ink">{showcase.summary}</p>
          <ul className="mt-8 border-t hairline">
            {showcase.forVendors.map((p) => (
              <li key={p} className="t-body border-b hairline py-4">
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Button href={APPLY}>Start your listing</Button>
            <p className="t-small">Next Showcase {showcase.next}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-[clamp(0.5rem,1vw,1rem)] lg:col-span-6 lg:col-start-7">
          {moments.map((m, i) => (
            <figure key={m.caption} data-reveal suppressHydrationWarning style={d(0.08 * (i + 1))}>
              <div data-reveal-media suppressHydrationWarning>
                <Media src={m.src} alt={m.alt} brief={m.brief} tone={i + 1} sizes="(min-width: 1024px) 25vw, 50vw" className="aspect-[4/5] w-full" />
              </div>
              <figcaption className="t-small mt-3">{m.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/** The way in, over the vendors already here: edge to edge, dimmed, the invitation on top. */
function Wall({ vendors }: { vendors: Vendor[] }) {
  return (
    <section className="relative overflow-hidden bg-night text-paper">
      <div aria-hidden className="grid grid-cols-3 gap-px sm:grid-cols-4 lg:grid-cols-6">
        {vendors.map((v, i) => (
          <Media key={v.slug} {...vendorCover(v)} alt="" sizes="(min-width: 1024px) 17vw, 33vw" className={`aspect-[4/5] w-full ${i >= 6 ? "hidden sm:block" : ""} ${i >= 8 ? "sm:hidden lg:block" : ""}`} />
        ))}
      </div>
      <span className="absolute inset-0 bg-night/65" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-[var(--gutter)] text-center">
        <h2 data-reveal suppressHydrationWarning className="t-display max-w-[14ch] text-balance">
          Ready when you are
        </h2>
        <div data-reveal suppressHydrationWarning style={d(0.1)} className="mt-9">
          <Button href={APPLY} variant="paper">
            Start your listing
          </Button>
        </div>
      </div>
    </section>
  );
}
