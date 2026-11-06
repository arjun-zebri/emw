import clsx from "clsx";
import { type Inline, parseBlock, type StoryBlock } from "@/lib/story";

/**
 * A vendor's story as the vendor page sets it: body paragraphs, the occasional small Boska
 * subheading, and quiet lists with a short dash rather than bullets; bold is medium weight. See lib/story.ts for the marks.
 */
export function Story({ blocks, className }: { blocks: string[]; className?: string }) {
  return <div className={clsx("t-body text-ink", className)}>{blocks.map((raw, i) => <Block key={i} b={parseBlock(raw)} first={i === 0} />)}</div>;
}

export function Block({ b, first }: { b: StoryBlock; first?: boolean }) {
  if (b.type === "h") return <h3 className={clsx("t-title text-[1.25rem]", first ? "mt-0" : "mt-8")}>{b.text}</h3>;
  if (b.type === "p") return <p className={first ? "" : "mt-4"}><Runs c={b.content} /></p>;
  const List = b.type === "ul" ? "ul" : "ol";
  return (
    <List className={clsx("space-y-1.5", first ? "" : "mt-4")}>
      {b.items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden className="w-4 shrink-0 text-ink-mute tabular-nums">
            {b.type === "ul" ? "–" : i + 1}
          </span>
          <span className="min-w-0">
            <Runs c={item} />
          </span>
        </li>
      ))}
    </List>
  );
}

function Runs({ c }: { c: Inline }) {
  return c.map((r, i) => {
    const marks = clsx(r.bold && "font-medium", r.italic && "italic", r.underline && "underline decoration-1 underline-offset-[0.2em]");
    return r.bold ? (
      <strong key={i} className={marks}>
        {r.text}
      </strong>
    ) : (
      <span key={i} className={marks || undefined}>
        {r.text}
      </span>
    );
  });
}
