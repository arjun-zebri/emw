import clsx from "clsx";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import { type Block, type Photo, type Run, photoUrl, ratioOf } from "@/lib/journal/blocks";
import type { Credit } from "@/lib/journal/posts";

/*
 * A journal post as couples read it, shared by the public journal and the admin's preview so the preview is
 * the real thing. One column: the title, the cover, the words and the photos share the same edges. Photos
 * run at their own shape, never cropped, a row of two or three at one height, across the column unless the
 * editor made them shorter; the vendors in the story close it, as the directory shows them.
 */

export type ArticlePost = {
  title: string;
  standfirst: string;
  category: string;
  cover?: { src: string; alt: string; w?: number; h?: number };
  body: Block[];
  author: string;
  /** The publish date, or nothing yet for a draft. */
  date?: string;
  minutes: number;
};

const dateFmt = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Australia/Melbourne",
});
export const postDate = (iso: string) => dateFmt.format(new Date(iso));

/** The column: 56rem for a story, text and photos alike; a page of the site sets --measure to run full width. */
const TEXT = "mx-auto w-full max-w-[var(--measure,56rem)]";
/** Body text: a touch larger in a story, to read well across the column; a page of the site sets its own. */
const BODY_SIZE = "text-[length:var(--body-size,1.1875rem)]";
/** The two heading sizes in a post, shared with the editor so it writes as it reads. */
export const HEADING_2 = "t-heading text-[clamp(1.625rem,2.2vw,2.125rem)] text-balance";
export const HEADING_3 = "t-title text-[clamp(1.25rem,1.6vw,1.5rem)] text-balance";

/**
 * Where the cover sits in the column, shared with the editor: the column's full width, unless the screen's
 * height (88vh) holds a tall photo narrower, when it lines up with the column's left edge.
 */
export function coverBox(ratio: number): React.CSSProperties {
  return { aspectRatio: ratio, width: `min(100%, calc(88vh * ${ratio}))` };
}

