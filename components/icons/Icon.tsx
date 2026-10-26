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

  // ── Admin ──
  overview: (
    <>
      <rect x="3.5" y="3.5" width="7" height="9" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1" />
      <rect x="3.5" y="15.5" width="7" height="5" rx="1" />
    </>
  ),
  trend: <path d="M3.5 17.5 9 12l3.5 3.5 8-8M15 7.5h5.5V13" />,
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.8 9.2c-.5-.9-1.5-1.4-2.8-1.4-1.6 0-2.7.8-2.7 2s1 1.7 2.7 2.1c1.8.4 2.9 1 2.9 2.2 0 1.3-1.2 2.1-2.9 2.1-1.4 0-2.5-.6-3-1.5M12 6v1.8m0 8.4V18" />
    </>
  ),
  store: (
    <>
      <path d="M4 9.5V20h16V9.5" />
      <path d="M3 9.5 5 4h14l2 5.5c0 1.4-1.1 2.5-2.5 2.5S16 10.9 16 9.5c0 1.4-1.1 2.5-2.5 2.5h-3C9.1 12 8 10.9 8 9.5 8 10.9 6.9 12 5.5 12S3 10.9 3 9.5Z" />
      <path d="M10 20v-4.5h4V20" />
    </>
  ),
  pen: <path d="M14.5 5.5 18.5 9.5M4 20l1-4.5L16 4.5a1.4 1.4 0 0 1 2 0l1.5 1.5a1.4 1.4 0 0 1 0 2L8.5 19 4 20Z" />,
  inbox: (
    <>
      <path d="M3.5 13.5 6 5h12l2.5 8.5V19a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z" />
      <path d="M3.5 13.5H8.5l1 2.5h5l1-2.5h5" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  cog: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2m0 12.6v2.2M3.5 12h2.2m12.6 0h2.2M6 6l1.6 1.6m8.8 8.8L18 18M6 18l1.6-1.6m8.8-8.8L18 6" />
    </>
  ),
  external: <path d="M13.5 4.5h6v6M19.5 4.5 11 13M10 6H5.5a1 1 0 0 0-1 1v11.5a1 1 0 0 0 1 1H17a1 1 0 0 0 1-1V14" />,
  "chevron-down": <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />,
  "chevron-right": <path d="m9.5 6.5 5.5 5.5-5.5 5.5" />,
  "chevron-left": <path d="M14.5 6.5 9 12l5.5 5.5" />,
  more: (
    <>
      <circle cx="5.5" cy="12" r=".9" fill="currentColor" />
      <circle cx="12" cy="12" r=".9" fill="currentColor" />
      <circle cx="18.5" cy="12" r=".9" fill="currentColor" />
    </>
  ),
  logout: <path d="M14 4.5H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h8M10 12h10.5M17 8.5l3.5 3.5-3.5 3.5" />,
  upload: <path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9M4.5 15v4.5h15V15" />,
  download: <path d="M12 4.5v11M7.5 11l4.5 4.5 4.5-4.5M4.5 15v4.5h15V15" />,
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m4 18 5-5 3.5 3.5L16 13l4.5 4.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  pointer: <path d="m6 4 12.5 6.2-5.6 1.7-1.7 5.6Z M13.5 13.5l5 5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4 21 19.5H3z" />
      <path d="M12 10v4.5m0 2.3v.2" />
    </>
  ),
  star: <path d="m12 3.8 2.5 5.3 5.7.7-4.2 3.9 1.1 5.7-5.1-2.8-5.1 2.8 1.1-5.7-4.2-3.9 5.7-.7z" />,
  trash: <path d="M4.5 6.5h15M9.5 6.5v-2h5v2M6.5 6.5l1 13h9l1-13M10.5 10.5v6m3-6v6" />,
  refresh: <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />,
  card: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
      <path d="M3 10h18M6.5 15h3" />
    </>
  ),
  pulse: <path d="M3 12h4l2-5 4 10 2-5h6" />,
  text: <path d="M5 6.5V5h14v1.5M12 5v14m-3 0h6" />,
  heading: <path d="M6 5v14M18 5v14M6 12h12" />,
  grip: (
    <>
      <circle cx="9" cy="7" r=".9" fill="currentColor" />
      <circle cx="15" cy="7" r=".9" fill="currentColor" />
      <circle cx="9" cy="12" r=".9" fill="currentColor" />
      <circle cx="15" cy="12" r=".9" fill="currentColor" />
      <circle cx="9" cy="17" r=".9" fill="currentColor" />
      <circle cx="15" cy="17" r=".9" fill="currentColor" />
    </>
  ),
  "arrow-up": <path d="M12 20.5V3.5M6 9.5l6-6 6 6" />,
  "arrow-down": <path d="M12 3.5v17M6 14.5l6 6 6-6" />,
  send: <path d="M20.5 3.5 10 14M20.5 3.5l-6.5 17-4-6.5-6.5-4z" />,

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
