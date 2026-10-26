"use client";

import { Media } from "@/components/media/Media";
import { publishedPosts, useAdmin } from "@/lib/admin/store";

/**
 * The three newest published posts from the admin's journal. The server renders the seed, and a
 * post published in /admin appears as soon as the page hydrates (or straight away in an open tab).
 */
export function JournalStories() {
  const stories = publishedPosts(useAdmin().posts).slice(0, 3);
  return (
    <div className="grid grid-cols-1 gap-x-[clamp(1rem,1.6vw,1.5rem)] gap-y-10 md:grid-cols-3">
      {stories.map((story, i) => (
        <article key={story.id} data-reveal suppressHydrationWarning style={{ "--d": `${i * 0.08}s` } as React.CSSProperties} className="group">
          <div className="overflow-hidden">
            <Media
              src={story.cover.src}
              alt={story.cover.alt}
              brief=""
              sizes="(min-width: 768px) 33vw, 100vw"
              className="aspect-[4/5] w-full transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.03]"
            />
          </div>
          <p className="t-small mt-4">{story.category}</p>
          <h3 className="t-title mt-1">{story.title}</h3>
        </article>
      ))}
    </div>
  );
}
