"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";

/** A colour tile that copies its value when clicked. */
export function Swatch({
  name,
  token,
  value,
  dark,
  line,
  className,
}: {
  name: string;
  token: string;
  value: string;
  /** Light text on the tile. */
  dark?: boolean;
  /** Draw the colour as a rule rather than a fill. */
  line?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => setCopied(true), () => {});
  };

  return (
    <button type="button" onClick={copy} className={clsx("group flex w-full min-w-0 flex-col items-stretch justify-start text-left", className)} aria-label={`${name}, ${value}. Copy`}>
      <span
        className={clsx("relative flex aspect-[5/4] w-full items-end p-4 transition-transform duration-700 ease-out-expo", !line && value.startsWith("#f") && "border hairline")}
        style={line ? { background: "var(--color-paper)", boxShadow: "inset 0 0 0 1px var(--color-line)" } : { background: value }}
      >
        {line && <span className="absolute inset-x-4 top-1/2 h-px" style={{ background: value }} aria-hidden />}
        <span
          className={clsx(
            "t-small transition-opacity duration-300",
            dark ? "text-paper/70" : "text-ink/55",
            copied ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
          )}
          aria-live="polite"
        >
          {copied ? "Copied" : "Copy"}
        </span>
      </span>
      <span className="mt-3 flex items-baseline justify-between gap-3">
        <span className="text-[0.9375rem] text-ink">{name}</span>
        <span className="t-small font-mono text-[0.75rem] uppercase">{value.startsWith("#") ? value : "12% ink"}</span>
      </span>
      <span className="mt-2 block font-mono text-[0.6875rem] text-ink-mute">{token}</span>
    </button>
  );
}
