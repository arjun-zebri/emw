import clsx from "clsx";
import Link from "next/link";
import { Icon, iconNames, type IconName } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { craftImages } from "@/data/images";
import { photoRatios } from "@/data/photo-ratios";
import { sitePhotos } from "@/data/photos";
import { crafts } from "@/data/taxonomy";
import { getVendor } from "@/lib/vendors";
import { Chapter, Part, Spec, Stage, Token } from "./parts";
import { Replay } from "./Replay";

const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

// ── Photography ─────────────────────────────────────────────────────────

// Chosen for range: culture, craft, colour and orientation.
const range = ["katrina-lai", "candy-ng-art", "sugar-bee-flowers", "invictus-quartet", "yaya-films"].map((slug) => {
  const v = getVendor(slug)!;
  return { name: v.name, slug, src: v.cover!, ratio: photoRatios[v.cover!] ?? 0.8 };
});

const direction = {
  do: [
    "Real moments, in natural light",
    "Both families in the frame where we can",
    "Every culture the directory serves, not one standing in for all",
    "The vendor’s own work, credited to them",
  ],
  dont: [
    "Posed stock photography",
    "Flyers, logos or headshots as a cover",
    "Filters, colour washes or text laid over photos",
    "A run of red and gold that tips into cliché",
  ],
};

