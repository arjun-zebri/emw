"use client";

import clsx from "clsx";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Logo, Monogram } from "@/components/brand/Logo";
import { Icon } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import { Intro } from "@/components/motion/Intro";
import { siteImages } from "@/data/images";
import "./loaders.css";

/*
 * Five intro options over a copy of the landing hero. Each is pure CSS (like the real intro), so
 * remounting with a new key replays it. `reveal` is when the hero starts to show (it settles from
 * there); `text` overrides when the headline lands, for loaders that would otherwise clip it.
 */
const options = [
  { id: "invitation", label: "Invitation", reveal: 1.3 },
  { id: "window", label: "Monogram window", reveal: 0, text: 4.4 },
  { id: "shutters", label: "Shutters", reveal: 1.15 },
  { id: "meets", label: "East meets Wed", reveal: 1.75 },
  { id: "aperture", label: "Aperture", reveal: 1.1, text: 2.3 },
] as const;

type OptionId = (typeof options)[number]["id"];

function Invitation() {
  return (
    <div className="ll-overlay">
      {(["top", "bottom"] as const).map((half) => (
        <div key={half} className={`ll-inv-half ll-inv-half--${half}`}>
          <Logo className="ll-inv-logo text-ink" />
          <span className="ll-inv-score ll-inv-score--left" />
          <span className="ll-inv-score ll-inv-score--right" />
        </div>
      ))}
    </div>
  );
}

function Shutters() {
  return (
    <div className="ll-overlay">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className="ll-shutter" style={{ "--i": i, left: `${(i * 100) / 6}%` } as React.CSSProperties} />
      ))}
      <div className="ll-shutter-logo">
        <Logo className="w-[min(46vw,15rem)] text-ink" />
      </div>
    </div>
  );
}

function Meets() {
  return (
    <div className="ll-overlay ll-meets">
      <p className="ll-meets-line font-display">
        <span className="ll-meets-east">East</span>
        <em className="ll-meets-mid">meets</em>
        <span className="ll-meets-wed">Wed</span>
      </p>
      <span className="ll-meets-rule" />
    </div>
  );
}

function Aperture() {
  return (
    <div className="ll-overlay">
      <div className="ll-ap-sheet">
        <Monogram className="ll-ap-logo w-[min(36vw,9rem)] text-ink" />
      </div>
      <span className="ll-ap-ring" />
    </div>
  );
}

const loaders: Record<OptionId, () => React.ReactElement> = {
  invitation: Invitation,
  window: () => <Intro lab src={siteImages.cover.src} />,
  shutters: Shutters,
  meets: Meets,
  aperture: Aperture,
};

export function LoaderLab() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const current = options.find((o) => o.id === params.get("v")) ?? options[0];
  const [run, setRun] = useState(0);
  const Loader = loaders[current.id];

  const choose = (id: OptionId) => {
    router.replace(`${pathname}?v=${id}`, { scroll: false });
    setRun((r) => r + 1);
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-night">
      <div key={`${current.id}-${run}`} className="absolute inset-0" style={{ "--reveal": `${current.reveal}s`, ...("text" in current && { "--text": `${current.text}s` }) } as React.CSSProperties}>
        {/* A copy of the landing hero */}
        <div className="absolute inset-0 text-paper">
          <div className={clsx("absolute inset-0", current.id === "window" ? "intro-drift" : "ll-hero-media")}>
            <Media {...siteImages.cover} priority sizes="100vw" className="size-full" />
          </div>
          <span className="absolute inset-0 bg-gradient-to-t from-night/55 via-night/0 to-night/30" />
          <div className="shell absolute inset-x-0 top-0 flex h-[var(--header-h)] items-center justify-between">
            <Monogram className="w-[4.5rem]" />
            <span className="t-nav hidden gap-10 md:flex">
              <span>Vendors</span>
              <span>Journal</span>
              <span>About</span>
              <span>List your business</span>
            </span>
          </div>
          <div className="shell absolute inset-x-0 bottom-0 pb-[clamp(5.5rem,8vw,7rem)]">
            <h1 className="ll-hero-text t-display max-w-[11ch]">Weddings that belong to two worlds</h1>
          </div>
        </div>
        <Loader />
      </div>

      <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
        <div className="flex max-w-full items-center gap-1 overflow-x-auto bg-ink/85 p-1 text-paper backdrop-blur-md">
          {options.map((o, i) => (
            <button
              key={o.id}
              type="button"
              onClick={() => choose(o.id)}
              aria-pressed={o.id === current.id}
              className={clsx(
                "t-nav shrink-0 px-3.5 py-2.5 transition-colors",
                o.id === current.id ? "bg-paper text-ink" : "text-paper/70 hover:text-paper",
              )}
            >
              {i + 1} · {o.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRun((r) => r + 1)}
            className="t-nav flex shrink-0 items-center gap-2 px-3.5 py-2.5 text-paper/70 hover:text-paper"
          >
            Replay <Icon name="arrow" className="size-3.5 -rotate-90" />
          </button>
        </div>
      </div>
    </div>
  );
}
