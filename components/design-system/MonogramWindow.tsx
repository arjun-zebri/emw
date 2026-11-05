import clsx from "clsx";
import { getImageProps } from "next/image";
import { LOGO_VIEWBOX, MONOGRAM_HEIGHT, monogramPaths } from "@/components/brand/logo-paths";

/**
 * The monogram as a window onto a photograph, as in the landing-page intro: the letters are cut
 * out and the photo shows through them. `evenodd` keeps the heart in the W and the counters open.
 */
export function MonogramWindow({ src, className, label }: { src: string; className?: string; label?: string }) {
  const id = `mw-${src.replace(/[^a-z0-9]/gi, "")}`;
  const { props } = getImageProps({ src, alt: "", width: 1600, height: 1067, quality: 80 });
  return (
    <svg
      viewBox={`0 0 ${LOGO_VIEWBOX.width} ${MONOGRAM_HEIGHT}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={clsx("block h-auto w-full", className)}
    >
      <defs>
        <clipPath id={id}>
          {Object.values(monogramPaths).map((d, i) => (
            <path key={i} d={d} clipRule="evenodd" />
          ))}
        </clipPath>
      </defs>
      <image href={props.src} width={LOGO_VIEWBOX.width} height={MONOGRAM_HEIGHT} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`} />
    </svg>
  );
}
