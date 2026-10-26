import clsx from "clsx";
import type { CraftId } from "@/data/types";

/*
 * A small custom icon set: 24px grid, 1.25 stroke, round joins.
 * Craft icons are drawn as objects from the day itself rather than generic UI glyphs.
 */
const paths = {
  // ── UI ──
  arrow: <path d="M3 12h17.5M14.5 6l6 6-6 6" />,
  "arrow-left": <path d="M21 12H3.5M9.5 6l-6 6 6 6" />,
  "arrow-up-right": <path d="M7 17 17.5 6.5M8.5 6.5h9v9" />,
  // A slender heart, after the one in the W of the EMW monogram.
  heart: <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" />,
  plus: <path d="M12 4.5v15M4.5 12h15" />,
  minus: <path d="M4.5 12h15" />,
  close: <path d="m5.5 5.5 13 13m0-13-13 13" />,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  menu: <path d="M3 8.5h18M3 15.5h18" />,
  filter: (
    <>
      <path d="M3 7h10m4 0h4M3 17h4m4 0h10" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.8" r="2.2" />
    </>
  ),
  speech: (
    <>
      <path d="M3.5 5.5h11v8h-6l-3.5 3v-3H3.5z" />
      <path d="M17.5 9.5h3v8h-1.5v3l-3.5-3h-5v-1.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="1" />
      <path d="m3.5 6.5 8.5 7 8.5-7" />
    </>
  ),
  phone: <path d="M8.2 3.5 10 7.8 7.9 9.4a11 11 0 0 0 6.7 6.7l1.6-2.1 4.3 1.8-.6 3.4a1.5 1.5 0 0 1-1.6 1.2C10.2 19.7 4.3 13.8 3.7 5.7A1.5 1.5 0 0 1 4.9 4.1Z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.3 3.5 5.2 3.5 8.5s-1.1 6.2-3.5 8.5c-2.4-2.3-3.5-5.2-3.5-8.5s1.1-6.2 3.5-8.5Z" />
    </>
  ),
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r=".6" fill="currentColor" />
    </>
  ),
  facebook: <path d="M14.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4a21 21 0 0 0-2.4-.1c-2.4 0-4 1.4-4 4.1v2.1H8.6v3h2.7V21" />,
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
      <path d="m10 9.2 5 2.8-5 2.8z" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="1" />
      <path d="M3.5 10h17M8 3v4m8-4v4" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
      <path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M17.5 14.8c2 .6 3.4 2.4 4 5.2" />
    </>
  ),
  sparkle: <path d="M12 3c.6 4.8 2.2 6.4 7 7-4.8.6-6.4 2.2-7 7-.6-4.8-2.2-6.4-7-7 4.8-.6 6.4-2.2 7-7Z" />,

  // ── Crafts ──
  // An arbour: the frame every ceremony stands under.
  ceremony: (
    <>
      <path d="M5 21V10.5a7 7 0 0 1 14 0V21" />
      <path d="M8 21v-9.8a4 4 0 0 1 8 0V21" />
      <path d="M2.5 21h19" />
    </>
  ),
  // A rangefinder: lens, shutter, viewfinder.
  "photo-film": (
    <>
      <rect x="2.5" y="6.5" width="19" height="13" rx="1.5" />
      <circle cx="12" cy="13" r="3.8" />
      <path d="M7.5 6.5 9 4h6l1.5 2.5M5.5 9.5h1.5" />
    </>
  ),
  // A hand mirror with a comb's teeth along the handle.
  "beauty-attire": (
    <>
      <ellipse cx="12" cy="8.5" rx="5.5" ry="6" />
      <path d="M12 14.5V21M10.5 17.5h3" />
      <path d="M9.5 6.2a3 3 0 0 1 2.5-1.7" />
    </>
  ),
  // A single stem with a leaf and an open bloom.
  "flowers-paper": (
    <>
      <path d="M12 21v-9.5" />
      <path d="M12 11.5c-3.4 0-5-2.4-5-6.5 2.2 0 3.8.9 5 2.6 1.2-1.7 2.8-2.6 5-2.6 0 4.1-1.6 6.5-5 6.5Z" />
      <path d="M12 17.5c-.4-2.6-2.2-4-5-4 .3 2.6 2.1 4 5 4Z" />
    </>
  ),
  // Two strings and a bridge, read as a lute neck or a pipa.
  "music-performance": (
    <>
      <path d="M14.5 3.5 9 15" />
      <path d="M8.2 13.4a4.2 4.2 0 1 0 3.3 4.9c.3-1.7-.2-3.3-1.3-4.3" />
      <path d="M13.2 3l3.4 1.6M6 18.5l3-1.4" />
    </>
  ),
} satisfies Record<string, React.ReactNode>;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  className,
  strokeWidth = 1.25,
  title,
}: {
  name: IconName | CraftId;
  className?: string;
  strokeWidth?: number;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={clsx("size-5 shrink-0", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      {paths[name]}
    </svg>
  );
}
