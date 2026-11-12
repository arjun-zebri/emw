import { Suspense } from "react";
import { CardsSkeleton } from "@/components/journal/Skeletons";
import { PostCards } from "@/components/journal/PostCards";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getPosts } from "@/lib/journal/posts";

/** The newest stories from the blog: a spread for one, side by side for two or three. Hidden until there's a post. */
export function Journal() {
  return (
    <Suspense
      fallback={
        <section className="shell pb-[var(--section)]">
          <SectionHeading lede="The stories behind the traditions, so you can make them your own.">Blog</SectionHeading>
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
    <section id="blog" className="shell scroll-mt-16 pb-[var(--section)]">
      <SectionHeading lede="The stories behind the traditions, so you can make them your own." link={posts.length > 3 ? { href: "/blog", label: "All stories" } : undefined}>
        Blog
      </SectionHeading>
      <PostCards posts={posts.slice(0, 3)} />
    </section>
  );
}
