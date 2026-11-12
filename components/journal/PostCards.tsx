import clsx from "clsx";
import Link from "next/link";
import { Media } from "@/components/media/Media";
import type { LivePost } from "@/lib/journal/posts";

/*
 * Posts as cards: the photo, the title, one line. However many there are, the row is full: one post
 * is a spread (photo beside its title and standfirst), two share the width, three or more sit in the
 * directory's grid.
 */

export function PostCards({ posts, lead = true, className }: { posts: LivePost[]; lead?: boolean; className?: string }) {
  if (!posts.length) return null;
  const [first, ...rest] = posts;
  const spread = lead && (posts.length === 1 || posts.length > 3);
  const grid = spread ? rest : posts;
  return (
    <div className={className}>
      {spread && <Spread post={first} />}
      {grid.length > 0 && (
        <ul
          className={clsx(
            "grid grid-cols-1 gap-x-[clamp(1rem,1.6vw,1.5rem)] gap-y-12",
            grid.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3",
            spread && "mt-[clamp(3rem,6vw,5rem)]",
          )}
        >
          {grid.map((p, i) => (
            <li key={p.id} data-reveal suppressHydrationWarning style={{ "--d": `${(i % 3) * 0.08}s` } as React.CSSProperties}>
              <PostCard post={p} aspect={grid.length === 2 ? "aspect-[3/2]" : "aspect-[4/5]"} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PostCard({ post, aspect = "aspect-[4/5]" }: { post: LivePost; aspect?: string }) {
  return (
    <Link href={`/blog/${post.slug}`} prefetch className="group block">
      <span className="block overflow-hidden">
        <Media
          src={post.cover?.src}
          alt={post.cover?.alt ?? ""}
          brief=""
          quiet
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className={clsx(aspect, "w-full transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.03]")}
        />
      </span>
      <span className="t-title mt-4 block text-balance">{post.title}</span>
      <span className="t-small mt-1.5 block">
        {post.category} · {post.minutes} min read
      </span>
    </Link>
  );
}

function Spread({ post }: { post: LivePost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      prefetch
      data-reveal
      suppressHydrationWarning
      className="group grid grid-cols-1 items-end gap-x-[clamp(1.5rem,4vw,4.5rem)] gap-y-6 lg:grid-cols-12"
    >
      <span className="block overflow-hidden lg:col-span-7">
        <Media
          src={post.cover?.src}
          alt={post.cover?.alt ?? ""}
          brief=""
          quiet
          sizes="(min-width: 1024px) 58vw, 100vw"
          className="aspect-[3/2] w-full transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.03]"
        />
      </span>
      <span className="block lg:col-span-5 lg:pb-2">
        <span className="t-heading block text-balance">{post.title}</span>
        {(post.standfirst || post.description) && <span className="t-body mt-4 block max-w-[40ch] text-pretty">{post.standfirst || post.description}</span>}
        <span className="t-small mt-5 block">
          {post.category} · {post.minutes} min read
        </span>
      </span>
    </Link>
  );
}
