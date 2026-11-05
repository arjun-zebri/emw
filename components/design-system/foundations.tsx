import clsx from "clsx";
import { Logo, Monogram } from "@/components/brand/Logo";
import { LOGO_VIEWBOX, MONOGRAM_HEIGHT, monogramPaths } from "@/components/brand/logo-paths";
import { Media } from "@/components/media/Media";
import { sectionTitle } from "@/components/ui/SectionHeading";
import { sitePhotos } from "@/data/photos";
import { languages } from "@/data/taxonomy";
import type { Language } from "@/data/types";
import { contrastLabel } from "./contrast";
import { MonogramWindow } from "./MonogramWindow";
import { Chapter, Part, Rule, Spec, Stage, Token } from "./parts";
import { Swatch } from "./Swatch";

const PAPER = "#faf8f5";
const INK = "#161412";

// ── Principles ──────────────────────────────────────────────────────────

const principles = [
  {
    title: "Photography leads",
    body: "The vendors’ own photos bring the colour, the culture and the feeling. Type and interface stay out of their way.",
  },
  {
    title: "Say less",
    body: "A vendor is a photo, a name and one line. If a sentence doesn’t help a couple decide, it goes.",
  },
  {
    title: "Culture through people",
    body: "Diversity shows in the vendors, their work and their languages, never in motifs. No dragons, lanterns or red and gold.",
  },
  {
    title: "Full, never empty",
    body: "Every layout holds up when a vendor has a single photo. Space is there to let things breathe, not to fill.",
  },
];

