import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { Questions } from "@/components/join/Questions";
import { ValueStory } from "@/components/join/ValueStory";
import { Media } from "@/components/media/Media";
import { PageTransition } from "@/components/motion/PageTransition";
import { Button } from "@/components/ui/Button";
import { sectionTitle } from "@/components/ui/SectionHeading";
import { vendorCover } from "@/data/images";
import { showcase } from "@/data/events";
import { languages, serviceLabels } from "@/data/taxonomy";
import type { Vendor } from "@/data/types";
import { getListings } from "@/lib/listings";
import { languageCounts, locationLabel } from "@/lib/vendors";

export const metadata: Metadata = {
  title: "List your business",
  description: "Join East Meets Wed, the wedding directory for couples bringing two cultures together.",
};

const APPLY = "/list-your-business/apply";
const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

// The vendor whose page is shown in miniature: the first of these that's published with enough photos.
const spreadPicks = ["gabiera-film-photographer", "yaya-films", "at-last-film-and-photography", "stephanie-nguyen-artistry", "sugar-bee-flowers"];

const questions = [
  { q: "Who can apply?", a: "Any wedding business that works with couples bringing two cultures together, wherever you are in Australia. Celebrants, photographers, florists, musicians, planners, venues and everyone in between." },
  { q: "How long does it take?", a: "About ten minutes. Your answers are saved in your browser as you go, so you can stop and pick up where you left off." },
  { q: "What happens after I apply?", a: "Someone from the East Meets Wed team looks at your listing. We’ll email you when it’s live, or tell you if anything’s missing." },
  { q: "Can I change my listing later?", a: "Yes. Once you’re live you can sign in and update your photos, your story and your details whenever you like." },
  { q: "What photos work best?", a: "Your own work, large and sharp: at least 1200 pixels on the long side. Five or more lets your page breathe." },
  { q: "Can I list more than one business?", a: "Yes. Apply once for each business, with its own photos and story." },
];

/*
 * The invitation to vendors, made like the rest of the site: photography first, few words. A vendor
 * at work fills the screen; then what a listing gives them, shown rather than told (their page,
 * their languages, the enquiry couples send, the company they keep); the Showcase; how quick it is;
 * a few answers; and the way in, over a wall of the vendors already here.
 */
