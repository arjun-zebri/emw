import clsx from "clsx";
import { Logo, Monogram } from "@/components/brand/Logo";
import { Icon, iconNames } from "@/components/icons/Icon";
import { sectionTitle } from "@/components/ui/SectionHeading";
import { languages } from "@/data/taxonomy";
import type { Language } from "@/data/types";
import { Section, Stage, Token } from "./parts";
import { Swatch } from "./Swatch";

// ── Logo ────────────────────────────────────────────────────────────────

export function LogoSection() {
  return (
    <Section id="logo" title="Logo">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stage ground="paper" className="flex aspect-[4/3] items-center justify-center" caption="Full logo">
          <Logo title="East Meets Wed" className="w-[42%]" />
        </Stage>
        <Stage ground="soft" className="flex aspect-[4/3] items-center justify-center" caption="Monogram">
          <Monogram className="w-[46%]" />
        </Stage>
        <Stage ground="night" className="flex aspect-[4/3] items-center justify-center" caption="Monogram on night">
          <Monogram className="w-[46%]" />
        </Stage>
      </div>
    </Section>
  );
}

// ── Colour ──────────────────────────────────────────────────────────────

const colours = [
  { name: "Paper", token: "--color-paper", value: "#faf8f5" },
  { name: "Paper soft", token: "--color-paper-soft", value: "#f3f0eb" },
  { name: "Ink", token: "--color-ink", value: "#161412", dark: true },
  { name: "Ink soft", token: "--color-ink-soft", value: "#4a4642", dark: true },
  { name: "Mute", token: "--color-ink-mute", value: "#6f6a64", dark: true },
  { name: "Hairline", token: "--color-line", value: "rgb(22 20 18 / 0.12)", line: true },
  { name: "Night", token: "--color-night", value: "#161412", dark: true },
  { name: "Olive-gold", token: "--color-accent", value: "#ad9e5d" },
];

export function Colour() {
  return (
    <Section id="colour" title="Colour">
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
        {colours.map((c) => (
          <Swatch key={c.token} {...c} />
        ))}
      </div>
    </Section>
  );
}

// ── Type ────────────────────────────────────────────────────────────────

const scale = [
  { cls: "t-display", size: "44–104px", sample: "Weddings that belong to two worlds", sampleCls: "t-display" },
  { cls: "sectionTitle", size: "32–54px", sample: "Featured vendors", sampleCls: sectionTitle },
  { cls: "t-heading", size: "28–42px", sample: "Eight trays, seven trays", sampleCls: "t-heading" },
  { cls: "t-title", size: "22px", sample: "Sugar Bee Flowers", sampleCls: "t-title" },
  { cls: "t-body", size: "16px", sample: "Celebrants, photographers, florists and musicians who know how to bring two cultures into one day.", sampleCls: "t-body max-w-[52ch]" },
  { cls: "t-small", size: "13px", sample: "Florist, Melbourne · Victoria", sampleCls: "t-small" },
  { cls: "t-nav", size: "12px", sample: "Find vendors", sampleCls: "t-nav" },
];

const scriptOrder: Language[] = ["Cantonese", "Mandarin", "Vietnamese", "Korean", "Japanese", "Thai", "Teochew", "Hakka", "Indonesian", "Filipino"];

export function Type() {
  return (
    <Section id="type" title="Type">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Stage ground="paper" className="flex aspect-[16/10] flex-col justify-between p-[clamp(1.25rem,3vw,2.5rem)]" caption="Names and headlines">
          <p className="font-display text-[clamp(6rem,13vw,12rem)] leading-[0.8] tracking-[-0.04em]">Aa</p>
          <p className="t-title text-[1.75rem]">Boska</p>
        </Stage>
        <Stage ground="paper" className="flex aspect-[16/10] flex-col justify-between p-[clamp(1.25rem,3vw,2.5rem)]" caption="Everything else">
          <p className="font-sans text-[clamp(6rem,13vw,12rem)] leading-[0.8] tracking-[-0.05em]">Aa</p>
          <p className="font-sans text-[1.75rem] leading-tight tracking-[-0.01em]">Switzer</p>
        </Stage>
      </div>

      <div className="border-t hairline">
        {scale.map((s) => (
          <div key={s.cls} className="grid grid-cols-1 gap-x-8 gap-y-2 border-b hairline py-5 md:grid-cols-[minmax(0,1fr)_10rem] md:items-baseline">
            <p className={clsx("min-w-0 text-ink", s.sampleCls)}>{s.sample}</p>
            <p className="flex gap-3 md:justify-end">
              <Token>{s.cls}</Token>
              <span className="t-small tabular-nums">{s.size}</span>
            </p>
          </div>
        ))}
      </div>

      <Stage ground="soft" className="p-[clamp(1.5rem,4vw,3rem)]" caption="Languages, native script first">
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
    </Section>
  );
}

// ── Icons ───────────────────────────────────────────────────────────────

export function Icons() {
  // The public site's set; the admin icons start at "overview".
  const names = iconNames.slice(0, iconNames.indexOf("overview"));
  return (
    <Section id="icons" title="Icons">
      <ul className="grid grid-cols-3 border-t border-l hairline sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
        {names.map((n) => (
          <li key={n} className="flex aspect-[5/4] flex-col items-center justify-center gap-3 border-r border-b hairline p-3 text-center">
            <Icon name={n} className="size-6" />
            <span className="font-mono text-[0.6875rem] text-ink-mute">{n}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
