import { Suspense } from "react";
import { CardsSkeleton } from "@/components/journal/Skeletons";
import { PostCards } from "@/components/journal/PostCards";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getPosts } from "@/lib/journal/posts";

/** The newest stories from the journal: a spread for one, side by side for two or three. Hidden until there's a post. */
export function Journal() {
  return (
    <Suspense
      fallback={
        <section className="shell pb-[var(--section)]">
          <SectionHeading lede="The stories behind the traditions, so you can make them your own.">Journal</SectionHeading>
          <CardsSkeleton />
        </section>
      }
    >
      <Stories />
    </Suspense>
  );
}

async function Stories() {
  const posts = await getPosts();
  if (!posts.length) return null;
  return (
    <section id="journal" className="shell scroll-mt-16 pb-[var(--section)]">
      <SectionHeading lede="The stories behind the traditions, so you can make them your own." link={posts.length > 3 ? { href: "/journal", label: "All stories" } : undefined}>
        Journal
      </SectionHeading>
      <PostCards posts={posts.slice(0, 3)} />
    </section>
  );
}