export function Principles() {
  return (
    <Chapter id="principles" title="Principles" intro="Warm, editorial and elevated, like a luxury wedding magazine, not a generic directory. Four ideas decide everything else.">
      <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <Media src={sitePhotos.statementPortrait} alt="A bride in an embroidered qun gua beside her partner in a navy suit" brief="" sizes="(min-width: 768px) 40vw, 100vw" className="aspect-[4/5] w-full" />
        </div>
        <ol className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 md:col-span-7 md:grid-cols-1 md:content-between md:gap-y-8">
          {principles.map((p) => (
            <li key={p.title} className="grid grid-cols-1 gap-3 border-t border-ink pt-5 lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] lg:gap-8">
              <h3 className="t-title">{p.title}</h3>
              <p className="t-body max-w-[48ch]">{p.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </Chapter>
  );
}

// ── Logo ────────────────────────────────────────────────────────────────

/** The monogram drawn with the default (nonzero) fill rule: the heart and counters fill in. */
function BrokenMonogram({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${LOGO_VIEWBOX.width} ${MONOGRAM_HEIGHT}`} fill="currentColor" className={clsx("block h-auto", className)} aria-hidden>
      {Object.values(monogramPaths).map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export function LogoChapter() {
  return (
    <Chapter id="logo" title="Logo" intro="The EMW monogram, traced from the original artwork. It appears in ink, in paper, or as a window onto a photograph, and nothing else.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stage ground="paper" className="flex aspect-[4/3] items-center justify-center" caption="Full logo. The footer, and anywhere the name isn’t already said.">
          <Logo title="East Meets Wed" className="w-[42%]" />
        </Stage>
        <Stage ground="soft" className="flex aspect-[4/3] items-center justify-center" caption="Monogram in ink, as in the header.">
          <Monogram className="w-[46%]" />
        </Stage>
        <Stage ground="night" className="flex aspect-[4/3] items-center justify-center" caption="Paper on night.">
          <Monogram className="w-[46%]" />
        </Stage>
        <div className="sm:col-span-3">
          <Stage ground="paper" className="flex aspect-[4/3] items-center justify-center px-[12%] sm:aspect-[21/8]" caption="As a window onto a photograph. The landing page’s intro opens this way.">
            <MonogramWindow src={sitePhotos.crafts["flowers-paper"]} label="The EMW monogram filled with a photograph of flowers" className="max-w-4xl" />
          </Stage>
        </div>
      </div>

      <Part title="Space and size" note="Keep clear space of half the monogram’s height on every side. Below 32px wide, use the favicon instead.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Stage ground="soft" className="flex aspect-[16/9] items-center justify-center" caption="The tinted band is the clear space.">
            {/* Padding of half the monogram's height (width × 345 ÷ 970 ÷ 2). */}
            <div className="bg-accent/20 p-[calc(var(--m)*0.1778)] [--m:min(14rem,45vw)]">
              <div className="bg-paper-soft">
                <Monogram className="w-[var(--m)]" />
              </div>
            </div>
          </Stage>
          <Stage ground="soft" className="flex aspect-[16/9] items-end justify-center gap-[clamp(1.5rem,5vw,4rem)] px-6 pb-[14%]" caption="Sizes in use.">
            {[
              { w: "w-32", label: "Footer, 128px" },
              { w: "w-[4.5rem]", label: "Header, 72px" },
              { w: "w-8", label: "Smallest, 32px" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-4">
                <Monogram className={s.w} />
                <span className="t-small whitespace-nowrap">{s.label}</span>
              </div>
            ))}
          </Stage>
        </div>
      </Part>

      <Part title="Misuse">
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-3">
          <Rule ok={false} visual={<Stage ground="paper" className="flex aspect-[4/3] items-center justify-center"><BrokenMonogram className="w-1/2" /></Stage>}>
            Fill the counters. Always draw it with <Token>fill-rule=&quot;evenodd&quot;</Token>, or the heart in the W disappears.
          </Rule>
          <Rule ok={false} visual={<Stage ground="paper" className="flex aspect-[4/3] items-center justify-center"><span className="absolute inset-0 bg-[#8f1d1d]" /><Monogram className="relative w-1/2 text-[#d9b45a]" /></Stage>}>
            Recolour it. Red and gold is the cliché the brief rules out.
          </Rule>
          <Rule ok={false} visual={<Stage ground="paper" className="flex aspect-[4/3] items-center justify-center"><Monogram className="w-1/2 scale-x-[1.4] drop-shadow-[0_6px_6px_rgb(0_0_0/0.35)]" /></Stage>}>
            Stretch it or add effects. No shadows, outlines or gradients.
          </Rule>
        </div>
      </Part>
    </Chapter>
  );
}

// ── Colour ──────────────────────────────────────────────────────────────

const core = [
  { name: "Paper", token: "--color-paper", value: PAPER, role: "The page. Every public screen starts here." },
  { name: "Paper soft", token: "--color-paper-soft", value: "#f3f0eb", role: "Image wells and quiet panels." },
  { name: "Ink", token: "--color-ink", value: INK, role: "Names, headlines, buttons.", dark: true },
  { name: "Ink soft", token: "--color-ink-soft", value: "#4a4642", role: "Body copy.", dark: true },
  { name: "Mute", token: "--color-ink-mute", value: "#6f6a64", role: "Captions, labels, secondary lines.", dark: true },
  { name: "Hairline", token: "--color-line", value: "rgb(22 20 18 / 0.12)", role: "Rules and borders, never shadows.", line: true },
];

const admin = [
  { name: "Surface", token: "--color-surface", value: "#ffffff", role: "Admin panels on paper." },
  { name: "Tier 1", token: "--color-tier-1", value: "#c4b57a", role: "Listing tiers, light to dark." },
  { name: "Tier 2", token: "--color-tier-2", value: "#8e7e3e", role: "One olive ramp.", dark: true },
  { name: "Tier 3", token: "--color-tier-3", value: "#3f3920", role: "Never used as status.", dark: true },
  { name: "Good", token: "--color-good", value: "#3d7a52", role: "Live, paid, up.", dark: true },
  { name: "Warn", token: "--color-warn", value: "#a8721f", role: "Pending, due soon.", dark: true },
  { name: "Bad", token: "--color-bad", value: "#b4452f", role: "Failed, overdue, down.", dark: true },
];

export function Colour() {
  return (
    <Chapter id="colour" title="Colour" intro="Paper and ink, and very little else. The colour on any page comes from the photography, so the interface stays neutral around it. Click a swatch to copy it.">
      <Part title="Paper and ink">
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {core.map((c) => (
            <Swatch key={c.token} {...c} contrast={c.value.startsWith("#") && c.dark ? contrastLabel(c.value, PAPER, "paper") : undefined} />
          ))}
        </div>
      </Part>

      <Part title="Night and accent">
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          <Swatch name="Night" token="--color-night" value={INK} dark role="The footer ground. Ink’s value, named for its job." contrast={contrastLabel(PAPER, INK, "night")} />
          <Swatch name="Olive-gold" token="--color-accent" value="#ad9e5d" role="The client’s own colour, kept in reserve." contrast={contrastLabel("#ad9e5d", PAPER, "paper")} />
          <p className="t-body col-span-2 self-end text-[0.9375rem] sm:col-span-1 lg:col-span-3 lg:max-w-[40ch]">
            Olive-gold is for one quiet thing on a screen at most, and never for text on paper. Most pages don’t use it at all.
          </p>
        </div>
      </Part>

      <Part title="Proportion" note="Roughly how a public page divides. The photographs do the colour work.">
        <div className="flex h-24 w-full gap-px overflow-hidden md:h-32" role="img" aria-label="Paper about 70%, photography about 22%, ink about 7%, accent at most 1%">
          <div className="flex w-[70%] items-end border hairline bg-paper p-3">
            <span className="t-small">Paper 70</span>
          </div>
          <div className="relative w-[22%]">
            <Media src={sitePhotos.crafts["beauty-attire"]} alt="" brief="" sizes="25vw" className="absolute inset-0 size-full" />
            <span className="t-small absolute bottom-3 left-3 text-paper">Photos 22</span>
          </div>
          <div className="flex w-[7%] items-end bg-ink p-3">
            <span className="t-small hidden text-paper/70 md:inline">Ink 7</span>
          </div>
          <div className="w-[1%] bg-accent" />
        </div>
      </Part>

      <Part title="Admin" note="The admin works on a white surface and adds colours that only ever mean something: a tier, or a state.">
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 lg:grid-cols-7">
          {admin.map((c) => (
            <Swatch key={c.token} {...c} contrast={c.name.length < 6 && c.dark ? contrastLabel(c.value, "#ffffff", "white") : undefined} />
          ))}
        </div>
      </Part>
    </Chapter>
  );
}

// ── Type ────────────────────────────────────────────────────────────────

const scale = [
  {
    cls: "t-display",
    sample: "Weddings that belong to two worlds",
    size: "44–104px, fluid",
    leading: "0.95",
    tracking: "−3%",
    use: "Page titles and vendor names. One per page.",
    sampleCls: "t-display",
  },
  {
    cls: "sectionTitle",
    sample: "Featured vendors",
    size: "32–54px, fluid",
    leading: "1",
    tracking: "−2.5%",
    use: "Section titles on the landing page.",
    sampleCls: sectionTitle,
  },
  {
    cls: "t-heading",
    sample: "Eight trays, seven trays",
    size: "28–42px, fluid",
    leading: "1.05",
    tracking: "−2%",
    use: "Chapter headings, drawer titles.",
    sampleCls: "t-heading",
  },
  {
    cls: "t-title",
    sample: "Sugar Bee Flowers",
    size: "22px",
    leading: "1.15",
    tracking: "−1%",
    use: "Vendor names on cards, small headings.",
    sampleCls: "t-title",
  },
  {
    cls: "t-body",
    sample: "Celebrants, photographers, florists and musicians who know how to bring two cultures into one day.",
    size: "16px",
    leading: "1.7",
    tracking: "0",
    use: "Paragraphs. Ink soft, 65 characters a line at most.",
    sampleCls: "t-body max-w-[52ch]",
  },
  {
    cls: "t-small",
    sample: "Florist, Melbourne · Victoria",
    size: "13px",
    leading: "1.45",
    tracking: "0",
    use: "Captions, the line under a name, labels.",
    sampleCls: "t-small",
  },
  {
    cls: "t-nav",
    sample: "Find vendors",
    size: "12px, 500",
    leading: "—",
    tracking: "+10%, uppercase",
    use: "Navigation and buttons only.",
    sampleCls: "t-nav",
  },
];

const scriptOrder: Language[] = ["Cantonese", "Mandarin", "Vietnamese", "Korean", "Japanese", "Thai", "Teochew", "Hakka", "Indonesian", "Filipino"];

export function Type() {
  return (
    <Chapter id="type" title="Type" intro="Two families, two jobs. Boska, a contemporary serif, for names and the few headlines. Switzer, a quiet grotesque, for everything else. Always sentence case.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Stage ground="paper" className="flex aspect-[4/3] flex-col justify-between p-[clamp(1.25rem,3vw,2.5rem)]">
          <p className="font-display text-[clamp(7rem,16vw,15rem)] leading-[0.8] tracking-[-0.04em]">Aa</p>
          <div>
            <p className="t-title text-[1.75rem]">Boska</p>
            <p className="t-small mt-1">Display serif, regular 400. Variable 200–900 with italics, from Fontshare.</p>
            <p className="mt-5 font-display text-[1.25rem] leading-snug tracking-[-0.01em] text-ink-soft break-words">Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt 0123456789</p>
          </div>
        </Stage>
        <Stage ground="paper" className="flex aspect-[4/3] flex-col justify-between p-[clamp(1.25rem,3vw,2.5rem)]">
          <p className="text-[clamp(7rem,16vw,15rem)] leading-[0.8] tracking-[-0.05em]">Aa</p>
          <div>
            <p className="text-[1.75rem] leading-tight tracking-[-0.01em]">Switzer</p>
            <p className="t-small mt-1">Sans serif, regular 400 and medium 500. Variable 100–900, from Fontshare.</p>
            <p className="mt-5 text-[1.125rem] leading-snug text-ink-soft break-words">Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt 0123456789</p>
          </div>
        </Stage>
      </div>

      <Part title="Scale" note="Seven styles cover every public page. Sizes marked fluid scale with the screen between a phone and 1760px.">
        <div className="border-t hairline">
          {scale.map((s) => (
            <div key={s.cls} className="grid grid-cols-1 gap-x-8 gap-y-4 border-b hairline py-6 lg:grid-cols-12 lg:items-baseline">
              <p className={clsx("min-w-0 text-ink lg:col-span-8", s.sampleCls)}>{s.sample}</p>
              <div className="text-[0.8125rem] lg:col-span-4">
                <p className="font-mono text-[0.75rem] text-ink">{s.cls}</p>
                <p className="mt-1.5 text-ink-soft tabular-nums">
                  {[s.size, s.leading !== "—" && `${s.leading} leading`, `${s.tracking} tracking`].filter(Boolean).join("  ·  ")}
                </p>
                <p className="mt-1 text-ink-mute">{s.use}</p>
              </div>
            </div>
          ))}
        </div>
      </Part>

      <Part title="Every language in its own script" note="Languages are set in their native script first, with the English name beside it or on hover. Thai and Korean fall back to matching Noto serifs, so every script shares one upright voice.">
        <Stage ground="soft" className="p-[clamp(1.5rem,4vw,3rem)]">
          <ul className="flex flex-wrap gap-x-[clamp(1.5rem,3vw,2.75rem)] gap-y-5">
            {scriptOrder.map((l) => (
              <li key={l} className="flex flex-col">
                <span lang={languages[l].lang} className="font-display text-[clamp(1.75rem,3vw,2.5rem)] leading-tight tracking-[-0.01em]">
                  {languages[l].native}
                </span>
                <span className="t-small mt-1">{l}</span>
              </li>
            ))}
          </ul>
        </Stage>
      </Part>

      <div className="grid grid-cols-1 gap-x-4 gap-y-8 md:grid-cols-2">
        <Rule ok visual={<Stage ground="paper" className="flex aspect-[16/7] items-center p-8"><p className={sectionTitle}>Find vendors by language</p></Stage>}>
          Sentence case, one style, nothing decorated.
        </Rule>
        <Rule ok={false} visual={<Stage ground="paper" className="flex aspect-[16/7] items-center p-8"><p className={sectionTitle}>Find Vendors by <em className="font-display italic">Language</em></p></Stage>}>
          Title Case, or an italic word for flourish. It reads as a template.
        </Rule>
      </div>
    </Chapter>
  );
}

// ── Layout ──────────────────────────────────────────────────────────────

const breakpoints = [
  { name: "Phone", width: "390px", grid: "1 column", directory: "1 card a row" },
  { name: "md", width: "768px", grid: "12 columns", directory: "2 cards a row" },
  { name: "lg", width: "1024px", grid: "12 columns", directory: "3 cards; vendor page splits" },
  { name: "xl", width: "1280px", grid: "12 columns", directory: "4 cards a row" },
  { name: "Max", width: "1760px", grid: "Content stops growing", directory: "" },
];

const space = [
  { px: 4, use: "Icon to label" },
  { px: 8, use: "Chips, tight groups" },
  { px: 16, use: "Name under a photo" },
  { px: 24, use: "Card gaps on phones" },
  { px: 32, use: "Grid gap at desktop" },
  { px: 56, use: "Between card rows" },
  { px: 112, use: "Section rhythm at desktop" },
];

export function Layout() {
  return (
    <Chapter id="layout" title="Layout" intro="A twelve-column grid inside a 1760px frame. Sections are separated by a single hairline and one rhythm of space, so the page reads like spreads, not boxes.">
      <Part title="Grid" note={<>The featured vendors spread: an 8 + 4 pair, then three 4s. Gutter <Token>--gutter</Token> 16–48px, gap 16–32px.</>}>
        <Stage ground="soft" className="p-[clamp(1rem,3vw,2rem)]">
          <div className="relative">
            <div className="absolute inset-0 grid grid-cols-12 gap-[clamp(0.5rem,2vw,2rem)]" aria-hidden>
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i} className="bg-accent/[0.12]" />
              ))}
            </div>
            <div className="relative grid grid-cols-12 gap-x-[clamp(0.5rem,2vw,2rem)] gap-y-[clamp(1rem,3vw,2.5rem)] py-[clamp(1rem,3vw,2rem)]">
              <div className="col-span-8">
                <Media src={sitePhotos.crafts["music-performance"]} alt="" brief="" sizes="50vw" className="aspect-[2/1.22] w-full" />
                <span className="mt-2 block h-2 w-1/3 bg-ink/70" />
              </div>
              <div className="col-span-4">
                <Media src={sitePhotos.crafts.ceremony} alt="" brief="" sizes="25vw" className="aspect-[4/5] w-full" />
                <span className="mt-2 block h-2 w-2/3 bg-ink/70" />
              </div>
              {[sitePhotos.crafts["photo-film"], sitePhotos.crafts["beauty-attire"], sitePhotos.crafts["flowers-paper"]].map((src) => (
                <div key={src} className="col-span-4">
                  <Media src={src} alt="" brief="" sizes="25vw" className="aspect-[4/5] w-full" />
                  <span className="mt-2 block h-2 w-1/2 bg-ink/70" />
                </div>
              ))}
            </div>
          </div>
        </Stage>
      </Part>

      <div className="grid grid-cols-1 gap-x-8 gap-y-14 lg:grid-cols-2">
        <Part title="Breakpoints">
          <div className="border-t hairline">
            {breakpoints.map((b) => (
              <div key={b.name} className="grid grid-cols-[4rem_4.5rem_minmax(0,1fr)] gap-4 border-b hairline py-3 text-[0.875rem]">
                <span className="text-ink">{b.name}</span>
                <span className="font-mono text-[0.75rem] text-ink-mute">{b.width}</span>
                <span className="text-ink-soft">{[b.grid, b.directory].filter(Boolean).join(". ")}</span>
              </div>
            ))}
          </div>
        </Part>
        <Part title="Space" note="A 4px base. These are the steps the site actually uses.">
          <div className="border-t hairline">
            {space.map((s) => (
              <div key={s.px} className="grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,11rem)] items-center gap-4 border-b hairline py-3 text-[0.875rem]">
                <span className="font-mono text-[0.75rem] text-ink-mute">{s.px}</span>
                <span className="h-3 bg-ink/80" style={{ width: `${(s.px / 112) * 100}%` }} aria-hidden />
                <span className="text-ink-soft">{s.use}</span>
              </div>
            ))}
          </div>
        </Part>
      </div>

      <Spec
        items={[
          ["Frame", <><Token>shell</Token> 100% wide, 1760px at most, centred, with the gutter either side</>],
          ["Section", <><Token>--section</Token> 64–112px: the same space above a hairline, below it, and after the content</>],
          ["Header", <><Token>--header-h</Token> 72px, fixed; it hides as you scroll down and returns as you scroll up</>],
          ["Phones", <>Every grid sets <Token>grid-cols-1</Token> first, so nothing can widen the page past 390px</>],
        ]}
      />
    </Chapter>
  );
}