/** `plain`: a page of the site rather than a story (About, the privacy policy): full width, no line of category, date and reading time. */
export function Article({ post, vendors, more, plain }: { post: ArticlePost; vendors: Credit[]; more?: React.ReactNode; plain?: boolean }) {
  // Posts from WordPress carry their cover photo in the body as well; it's already at the top.
  const coverSrc = post.cover?.src;
  const body = post.body.filter((b) => !(b.type === "img" && b.images.length === 1 && coverSrc && photoUrl(b.images[0].src) === coverSrc));
  const by = post.author.trim();

  return (
    <article className="pt-[clamp(2rem,5vw,4.5rem)]" style={plain ? ({ "--measure": "100%", "--body-size": "1.0625rem" } as React.CSSProperties) : undefined}>
      <div className="shell">
        <header className={TEXT}>
          <h1 data-reveal suppressHydrationWarning className="t-display text-[clamp(2.5rem,5.2vw,5rem)] text-balance">
            {post.title || "Untitled"}
          </h1>
          {post.standfirst && (
            <p
              data-reveal
              suppressHydrationWarning
              style={{ "--d": "0.08s" } as React.CSSProperties}
              className="t-body mt-6 max-w-[40ch] text-[clamp(1.125rem,1.5vw,1.3125rem)] leading-[1.5] text-pretty"
            >
              {post.standfirst}
            </p>
          )}
          {!plain && (
            <p data-reveal suppressHydrationWarning style={{ "--d": "0.14s" } as React.CSSProperties} className="t-small mt-6 flex flex-wrap gap-x-2">
              <span>{post.category}</span>
              <span aria-hidden>·</span>
              {post.date ? <time dateTime={post.date}>{postDate(post.date)}</time> : <span>Not yet published</span>}
              <span aria-hidden>·</span>
              <span>{post.minutes} min read</span>
              {by && by !== "East Meets Wed" && (
                <>
                  <span aria-hidden>·</span>
                  <span>{by}</span>
                </>
              )}
            </p>
          )}
        </header>
      </div>

      {post.cover && (
        <figure data-reveal-media suppressHydrationWarning className="shell mt-[clamp(2rem,4vw,3.5rem)]">
          {ratioOf(post.cover) ? (
            <div className={TEXT}>
              <div className="max-sm:w-full!" style={coverBox(ratioOf(post.cover)!)}>
                <Media src={post.cover.src} alt={post.cover.alt || post.title} brief="" quiet sizes="(min-width: 960px) 896px, 100vw" priority className="size-full" />
              </div>
            </div>
          ) : (
            <Frame photo={{ ...post.cover, alt: post.cover.alt || post.title }} sizes="(min-width: 960px) 896px, 100vw" priority className={TEXT} />
          )}
        </figure>
      )}

      <div className={clsx("shell mt-[clamp(2.5rem,5vw,4rem)]", plain && "page-flow")}>
        {body.map((b, i) => (
          <BodyBlock key={b.id} b={b} prev={body[i - 1]} next={body[i + 1]} />
        ))}
      </div>

      {vendors.length > 0 && (
        // The credits, in the article's own column: one line per vendor, however many there are.
        <section className="shell mt-[clamp(4rem,7vw,6rem)]">
          <div className={TEXT}>
            <h2 className="t-title">In this story</h2>
            <ul className="mt-5 border-t hairline">
              {vendors.map((v) => (
                <li key={v.slug} className="border-b hairline">
                  <Link href={`/vendors/${v.slug}`} prefetch className="group flex items-center gap-5 py-4">
                    <span className="block w-16 shrink-0 overflow-hidden sm:w-20">
                      <Media
                        src={v.cover}
                        alt={v.name}
                        brief=""
                        quiet
                        sizes="160px"
                        className="aspect-[4/5] w-full transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.04]"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="t-title block truncate">{v.name}</span>
                      <span className="t-small mt-1 block">{v.discipline}</span>
                    </span>
                    <Icon
                      name="arrow"
                      className="size-4 shrink-0 text-ink-mute transition-[translate,color] duration-500 ease-out-expo group-hover:translate-x-1 group-hover:text-ink"
                      strokeWidth={1.25}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {more}
    </article>
  );
}

function BodyBlock({ b, prev, next }: { b: Block; prev?: Block; next?: Block }) {
  const gap = !prev ? "" : b.type === "h" ? (b.level === 3 ? "mt-10" : "mt-12") : "mt-4";
  if (b.type === "img") {
    // Rows of photos one after another sit together as one slab, with the same gap as within a row
    // (a little more under a caption); text around them keeps its distance.
    const top = !prev ? "mt-0" : prev.type === "img" ? (prev.caption ? "mt-8" : "mt-[clamp(0.5rem,1vw,1rem)]") : "mt-[clamp(2.5rem,4vw,3.5rem)]";
    const bottom = next?.type === "img" ? "mb-0" : "mb-[clamp(2.5rem,4vw,3.5rem)]";
    return <Photos block={b} className={clsx(top, bottom)} />;
  }
  if (b.type === "h")
    return b.level === 3 ? (
      <h3 className={clsx(TEXT, HEADING_3, gap)}>{b.text}</h3>
    ) : (
      <h2 className={clsx(TEXT, HEADING_2, gap)}>{b.text}</h2>
    );
  if (b.type === "ul") {
    const List = b.ordered ? "ol" : "ul";
    return (
      <List className={clsx(TEXT, "t-body space-y-2 leading-[1.75]", BODY_SIZE, gap)}>
        {b.items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span aria-hidden className={clsx("shrink-0 text-ink-mute", b.ordered ? "min-w-5 tabular-nums" : "w-4")}>
              {b.ordered ? `${i + 1}.` : "–"}
            </span>
            <span className="min-w-0">
              <Runs c={item} />
            </span>
          </li>
        ))}
      </List>
    );
  }
  return (
    <p className={clsx(TEXT, "t-body leading-[1.8] text-pretty", BODY_SIZE, gap)}>
      <Runs c={b.content} />
    </p>
  );
}

export function Runs({ c }: { c: Run[] }) {
  return c.map((r, i) => {
    let node: React.ReactNode = r.text;
    if (r.underline) node = <u className="decoration-1 underline-offset-[0.22em]">{node}</u>;
    if (r.italic) node = <em>{node}</em>;
    if (r.bold) node = <strong className="font-medium text-ink">{node}</strong>;
    if (r.href) {
      const internal = r.href.startsWith("/");
      node = internal ? (
        <Link href={r.href} className="text-ink underline decoration-ink/30 decoration-1 underline-offset-[0.22em] transition-colors hover:decoration-ink">
          {node}
        </Link>
      ) : (
        <a
          href={r.href}
          target="_blank"
          rel="noopener"
          className="text-ink underline decoration-ink/30 decoration-1 underline-offset-[0.22em] transition-colors hover:decoration-ink"
        >
          {node}
        </a>
      );
    }
    return <span key={i}>{node}</span>;
  });
}

/** One to three photos at one height, each at its own shape. */
export function Photos({ block, className }: { block: Extract<Block, { type: "img" }>; className?: string }) {
  const many = block.images.length > 1;
  const sum = block.images.reduce((a, p) => a + (ratioOf(p) ?? 3 / 2), 0);
  const ratio = ratioOf(block.images[0]);
  const gaps = `${block.images.length - 1} * clamp(0.5rem, 1vw, 1rem)`;
  // How wide the photos come out: the full measure, unless their height holds them narrower.
  const w = many
    ? block.height
      ? `min(100%, calc(${block.height * sum}px + ${gaps}))`
      : "100%"
    : ratio
      ? `min(100%, calc(${block.height ? `min(88vh, ${block.height}px)` : "88vh"} * ${ratio}))`
      : "100%";
  return (
    <figure data-reveal-media suppressHydrationWarning className={clsx(TEXT, className)}>
      {/* The column's width, or narrower when their height holds them, lined up with its left edge. */}
      <div className="max-sm:ml-0! max-sm:w-full!" style={{ width: w, marginLeft: `max(0px, min((100% - var(--measure, 56rem)) / 2, (100% - ${w}) / 2))` }}>
        <div className="flex gap-[clamp(0.5rem,1vw,1rem)] max-sm:flex-col">
          {block.images.map((p, i) => (
            <Frame
              key={`${p.src}-${i}`}
              photo={{ ...p, src: photoUrl(p.src), alt: p.alt || block.caption }}
              sizes={many ? "(min-width: 960px) 448px, 100vw" : "(min-width: 960px) 896px, 100vw"}
              grow={many}
              tall={block.height}
            />
          ))}
        </div>
        {block.caption && <figcaption className="t-small mt-3">{block.caption}</figcaption>}
      </div>
    </figure>
  );
}

/**
 * A photo held at its own ratio. In a row, `grow` gives each one a share of the width in proportion
 * to its ratio, so they all come out the same height. A photo whose size isn't known shows whole.
 */
function Frame({ photo, sizes, priority, grow, tall, className }: { photo: Photo; sizes: string; priority?: boolean; grow?: boolean; tall?: number; className?: string }) {
  const ratio = ratioOf(photo);
  if (!ratio) {
    return (
      <span className={clsx("block bg-paper-soft", grow && "min-w-0 flex-1", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- photos come straight from Storage, see Media */}
        <img src={photo.src} alt={photo.alt} sizes={sizes} loading={priority ? "eager" : "lazy"} decoding="async" className="block h-auto w-full" />
      </span>
    );
  }
  return (
    <span
      className={clsx("block min-w-0", grow ? "max-sm:w-full max-sm:flex-none!" : "mx-auto", className)}
      style={{
        aspectRatio: ratio,
        ...(grow ? { flex: `${ratio} 1 0%` } : { width: `min(100%, calc(${tall ? `min(88vh, ${tall}px)` : "88vh"} * ${ratio}))` }),
      }}
    >
      <Media src={photo.src} alt={photo.alt} brief="" quiet sizes={sizes} priority={priority} className="size-full" />
    </span>
  );
}
