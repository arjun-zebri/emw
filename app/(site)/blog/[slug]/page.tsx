import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { Article } from "@/components/journal/Article";
import { PostCards } from "@/components/journal/PostCards";
import { PostSkeleton } from "@/components/journal/Skeletons";
import { PageTransition } from "@/components/motion/PageTransition";
import { JsonLd } from "@/components/site/JsonLd";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getPost, getPosts, morePosts } from "@/lib/journal/posts";
import { postLd, postMeta } from "@/lib/seo";

export async function generateStaticParams() {
  const posts = await getPosts();
  // At least one, so the route prerenders even before the first post.
  return posts.length ? posts.map((p) => ({ slug: p.slug })) : [{ slug: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const found = await getPost((await params).slug);
  return found ? postMeta(found.post) : {};
}

export default function PostPage({ params }: PageProps<"/blog/[slug]">) {
  return (
    <PageTransition>
      <div className="pt-[var(--header-h)] pb-[clamp(6rem,12vw,10rem)]">
        <Suspense fallback={<PostSkeleton />}>
          <Post params={params} />
        </Suspense>
      </div>
    </PageTransition>
  );
}

async function Post({ params }: { params: PageProps<"/blog/[slug]">["params"] }) {
  const { slug } = await params;
  const [found, posts] = await Promise.all([getPost(slug), getPosts()]);
  if (!found) notFound();
  // An address the post had before: send the link on to where it lives now.
  if (found.moved) permanentRedirect(`/blog/${found.post.slug}`);
  const { post } = found;
  const more = morePosts(posts, post);

  return (
    <>
      <JsonLd data={postLd(post)} />
      <Article
        post={{ ...post, date: post.publishedAt }}
        vendors={post.vendors}
        more={
          more.length > 0 && (
            <section className="shell mt-[var(--section)]">
              <SectionHeading link={{ href: "/blog", label: "All stories" }} className="pt-8">
                Keep reading
              </SectionHeading>
              <PostCards posts={more} lead={false} />
            </section>
          )
        }
      />
    </>
  );
}
