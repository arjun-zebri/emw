import clsx from "clsx";
import Image from "next/image";
import { SHOW_IMAGE_BRIEFS } from "@/lib/config";

/*
 * Every image slot on the site. With `src` it renders a next/image; without, a grey placeholder
 * captioned with the shot the slot is waiting for.
 */

// Close neutral greys so neighbouring slots stay distinguishable.
const greys = ["#d3d2cf", "#c9c8c5", "#dbdad7", "#c1c0bc"];
const DARK = "#8d8b87"; // for slots that carry light text, as a photo would

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export type MediaProps = {
  src?: string;
  alt: string;
  /** Art direction for the shot; shown on the placeholder until a real image is set. */
  brief: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Placeholder shade: index into the greys, or "dark" for slots with text on top. */
  tone?: number | "dark";
  /** Hide the caption on small slots. */
  quiet?: boolean;
  /** CSS object-position for the crop, e.g. "70% 50%". */
  position?: string;
};

export function Media({ src, alt, brief, className, sizes = "100vw", priority, tone, quiet, position }: MediaProps) {
  if (src) {
    return (
      <span className={clsx("relative block overflow-hidden bg-paper-soft", className)}>
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" style={position ? { objectPosition: position } : undefined} />
      </span>
    );
  }

  const dark = tone === "dark";
  const bg = dark ? DARK : greys[(typeof tone === "number" ? tone : hash(alt + brief)) % greys.length];

  return (
    <span role="img" aria-label={alt} className={clsx("relative block overflow-hidden", className)} style={{ background: bg }}>
      {SHOW_IMAGE_BRIEFS && !quiet && (
        <span
          className={clsx(
            "absolute max-w-[36ch] p-[clamp(0.75rem,2.5%,1.25rem)] text-[0.6875rem] leading-snug",
            // Dark slots carry text and the header, so their note sits top-centre below the header.
            dark ? "top-[var(--header-h)] left-1/2 -translate-x-1/2 text-center text-paper/60" : "top-0 left-0 text-ink/45",
          )}
        >
          {brief}
        </span>
      )}
    </span>
  );
}
