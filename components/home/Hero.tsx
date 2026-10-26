import { Media } from "@/components/media/Media";
import { Intro } from "@/components/motion/Intro";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { siteImages } from "@/data/images";

const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;
const position = "42% 50%";

/*
 * Editorial split: a cream panel with the headline beside the photo (the photo sits above the
 * text on mobile). The intro's cream is the panel's cream: as its monogram dissolves, the photo
 * it showed through the letters is unveiled here in its column (`.hero-curtain`).
 */
export function Hero() {
  return (
    <section id="hero" className="relative h-[100svh] min-h-[38rem] overflow-hidden">
      <div className="hero-curtain absolute inset-x-0 top-0 bottom-[46%] overflow-hidden lg:bottom-0 lg:left-[41.6667%]">
        <div className="hero-media size-full">
          <Media {...siteImages.cover} tone="dark" priority sizes="(min-width: 1024px) 60vw, 100vw" className="size-full" position={position} />
        </div>
        <span className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-night/35 to-night/0" />
      </div>
      <Intro src={siteImages.cover.src} position={position} />
      <div className="absolute inset-x-0 top-[54%] bottom-0 flex flex-col justify-center gap-6 px-[var(--gutter)] pb-[clamp(1.5rem,5vw,4rem)] lg:top-0 lg:right-auto lg:w-5/12 lg:justify-end lg:gap-8">
        <h1 data-intro-in className="t-display">
          Weddings that belong to two worlds
        </h1>
        <p data-intro-in style={d(0.12)} className="t-body max-w-[36ch]">
          Celebrants, photographers, florists and musicians who know how to bring two cultures into one day.
        </p>
        <div data-intro-in style={d(0.24)}>
          <ArrowLink href="/vendors" transitionTypes={["nav-forward"]}>
            Find vendors
          </ArrowLink>
        </div>
      </div>
    </section>
  );
}
