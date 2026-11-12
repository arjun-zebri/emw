import { SectionHeading } from "@/components/ui/SectionHeading";
import { JournalStories } from "./JournalStories";

/** Three stories side by side, with images, categories and titles all on one line. */
export function Journal() {
  return (
    <section id="blog" className="shell scroll-mt-16 pb-[var(--section)]">
      <SectionHeading lede="The stories behind the traditions, so you can make them your own.">Blog</SectionHeading>
      <JournalStories />
    </section>
  );
}