export function Photography() {
  return (
    <Chapter id="photography" title="Photography" intro="The vendors’ own photos are the palette. They are never cropped to fit a story, never tinted and always credited.">
      <figure>
        {/* Phones: a two-up grid. From md: one justified row, each photo at its own ratio. */}
        <div className="grid grid-cols-2 gap-2 md:flex md:gap-[clamp(0.5rem,1vw,1rem)]">
          {range.map((p, i) => (
            <Link
              key={p.slug}
              href={`/vendors/${p.slug}`}
              className={clsx("group block min-w-0 md:[flex:var(--r)_1_0%]", i === 4 && "max-md:hidden")}
              style={{ "--r": p.ratio } as React.CSSProperties}
            >
              <span className="block aspect-[4/5] overflow-hidden md:[aspect-ratio:var(--r)]">
                <span className="block size-full transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.03]">
                  <Media src={p.src} alt={`Photograph by ${p.name}`} brief="" sizes="(min-width: 768px) 25vw, 50vw" className="size-full" />
                </span>
              </span>
              <span className="t-small mt-2.5 block truncate">{p.name}</span>
            </Link>
          ))}
        </div>
      </figure>

      <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2">
        {(["do", "dont"] as const).map((k) => (
          <div key={k}>
            <p className={clsx("flex items-center gap-2.5 border-t pt-3 text-[0.875rem] font-medium", k === "do" ? "border-ink" : "border-bad/60")}>
              <Icon name={k === "do" ? "check" : "close"} className={clsx("size-4", k === "dont" && "text-bad")} strokeWidth={1.5} />
              {k === "do" ? "Look for" : "Leave out"}
            </p>
            <ul className="mt-2">
              {direction[k].map((line) => (
                <li key={line} className="t-body border-b hairline py-3 text-[0.9375rem]">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Part title="Frames" note="Three frames cover the site. Photos on a vendor’s page are never cropped.">
        {/* One shared height, so each frame shows its true shape. */}
        <div className="@container"><div className="flex flex-wrap items-start gap-x-4 gap-y-8 [--h:9.5rem] sm:[--h:12rem] md:[--h:calc((100cqw-2rem)/4.65)]">
          <figure>
            <Media src={sitePhotos.crafts["beauty-attire"]} alt="" brief="" sizes="20vw" className="aspect-[4/5] h-[var(--h)]" />
            <figcaption className="t-small mt-3 max-w-[24ch]">Card, 4:5. The directory and featured vendors.</figcaption>
          </figure>
          <figure>
            <Media src={sitePhotos.crafts["music-performance"]} alt="" brief="" sizes="40vw" className="aspect-[8/5] h-[var(--h)] max-w-full" />
            <figcaption className="t-small mt-3 max-w-[36ch]">Wide tile: a landscape cover across two columns, one tile in five at most.</figcaption>
          </figure>
          <figure>
            <div className="flex h-[var(--h)] gap-1.5">
              {["/images/vendors/katrina-lai/02.jpg", "/images/vendors/katrina-lai/04.jpg"].map((src) => (
                <div key={src} className="h-full" style={{ aspectRatio: photoRatios[src] ?? 0.8 }}>
                  <Media src={src} alt="" brief="" sizes="20vw" className="size-full" />
                </div>
              ))}
            </div>
            <figcaption className="t-small mt-3 max-w-[32ch]">Justified rows: one height, every photo at its own ratio, never cropped.</figcaption>
          </figure>
        </div></div>
      </Part>

      <Part title="Waiting for a photo" note="An empty slot is a soft grey with its brief in small type, so whoever supplies the photo knows what it’s for.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Media alt="Placeholder" brief={craftImages.ceremony.brief} tone={0} className="aspect-[4/3] w-full" />
          <Media alt="Placeholder" brief="Final pins in bridal hair, window light." tone={1} className="aspect-[4/3] w-full" />
          <Media alt="Placeholder" brief="Strings mid-performance, bows blurred." tone={3} className="aspect-[4/3] w-full" />
        </div>
      </Part>
    </Chapter>
  );
}

// ── Icons ───────────────────────────────────────────────────────────────

function iconGroups(): { title: string; note: string; names: IconName[] }[] {
  const craftIds = crafts.map((c) => c.id) as IconName[];
  const adminStart = iconNames.indexOf("overview");
  return [
    { title: "Interface", note: "Navigation, contact and social links.", names: iconNames.slice(0, adminStart).filter((n) => !craftIds.includes(n)) },
    { title: "Crafts", note: "Drawn as objects from the day itself.", names: craftIds },
    { title: "Admin", note: "Drawn at 1.5 stroke when small.", names: iconNames.slice(adminStart).filter((n) => !craftIds.includes(n)) },
  ];
}

export function Icons() {
  const groups = iconGroups();
  return (
    <Chapter id="icons" title="Icons" intro="A small set drawn for the site: thin lines and round ends, so they sit beside Switzer like another weight of the type.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="md:col-span-5">
          <Stage ground="paper" className="flex aspect-square items-center justify-center" caption="A slender heart, after the one in the W of the monogram.">
            <div className="relative w-[62%]">
              <svg viewBox="0 0 24 24" className="absolute inset-0 size-full text-accent/50" aria-hidden>
                {Array.from({ length: 25 }, (_, i) => (
                  <g key={i}>
                    <line x1={i} y1={0} x2={i} y2={24} stroke="currentColor" strokeWidth={i % 12 === 0 ? 0.06 : 0.025} />
                    <line x1={0} y1={i} x2={24} y2={i} stroke="currentColor" strokeWidth={i % 12 === 0 ? 0.06 : 0.025} />
                  </g>
                ))}
                <rect x="2" y="2" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={0.05} strokeDasharray="0.3 0.3" />
              </svg>
              <Icon name="heart" className="relative size-full" />
            </div>
          </Stage>
        </div>
        <div className="md:col-span-7 md:self-end">
          <Spec
            items={[
              ["Grid", "24 × 24, with 2px of padding inside"],
              ["Stroke", "1.25, or 1.5 at 16px and below"],
              ["Ends", "Round caps and round joins"],
              ["Colour", <>Always <Token>currentColor</Token>: an icon is the colour of the text beside it</>],
              ["Size", "20px by default, 14–16px beside small type"],
              ["Labels", "Decorative icons are hidden from screen readers; an icon on its own gets a label"],
            ]}
          />
        </div>
      </div>

      {groups.map((g) => (
        <Part key={g.title} title={g.title} note={g.note}>
          <ul className="grid grid-cols-3 border-t border-l hairline sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
            {g.names.map((n) => (
              <li key={n} className="flex aspect-[5/4] flex-col items-center justify-center gap-3 border-r border-b hairline p-3 text-center">
                <Icon name={n} className="size-6" strokeWidth={g.title === "Admin" ? 1.5 : 1.25} />
                <span className="font-mono text-[0.6875rem] text-ink-mute">{n}</span>
              </li>
            ))}
          </ul>
        </Part>
      ))}
    </Chapter>
  );
}

// ── Motion ──────────────────────────────────────────────────────────────

const easings = [
  { name: "Out expo", token: "--ease-out-expo", v: [0.16, 1, 0.3, 1], use: "Reveals, images settling, hover movement. The house curve." },
  { name: "Out quart", token: "--ease-out-quart", v: [0.25, 1, 0.5, 1], use: "Fades, and anything that should simply arrive." },
  { name: "In-out quart", token: "--ease-in-out-quart", v: [0.76, 0, 0.24, 1], use: "Drawers, the hero curtain and the card-to-page morph." },
];

const durations = [
  ["Colour on hover", "300ms"],
  ["Underline draws in", "600ms"],
  ["Drawers and menu", "700ms"],
  ["Page enters", "700ms, after a 200ms exit"],
  ["Card morphs into vendor page", "850ms"],
  ["Text rises into view", "1.0–1.2s"],
  ["Photo settles from 108%", "1.8s"],
] as const;

// Seconds from a full load of the landing page. Keep in step with `.intro` in globals.css.
const timeline = [
  { label: "E and W slide in, M rises", from: 0.35, to: 2.65 },
  { label: "Tagline settles, then fades", from: 1.3, to: 3.2 },
  { label: "Monogram leans in and dissolves", from: 3.0, to: 4.2 },
  { label: "Hero photo unveiled from below", from: 3.7, to: 5.2 },
  { label: "Headline and header arrive", from: 4.4, to: 5.7 },
];
const END = 6.2;

function Curve({ v }: { v: number[] }) {
  const [x1, y1, x2, y2] = v;
  const p = (x: number, y: number) => `${(x * 100).toFixed(1)},${((1 - y) * 100).toFixed(1)}`;
  return (
    <svg viewBox="-4 -4 108 108" className="block w-full overflow-visible" aria-hidden>
      <rect x="0" y="0" width="100" height="100" fill="none" stroke="var(--color-line)" strokeWidth="0.6" />
      <path d={`M${p(0, 0)} L${p(x1, y1)} M${p(1, 1)} L${p(x2, y2)}`} stroke="var(--color-accent)" strokeWidth="0.6" />
      <circle cx={x1 * 100} cy={(1 - y1) * 100} r="1.6" fill="var(--color-accent)" />
      <circle cx={x2 * 100} cy={(1 - y2) * 100} r="1.6" fill="var(--color-accent)" />
      <path d={`M${p(0, 0)} C${p(x1, y1)} ${p(x2, y2)} ${p(1, 1)}`} fill="none" stroke="var(--color-ink)" strokeWidth="1.2" />
    </svg>
  );
}

export function Motion() {
  return (
    <Chapter id="motion" title="Motion" intro="Things settle into place, slowly and then all at once. Nothing bounces, spins or asks to be noticed, and all of it switches off when a device asks for reduced motion.">
      <Part title="Easing" note="Hover a curve to see it move.">
        <div className="grid grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-3">
          {easings.map((e) => (
            <figure key={e.token} className="group">
              <div className="bg-paper-soft p-[clamp(1.25rem,3vw,2rem)]">
                <Curve v={e.v} />
                <div className="relative mt-6 h-2">
                  <span className="absolute inset-x-0 top-1/2 h-px bg-ink/15" />
                  <span
                    className="absolute top-0 left-0 size-2 rounded-full bg-ink transition-[left] duration-[1400ms] group-hover:left-[calc(100%-0.5rem)]"
                    style={{ transitionTimingFunction: `var(${e.token})` }}
                  />
                </div>
              </div>
              <figcaption className="mt-3">
                <p className="text-[0.9375rem]">{e.name}</p>
                <p className="mt-0.5 font-mono text-[0.6875rem] text-ink-mute">cubic-bezier({e.v.join(", ")})</p>
                <p className="t-small mt-1.5">{e.use}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </Part>

      <div className="grid grid-cols-1 gap-x-8 gap-y-14 lg:grid-cols-12">
        <Part title="Reveal" note="Text rises 20px as it fades in; photos settle from a slight zoom. Neighbours follow 80ms apart." className="lg:col-span-7">
          <Replay>
            <div className="grid grid-cols-3 gap-[clamp(0.5rem,1.5vw,1rem)]">
              {(["ceremony", "flowers-paper", "music-performance"] as const).map((id, i) => (
                <div key={id} data-reveal suppressHydrationWarning style={d(i * 0.08)}>
                  <div data-reveal-media suppressHydrationWarning style={d(i * 0.08)}>
                    <Media src={craftImages[id].src} alt="" brief="" sizes="20vw" className="aspect-[4/5] w-full" />
                  </div>
                  <p className="t-small mt-2 truncate">{crafts.find((c) => c.id === id)?.name}</p>
                </div>
              ))}
            </div>
          </Replay>
        </Part>
        <Part title="Hover" note="Underlines draw from the left; arrows nudge forward; photos lean in by 3%." className="lg:col-span-5">
          <Stage ground="soft" className="flex flex-col items-start gap-6 p-[clamp(1.25rem,3vw,2rem)]">
            <a href="#motion" className="link-line text-[0.9375rem]">
              A text link
            </a>
            <ArrowLink href="/vendors">Find vendors</ArrowLink>
            <Link href="/vendors/sugar-bee-flowers" className="group block w-1/2 overflow-hidden">
              <span className="block transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.03]">
                <Media src={getVendor("sugar-bee-flowers")!.cover} alt="Sugar Bee Flowers" brief="" sizes="20vw" className="aspect-[4/5] w-full" />
              </span>
            </Link>
          </Stage>
        </Part>
      </div>

      <Part
        title="The intro"
        note={
          <>
            Plays on every full load of the landing page, never on a click within the site. Scrolling waits until it has finished.{" "}
            {/* A full load on purpose: the intro never plays on client-side navigation. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="link-line text-ink">
              Watch it
            </a>
          </>
        }
      >
        <div className="border-t hairline">
          {timeline.map((t) => (
            <div key={t.label} className="grid grid-cols-1 gap-2 border-b hairline py-3 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:items-center sm:gap-6">
              <span className="text-[0.875rem]">{t.label}</span>
              <div className="relative h-2 bg-ink/[0.04]">
                <span className="absolute inset-y-0 bg-ink" style={{ left: `${(t.from / END) * 100}%`, width: `${((t.to - t.from) / END) * 100}%` }} />
              </div>
            </div>
          ))}
          <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:gap-6">
            <span className="hidden sm:block" />
            <div className="t-small relative h-4 font-mono text-[0.6875rem]">
              {[0, 1, 2, 3, 4, 5, 6].map((s) => (
                <span key={s} className="absolute -translate-x-1/2 first:translate-x-0" style={{ left: `${(s / END) * 100}%` }}>
                  {s}s
                </span>
              ))}
            </div>
          </div>
        </div>
      </Part>

      <Part title="Durations">
        <Spec items={durations.map(([a, b]) => [a, b])} />
      </Part>
    </Chapter>
  );
}
