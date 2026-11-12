import type { Metadata } from "next";
import { Suspense } from "react";
import { BlogSkeleton } from "@/components/journal/Skeletons";
import { PostCards } from "@/components/journal/PostCards";
import { PageTransition } from "@/components/motion/PageTransition";
import { getPosts } from "@/lib/journal/posts";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Blog",
  description: "Stories of weddings that bring two cultures together: the traditions, the planning and the vendors who make them happen.",
  path: "/blog",
});

export default function BlogPage() {
  return (
    <PageTransition>
      <div className="shell pt-[calc(var(--header-h)+clamp(3rem,8vw,6rem))] pb-[clamp(6rem,12vw,10rem)]">
        <h1 data-intro-in className="t-display">
          Blog
        </h1>
        <p data-intro-in style={{ "--d": "0.12s" } as React.CSSProperties} className="t-body mt-6 mb-[clamp(2.5rem,5vw,4rem)] max-w-[48ch]">
          The stories behind the traditions, so you can make them your own.
        </p>
        <Suspense fallback={<BlogSkeleton />}>
          <Posts />
        </Suspense>
      </div>
    </PageTransition>
  );
}

async function Posts() {
  const posts = await getPosts();
  if (!posts.length) return <p className="t-body">The first stories are on their way.</p>;
  return <PostCards posts={posts} />;
}
