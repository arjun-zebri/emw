import type { Metadata } from "next";
import { Colour, Icons, LogoSection, Type } from "@/components/design-system/foundations";
import { Index } from "@/components/design-system/Index";
import { Buttons, Card, Details, Filters, Forms, Header, Heading, Loading } from "@/components/design-system/kit";
import { PageTransition } from "@/components/motion/PageTransition";

export const metadata: Metadata = {
  title: "Design system",
  description: "The building blocks of East Meets Wed.",
  robots: { index: false, follow: false },
};

const sections = [
  { id: "logo", label: "Logo" },
  { id: "colour", label: "Colour" },
  { id: "type", label: "Type" },
  { id: "icons", label: "Icons" },
  { id: "buttons", label: "Buttons and links" },
  { id: "header", label: "Header" },
  { id: "heading", label: "Section heading" },
  { id: "card", label: "Vendor card" },
  { id: "loading", label: "Loading" },
  { id: "forms", label: "Forms" },
  { id: "filters", label: "Filters" },
  { id: "details", label: "Vendor details" },
];

/*
 * The site's building blocks, each shown as the live component or token, so the page can't drift
 * from the product. Not linked from the site and kept out of search.
 */
export default function DesignSystemPage() {
  return (
    <PageTransition>
      <div className="shell pt-[calc(var(--header-h)+clamp(3rem,7vw,5rem))] pb-[clamp(3rem,6vw,5rem)]">
        <h1 data-intro-in className="t-display">
          Design system
        </h1>

        <div className="mt-[clamp(2.5rem,5vw,4rem)] grid grid-cols-1 gap-x-[clamp(2rem,4vw,4rem)] lg:grid-cols-[11rem_minmax(0,1fr)]">
          <aside className="mb-10 lg:mb-0">
            <div className="lg:sticky lg:top-[calc(var(--header-h)+2.5rem)] lg:pt-6">
              <Index items={sections} />
            </div>
          </aside>
          <div className="min-w-0">
            <LogoSection />
            <Colour />
            <Type />
            <Icons />
            <Buttons />
            <Header />
            <Heading />
            <Card />
            <Loading />
            <Forms />
            <Filters />
            <Details />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
