import { Media } from "@/components/media/Media";
import { LOGO_VIEWBOX, MONOGRAM_HEIGHT, monogramPaths, taglinePaths } from "@/components/brand/logo-paths";

// Monogram placement in the 1000×1000 sheet (preserveAspectRatio slice keeps it centred and in proportion).
const W = 360;
const X = 500 - W / 2;
const Y = 436;
const letters = [
  { d: monogramPaths.E, dx: -70 },
  { d: monogramPaths.M, dx: 0 },
  { d: monogramPaths.W, dx: 70 },
];

/*
 * Landing-page intro, pure CSS so it plays before hydration (see `.intro` in globals.css).
 * A cream sheet, continuous with the page, with the EMW monogram cut out of it so the hero photo
 * shows through the letters. E arrives from the left and W from the right as M rises; the photo
 * drifts inside them; the tagline settles in beneath. Then the monogram leans in and dissolves
 * into the cream, and the hero unveils the same photo in its own column.
 */
export function Intro({ src, position }: { src?: string; position?: string }) {
  return (
    <div className="intro" aria-hidden>
      <Media src={src} alt="" brief="" tone="dark" priority sizes="100vw" position={position} className="intro__photo" />
      <svg className="intro__sheet" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
        <defs>
          <mask id="intro-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000">
            <rect width="1000" height="1000" fill="white" />
            <g className="intro__zoom">
              <svg x={X} y={Y} width={W} height={W * (MONOGRAM_HEIGHT / LOGO_VIEWBOX.width)} viewBox={`0 0 ${LOGO_VIEWBOX.width} ${MONOGRAM_HEIGHT}`} overflow="visible" fillRule="evenodd">
                {letters.map((l, i) => (
                  <path key={i} d={l.d} fill="black" className="intro__letter" style={{ "--i": i, "--dx": `${l.dx}px` } as React.CSSProperties} />
                ))}
              </svg>
            </g>
          </mask>
        </defs>
        <rect width="1000" height="1000" fill="var(--color-paper)" mask="url(#intro-mask)" />
      </svg>
      <svg className="intro__tagline" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
        <svg x={X} y={Y} width={W} height={W * (LOGO_VIEWBOX.height / LOGO_VIEWBOX.width)} viewBox={`0 0 ${LOGO_VIEWBOX.width} ${LOGO_VIEWBOX.height}`} overflow="visible" fillRule="evenodd">
          {taglinePaths.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="var(--color-ink)"
              className="intro__tag"
              style={{ "--i": Math.abs(i - (taglinePaths.length - 1) / 2), "--dx": `${(i - (taglinePaths.length - 1) / 2) * 9}px` } as React.CSSProperties}
            />
          ))}
        </svg>
      </svg>
    </div>
  );
}

