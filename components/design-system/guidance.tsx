import { Badge, Btn, Empty, Kbd, Panel, Stat } from "@/components/admin/ui";
import { Meter, Sparkline } from "@/components/admin/charts";
import { languages } from "@/data/taxonomy";
import { getVendor } from "@/lib/vendors";
import { contrast } from "./contrast";
import { AdminControlsDemo, AdminTableDemo } from "./Demos";
import { Chapter, Part, Rule, Spec, Stage } from "./parts";

// ── Writing ─────────────────────────────────────────────────────────────

const pairs = [
  { good: "Find vendors", bad: "Discover your dream wedding team!", why: ["Say what the button does.", "Hype and an exclamation mark."] },
  {
    good: "Celebrants, photographers, florists and musicians who know how to bring two cultures into one day.",
    bad: "Where East truly meets West: a magical fusion of cultures for your happily ever after.",
    why: ["Concrete: who they are and what they do.", "Wordplay on the name, and clichés about culture."],
  },
  {
    good: "Enquiry sent. Katrina Lai will reply by email.",
    bad: "Woohoo! Your message is winging its way to Katrina 💌",
    why: ["What happened, and what happens next.", "Cute copy and emoji."],
  },
  { good: "No vendors match those filters", bad: "Oops! Looks like nobody’s home…", why: ["Plain, so the next step is obvious.", "Jokes where someone is stuck."] },
];

function Quote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-36 items-center bg-paper-soft p-[clamp(1.25rem,3vw,2rem)]">
      <p className="t-title text-pretty">{children}</p>
    </div>
  );
}

export function Writing() {
  return (
    <Chapter id="writing" title="Writing" intro="As little as possible. Plain, warm and unhurried, the way a good planner talks to a nervous couple. The landing page has about forty words.">
      <div className="grid grid-cols-1 gap-x-4 gap-y-10 md:grid-cols-2">
        {pairs.map((p) => (
          <div key={p.good} className="contents">
            <Rule ok visual={<Quote>{p.good}</Quote>}>
              {p.why[0]}
            </Rule>
            <Rule ok={false} visual={<Quote>{p.bad}</Quote>}>
              {p.why[1]}
            </Rule>
          </div>
        ))}
      </div>
      <Spec
        items={[
          ["Spelling", "Australian: colour, organise, favourite, enquire"],
          ["Case", "Sentence case everywhere. Buttons are written in sentence case and set in capitals by the style"],
          ["Punctuation", "No exclamation marks. An en dash for ranges (80–200), a middle dot between places (Melbourne · Victoria)"],
          ["Languages", "The native name first, the English name second: 廣東話 Cantonese"],
          ["Vendors", "Their own words for their story. Never invent a fact about a real business: no prices, reviews, years or awards they haven’t published"],
          ["Culture", "Name the tradition plainly when it matters (tea ceremony, áo dài). Never use it as decoration or as a pun"],
        ]}
      />
    </Chapter>
  );
}

// ── Admin ───────────────────────────────────────────────────────────────

const tableSlugs = ["katrina-lai", "invictus-quartet", "sugar-bee-flowers", "candy-ng-art"];

