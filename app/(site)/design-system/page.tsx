import type { Metadata } from "next";
import { Accessibility, Admin, Writing } from "@/components/design-system/guidance";
import { Colour, Layout, LogoChapter, Principles, Type } from "@/components/design-system/foundations";
import { Icons, Motion, Photography } from "@/components/design-system/imagery";
import { Index } from "@/components/design-system/Index";
import { Components, Patterns } from "@/components/design-system/kit";
import { Media } from "@/components/media/Media";
import { PageTransition } from "@/components/motion/PageTransition";
import { siteImages } from "@/data/images";

export const metadata: Metadata = {
  title: "Design system",
  description: "How East Meets Wed looks, moves and speaks.",
  robots: { index: false, follow: false },
};

const chapters = [
  { id: "principles", label: "Principles" },
  { id: "logo", label: "Logo" },
  { id: "colour", label: "Colour" },
  { id: "type", label: "Type" },
  { id: "layout", label: "Layout" },
  { id: "photography", label: "Photography" },
  { id: "icons", label: "Icons" },
  { id: "motion", label: "Motion" },
  { id: "components", label: "Components" },
  { id: "patterns", label: "Patterns" },
  { id: "writing", label: "Writing" },
  { id: "admin", label: "Admin" },
  { id: "accessibility", label: "Accessibility" },
];

/*
 * The design system as a live page. Every example is the site's own component or token, so the
 * page can't drift from the product. Not linked from the site and kept out of search.
 */
export default function DesignSystemPage() {
  return (
    <PageTransition>
      <div className="shell pt-[calc(var(--header-h)+clamp(3rem,8vw,6rem))] pb-[clamp(4rem,8vw,6rem)]">
        <header className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-12 md:items-end">
          <h1 data-intro-in className="t-display md:col-span-7">
            Design system
          </h1>
          <div data-intro-in style={{ "--d": "0.1s" } as React.CSSProperties} className="md:col-span-5 md:pb-2">
            <p className="t-body max-w-[42ch]">How East Meets Wed looks, moves and speaks. Everything shown here is the live site, so this page is always current.</p>
            <p className="t-small mt-4">Version 1.0, November 2026</p>
          </div>
        </header>

        <div data-reveal-media suppressHydrationWarning className="mt-[clamp(2.5rem,5vw,4rem)]">
          <Media {...siteImages.cover} priority sizes="100vw" position="42% 45%" className="aspect-[4/5] w-full sm:aspect-[21/9]" />
        </div>
        <p className="t-small mt-3">Melbourne Harp Piano</p>

        <div className="mt-[clamp(3rem,6vw,5rem)] grid grid-cols-1 gap-x-[clamp(2rem,4vw,4rem)] lg:grid-cols-[11rem_minmax(0,1fr)]">
          <aside className="mb-12 lg:mb-0">
            <div className="lg:sticky lg:top-[calc(var(--header-h)+2.5rem)] lg:pt-[clamp(2.5rem,5vw,4rem)]">
              <Index items={chapters} />
            </div>
          </aside>
          <div className="min-w-0">
            <Principles />
            <LogoChapter />
            <Colour />
            <Type />
            <Layout />
            <Photography />
            <Icons />
            <Motion />
            <Components />
            <Patterns />
            <Writing />
            <Admin />
            <Accessibility />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
