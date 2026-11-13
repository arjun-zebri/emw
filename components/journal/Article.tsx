import clsx from "clsx";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import { type Block, type Photo, type Run, photoUrl, ratioOf } from "@/lib/journal/blocks";
import type { Credit } from "@/lib/journal/posts";

/*
 * A journal post as couples read it, shared by the public journal and the admin's preview so the preview is
 * the real thing. A narrow column of text on the paper; photos run at their own shape, never
 * cropped, a row of two or three at one height, across the page unless the editor
 * made them shorter; the vendors in the story close it, as the directory shows them.
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

const TEXT = "mx-auto w-full max-w-[42rem]";
/** The two heading sizes in a post, shared with the editor so it writes as it reads. */
export const HEADING_2 = "t-heading text-[clamp(1.625rem,2.2vw,2.125rem)] text-balance";
export const HEADING_3 = "t-title text-[clamp(1.25rem,1.6vw,1.5rem)] text-balance";

export function Article({ post, vendors, more }: { post: ArticlePost; vendors: Credit[]; more?: React.ReactNode }) {
  // Posts from WordPress carry their cover photo in the body as well; it's already at the top.
  const coverSrc = post.cover?.src;
  const body = post.body.filter((b) => !(b.type === "img" && b.images.length === 1 && coverSrc && photoUrl(b.images[0].src) === coverSrc));
  const by = post.author.trim();

  return (
    <article className="pt-[clamp(2rem,5vw,4.5rem)]">
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
        </header>
      </div>

      {post.cover && (
        <figure data-reveal-media suppressHydrationWarning className="shell mt-[clamp(2rem,4vw,3.5rem)]">
          <Frame photo={{ ...post.cover, alt: post.cover.alt || post.title }} sizes="(min-width: 1440px) 1300px, 100vw" priority className="max-w-[81.25rem]" />
        </figure>
      )}

      <div className="shell mt-[clamp(2.5rem,5vw,4rem)]">
        {body.map((b, i) => (
          <BodyBlock key={b.id} b={b} prev={body[i - 1]} />
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

function BodyBlock({ b, prev }: { b: Block; prev?: Block }) {
  const gap = !prev ? "" : b.type === "h" ? (b.level === 3 ? "mt-10" : "mt-12") : "mt-4";
  if (b.type === "img") return <Photos block={b} className={prev ? "my-[clamp(2.5rem,4vw,3.5rem)]" : "mb-[clamp(2.5rem,4vw,3.5rem)]"} />;
  if (b.type === "h")
    return b.level === 3 ? (
      <h3 className={clsx(TEXT, HEADING_3, gap)}>{b.text}</h3>
    ) : (
      <h2 className={clsx(TEXT, HEADING_2, gap)}>{b.text}</h2>
    );
  if (b.type === "ul") {
    const List = b.ordered ? "ol" : "ul";
    return (
      <List className={clsx(TEXT, "t-body space-y-2 text-[1.0625rem] leading-[1.75]", gap)}>
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
    <p className={clsx(TEXT, "t-body text-[1.0625rem] leading-[1.8] text-pretty", gap)}>
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
    <figure data-reveal-media suppressHydrationWarning className={clsx("mx-auto w-full max-w-[64rem]", className)}>
      {/* Narrower than the measure, they line up with the text's left edge, as far as they fit. */}
      <div className="max-sm:ml-0! max-sm:w-full!" style={{ width: w, marginLeft: `max(0px, min((100% - 42rem) / 2, 100% - ${w}))` }}>
        <div className="flex gap-[clamp(0.5rem,1vw,1rem)] max-sm:flex-col">
          {block.images.map((p, i) => (
            <Frame
              key={`${p.src}-${i}`}
              photo={{ ...p, src: photoUrl(p.src), alt: p.alt || block.caption }}
              sizes={many ? "(min-width: 1024px) 34vw, 100vw" : "(min-width: 1024px) 64rem, 100vw"}
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
