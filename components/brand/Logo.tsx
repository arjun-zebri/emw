import clsx from "clsx";
import { LOGO_VIEWBOX, MONOGRAM_HEIGHT, monogramPaths, taglinePaths } from "./logo-paths";

/** The EMW monogram on its own, for the header and small brand moments. Inherits currentColor. */
export function Monogram({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox={`0 0 ${LOGO_VIEWBOX.width} ${MONOGRAM_HEIGHT}`}
      fill="currentColor"
      fillRule="evenodd"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      className={clsx("block h-auto shrink-0", className)}
    >
      {title && <title>{title}</title>}
      <path d={monogramPaths.E} />
      <path d={monogramPaths.M} />
      <path d={monogramPaths.W} />
    </svg>
  );
}

/** The full lockup: monogram over the spaced "East Meets Wed" tagline. */
export function Logo({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox={`0 0 ${LOGO_VIEWBOX.width} ${LOGO_VIEWBOX.height}`}
      fill="currentColor"
      fillRule="evenodd"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      className={clsx("block h-auto shrink-0", className)}
    >
      {title && <title>{title}</title>}
      <path d={monogramPaths.E} />
      <path d={monogramPaths.M} />
      <path d={monogramPaths.W} />
      {taglinePaths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