export function Admin() {
  const rows = tableSlugs.map((s) => getVendor(s)!);
  return (
    <Chapter
      id="admin"
      title="Admin"
      intro="The owners’ admin and the vendors’ portal use the same paper, ink and type, tuned for work: Switzer at 14px, white panels on paper, square corners and hairlines instead of shadows. Figures here are examples."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Stat label="Enquiries" value="128" delta={0.12} note="vs last month">
          <Sparkline values={[8, 11, 9, 14, 12, 17, 15, 19, 18, 22, 21, 26]} />
        </Stat>
        <Stat label="Listing views" value="4,210" delta={-0.04} note="vs last month">
          <Sparkline values={[40, 46, 44, 52, 49, 47, 51, 45, 43, 46, 42, 41]} />
        </Stat>
        <Stat label="Listings by tier" value="34">
          <Meter
            parts={[
              { label: "Tier 1", value: 18, color: "var(--color-tier-1)" },
              { label: "Tier 2", value: 11, color: "var(--color-tier-2)" },
              { label: "Tier 3", value: 5, color: "var(--color-tier-3)" },
            ]}
          />
        </Stat>
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-14 lg:grid-cols-2">
        <Part title="Buttons">
          <Stage ground="surface" className="flex flex-wrap items-center gap-2.5 p-6">
            <Btn variant="primary" icon="check">
              Approve
            </Btn>
            <Btn icon="eye">Preview</Btn>
            <Btn variant="ghost">Cancel</Btn>
            <Btn variant="danger" icon="trash">
              Remove
            </Btn>
            <Btn icon="more" aria-label="More" />
            <Btn size="sm" icon="download">
              Export
            </Btn>
          </Stage>
        </Part>
        <Part title="Status" note="Green, amber and red only ever mean state. Tiers use the olive ramp.">
          <Stage ground="surface" className="flex flex-wrap items-center gap-2.5 p-6">
            <Badge tone="good">Live</Badge>
            <Badge tone="warn">Pending</Badge>
            <Badge tone="bad">Overdue</Badge>
            <Badge>Draft</Badge>
            <Badge tone="ink">Featured</Badge>
            <span className="ml-2 flex items-center gap-1.5 text-[0.75rem] text-ink-mute">
              Search <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          </Stage>
        </Part>
      </div>

      <Part title="Controls">
        <Stage ground="surface" className="p-6">
          <AdminControlsDemo />
        </Stage>
      </Part>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <Panel title="Vendors" meta="A table, edge to edge in its panel" flush className="lg:col-span-8">
          <AdminTableDemo
            rows={rows.map((v) => ({
              slug: v.slug,
              name: v.name,
              cover: v.cover,
              discipline: v.discipline,
              languages: (v.languages ?? []).filter((l) => l !== "English").map((l) => ({ native: languages[l].native, lang: languages[l].lang })),
              photos: (v.gallery?.length ?? 0) + (v.cover ? 1 : 0),
            }))}
          />
        </Panel>
        <Panel className="lg:col-span-4">
          <Empty title="No enquiries yet" action={<Btn variant="primary">Share your listing</Btn>}>
            When a couple writes to you, it lands here.
          </Empty>
        </Panel>
      </div>
    </Chapter>
  );
}

// ── Accessibility ───────────────────────────────────────────────────────

const PAPER = "#faf8f5";
const r = (fg: string) => `${contrast(fg, PAPER).toFixed(1)}:1`;

const checks = [
  {
    title: "Contrast",
    body: `Ink on paper is ${r("#161412")}, body copy ${r("#4a4642")}, and the lightest text, mute, ${r("#6f6a64")}: AA at 13px. Olive-gold, at ${r("#ad9e5d")}, is never text.`,
  },
  { title: "Focus", body: "A 1px outline in the text’s own colour, 4px clear, on everything reached by keyboard. Try tabbing through this page." },
  { title: "Reduced motion", body: "When a device asks, the intro, reveals, smooth scrolling and transitions all switch off. Nothing is lost but the movement." },
  { title: "Languages", body: "Every native name carries its lang attribute, so screen readers pronounce it properly and browsers pick the right glyphs." },
  { title: "Structure", body: "A skip link, one h1 per page, header, main and footer landmarks. Drawers take focus, close with Escape and hand focus back." },
  { title: "Images", body: "Every photo has alt text naming the vendor. Purely decorative images have empty alt text, so they’re skipped." },
  { title: "Targets", body: "Buttons are 48px tall. Icon-only buttons have padding around the glyph and a spoken label." },
  { title: "Phones", body: "Checked at 390px and 1440px with no sideways scroll. Every grid starts as one column." },
];

export function Accessibility() {
  return (
    <Chapter id="accessibility" title="Accessibility" intro="Elegant has to mean easy to use, for everyone, on any device. These are the checks every page passes.">
      <ul className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {checks.map((c) => (
          <li key={c.title} className="border-t border-ink pt-5">
            <h3 className="t-title">{c.title}</h3>
            <p className="t-body mt-3 text-[0.9375rem]">{c.body}</p>
          </li>
        ))}
      </ul>
    </Chapter>
  );
}