export default async function ListYourBusiness() {
  const vendors = await getListings();
  const withCover = vendors.filter((v) => v.cover);
  const spread = spreadPicks.map((s) => withCover.find((v) => v.slug === s && (v.gallery?.length ?? 0) >= 3)).find(Boolean) ?? withCover.find((v) => (v.gallery?.length ?? 0) >= 3);
  const tongues = languageCounts(vendors)
    .map(([l]) => l)
    .filter((l) => l !== "English");
  const others = withCover.filter((v) => v.slug !== spread?.slug);
  const company = others.slice(0, 6);
  // A different set for the closing wall where there are enough, so the page doesn't repeat itself.
  const wall = others.length >= 18 ? others.slice(6, 18) : others.slice(0, 12);

  const values = [
    {
      title: "Your work, shown large",
      body: "Listings lead with your photography, every frame uncropped, with nothing competing for attention. No ads, no clutter.",
      visual: spread ? <Spread vendor={spread} /> : null,
    },
    {
      title: "Found in your languages",
      body: "Couples search by the languages you work in, and your listing shows each one in its own script.",
      visual: <Scripts tongues={tongues} />,
    },
    {
      title: "Enquiries come to you",
      body: "Couples write from your page with their date and the traditions they’re bringing together. It lands in your inbox.",
      visual: <EnquiryCard name={spread?.name ?? "Your business"} />,
    },
    {
      title: "In good company",
      body: "Every listing is approved by hand, so the directory stays worth browsing, and you sit beside vendors couples already trust.",
      visual: <Company vendors={company} />,
    },
  ].filter((v) => v.visual);

  return (
    <PageTransition>
      <div>
        {/* A celebrant mid-ceremony, edge to edge. */}
        <section id="hero" className="relative h-[100svh] min-h-[40rem] overflow-hidden bg-night text-paper">
          <div className="hero-media absolute inset-0">
            <Media
              src="/images/vendors/katrina-lai/03.jpg"
              alt="Katrina Lai, microphone in hand, beside a laughing couple at their ceremony"
              brief=""
              tone="dark"
              priority
              sizes="100vw"
              position="60% 35%"
              className="size-full"
            />
          </div>
          <span className="absolute inset-0 bg-gradient-to-t from-night/80 via-night/20 to-night/0" />
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
              <Link href="/vendors/katrina-lai" className="t-small link-line text-paper/55 hover:text-paper">
                Katrina Lai
              </Link>
            </div>
          </div>
        </section>

        <section className="shell py-[var(--section)]">
          <h2 data-reveal suppressHydrationWarning className={`${sectionTitle} mb-[clamp(2.5rem,5vw,4rem)] max-w-[20ch]`}>
            What a listing gives you
          </h2>
          <ValueStory items={values} />
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
                { title: "Send it to the team", body: "We review it by hand and email you when it’s live.", time: "2 minutes" },
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
            <h2 data-reveal suppressHydrationWarning className={`${sectionTitle} md:col-span-4`}>
              Questions
            </h2>
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

/** A vendor's page in miniature: the cover and justified photos left, their name and details right. */
function Spread({ vendor }: { vendor: Vendor }) {
  const gallery = (vendor.gallery ?? []).slice(0, 3);
  const tongues = vendor.languages ?? [];
  return (
    <div aria-hidden className="bg-paper-soft p-[clamp(1rem,2.4vw,2rem)]">
      <div className="bg-paper p-[clamp(1rem,2vw,1.75rem)] shadow-[0_40px_80px_-48px_rgb(22_20_18/0.35)]">
        <div className="grid grid-cols-12 gap-[clamp(0.75rem,1.6vw,1.5rem)]">
          <div className="col-span-7 space-y-2">
            <Media {...vendorCover(vendor)} sizes="(min-width: 1024px) 32vw, 60vw" className="aspect-[4/5] w-full" />
            <div className="grid grid-cols-3 gap-2">
              {gallery.map((src) => (
                <Media key={src} src={src} alt="" brief="" sizes="12vw" className="aspect-square w-full" />
              ))}
            </div>
          </div>
          <div className="col-span-5 flex flex-col">
            <p className="font-display text-[clamp(1.25rem,2.4vw,2.25rem)] leading-[0.98] tracking-[-0.02em]">{vendor.name}</p>
            <p className="mt-2 text-[clamp(0.625rem,0.9vw,0.8125rem)] text-ink">
              {vendor.discipline}, {locationLabel(vendor)}
            </p>
            {tongues.length > 0 && (
              <p className="mt-1.5 flex flex-wrap gap-x-2 font-display text-[clamp(0.75rem,1.1vw,1rem)] text-ink-soft">
                {tongues.map((l) => (
                  <span key={l} lang={languages[l].lang}>
                    {languages[l].native}
                  </span>
                ))}
              </p>
            )}
            {vendor.story[0] && (
              <p className="mt-4 line-clamp-6 text-[clamp(0.5625rem,0.8vw,0.75rem)] leading-[1.6] text-ink-soft">{vendor.story[0].replace(/^## |^- |\*\*/gm, "")}</p>
            )}
            <div className="mt-auto pt-4">
              {[
                ["Services", vendor.services.map((s) => serviceLabels[s]).join(", ")],
                ["Service area", (vendor.serviceArea ?? []).length >= 8 ? "Australia-wide" : (vendor.serviceArea ?? []).join(", ") || "On request"],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between gap-3 border-t hairline py-1.5 text-[clamp(0.5625rem,0.75vw,0.6875rem)]">
                  <span className="text-ink-mute">{l}</span>
                  <span className="truncate text-ink">{v}</span>
                </div>
              ))}
              <span className="mt-2 flex h-[clamp(1.5rem,2.6vw,2.25rem)] items-center justify-center bg-ink text-[clamp(0.5rem,0.7vw,0.625rem)] font-medium tracking-[0.1em] text-paper uppercase">
                Enquire
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The languages vendors on the site work in, set large in their own scripts. */
function Scripts({ tongues }: { tongues: string[] }) {
  return (
    <div aria-hidden className="flex aspect-[4/3] flex-wrap content-center items-baseline gap-x-[clamp(1rem,2.4vw,2rem)] gap-y-2 bg-night p-[clamp(1.5rem,4vw,3.5rem)] text-paper">
      {tongues.map((l, i) => {
        const lang = languages[l as keyof typeof languages];
        return (
          <span key={l} lang={lang.lang} className={`font-display leading-[1.1] tracking-[-0.02em] ${i % 3 === 0 ? "text-[clamp(2.5rem,5.4vw,5rem)]" : "text-[clamp(1.75rem,3.6vw,3.25rem)] text-paper/55"}`}>
            {lang.native}
          </span>
        );
      })}
    </div>
  );
}

/** The enquiry form couples fill in on a vendor's page, as it opens. */
function EnquiryCard({ name }: { name: string }) {
  return (
    <div aria-hidden className="relative aspect-[4/3] overflow-hidden bg-paper-soft">
      <Media src="/images/vendors/kindred-visuals/03.jpg" alt="" brief="" sizes="(min-width: 1024px) 50vw, 100vw" className="absolute inset-0 size-full" position="35% 50%" />
      <span className="absolute inset-0 bg-night/25" />
      <div className="absolute inset-y-[8%] right-[6%] flex w-[min(22rem,52%)] flex-col bg-paper p-[clamp(1rem,2.2vw,1.75rem)] shadow-[0_40px_80px_-32px_rgb(22_20_18/0.5)]">
        <p className="font-display text-[clamp(1.125rem,2vw,1.75rem)] leading-[1.05] tracking-[-0.02em]">{name}</p>
        <div className="mt-4 space-y-1">
          {["Your names", "Email", "Wedding date", "Cultures and traditions"].map((f) => (
            <p key={f} className="border-b hairline py-[clamp(0.375rem,0.8vw,0.625rem)] text-[clamp(0.6875rem,0.95vw,0.875rem)] text-ink-mute/70">
              {f}
            </p>
          ))}
        </div>
        <p className="mt-4 text-[clamp(0.5625rem,0.8vw,0.75rem)] text-ink-mute">Guests</p>
        <div className="mt-1.5 grid grid-cols-4 gap-1">
          {["Under 80", "80–200", "200–400", "400+"].map((g, i) => (
            <span key={g} className={`border py-[clamp(0.25rem,0.5vw,0.375rem)] text-center text-[clamp(0.5rem,0.75vw,0.6875rem)] ${i === 2 ? "border-ink bg-ink text-paper" : "hairline text-ink-soft"}`}>
              {g}
            </span>
          ))}
        </div>
        <p className="mt-3 min-h-[3.5em] flex-1 border-b hairline py-[clamp(0.375rem,0.8vw,0.625rem)] text-[clamp(0.6875rem,0.95vw,0.875rem)] text-ink-mute/70">Message</p>
        <span className="mt-4 flex h-[clamp(2rem,3vw,2.75rem)] items-center justify-center bg-ink text-[clamp(0.5625rem,0.75vw,0.6875rem)] font-medium tracking-[0.1em] text-paper uppercase">
          Send enquiry
        </span>
      </div>
    </div>
  );
}

/** Six vendors already listed, as their cards sit in the directory. */
function Company({ vendors }: { vendors: Vendor[] }) {
  return (
    <div className="grid grid-cols-3 gap-x-[clamp(0.5rem,1vw,0.875rem)] gap-y-5">
      {vendors.map((v) => (
        <Link key={v.slug} href={`/vendors/${v.slug}`} className="group block">
          <div className="overflow-hidden">
            <div className="transition-transform duration-[1200ms] ease-out-expo group-hover:scale-[1.04]">
              <Media {...vendorCover(v)} sizes="(min-width: 1024px) 18vw, 33vw" className="aspect-[4/5] w-full" />
            </div>
          </div>
          <p className="mt-2.5 truncate font-display text-[clamp(0.9375rem,1.2vw,1.125rem)] leading-tight">{v.name}</p>
          <p className="t-small mt-0.5 truncate text-[0.75rem]">{v.discipline}</p>
        </Link>
      ))}
    </div>
  );
}

/** The Showcase: a night band, the event on the left and three moments from it on the right. */
function Showcase() {
  const [big, ...rest] = showcase.moments;
  return (
    <section className="bg-night text-paper">
      <div className="shell grid grid-cols-1 gap-12 py-[var(--section)] lg:grid-cols-12 lg:gap-8">
        <div data-reveal suppressHydrationWarning className="flex flex-col lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:col-span-5 lg:self-start">
          <p className="text-[0.875rem] text-paper/55">
            {showcase.when} · {showcase.where}
          </p>
          <h2 className="t-display mt-5 text-[clamp(2.5rem,4.6vw,4.75rem)] text-balance">{showcase.name}</h2>
          <p className="mt-6 max-w-[40ch] text-[1.0625rem] leading-[1.65] text-paper/70">{showcase.summary}</p>
          <ul className="mt-10 border-t border-paper/15">
            {showcase.forVendors.map((p) => (
              <li key={p} className="flex items-start gap-4 border-b border-paper/15 py-4 text-paper/90">
                <Icon name="check" className="mt-1 size-4 shrink-0 text-accent" />
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Button href={APPLY} variant="paper">
              Start your listing
            </Button>
            <p className="text-[0.875rem] text-paper/55">Next showcase {showcase.next}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-[clamp(0.5rem,1vw,1rem)] lg:col-span-6 lg:col-start-7">
          <figure data-reveal suppressHydrationWarning className="col-span-2">
            <div data-reveal-media suppressHydrationWarning>
              <Media src={big.src} alt={big.alt} brief="" tone="dark" sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-[16/10] w-full" />
            </div>
            <figcaption className="mt-3 text-[0.8125rem] text-paper/55">{big.caption}</figcaption>
          </figure>
          {rest.map((m, i) => (
            <figure key={m.src} data-reveal suppressHydrationWarning style={d(0.08 * (i + 1))}>
              <div data-reveal-media suppressHydrationWarning>
                <Media src={m.src} alt={m.alt} brief="" tone="dark" sizes="(min-width: 1024px) 25vw, 50vw" className="aspect-[4/5] w-full" />
              </div>
              <figcaption className="mt-3 text-[0.8125rem] text-paper/55">{m.caption}</figcaption>
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
