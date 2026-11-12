import clsx from "clsx";

/**
 * A placeholder block for content that is still loading, sized by the caller to the exact shape
 * of what's coming: a photo at its ratio, a bar the height of a line of text. Every loading state
 * in the app uses it (CLAUDE.md, Design rules), never a spinner, a blank or "Loading…".
 */
export function Skeleton({ className, style, night }: { className?: string; style?: React.CSSProperties; /** On the dark footer or a photo. */ night?: boolean }) {
  return <span aria-hidden className={clsx("skeleton block", night && "skeleton-night", className)} style={style} />;
}

/** Lines of text: full bars with a shorter last one, at the given line height. */
export function SkeletonLines({ lines = 2, className, lineClassName = "h-[0.9em]" }: { lines?: number; className?: string; lineClassName?: string }) {
  return (
    <span aria-hidden className={clsx("block space-y-[0.55em]", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={clsx(lineClassName, i === lines - 1 && lines > 1 ? "w-3/5" : "w-full")} />
      ))}
    </span>
  );
}
