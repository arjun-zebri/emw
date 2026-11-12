"use client";

import clsx from "clsx";
import { Skeleton } from "@/components/ui/Skeleton";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { num } from "@/lib/admin/format";

/*
 * Hand-drawn SVG charts (no chart library in the stack). One look throughout: ink columns no wider
 * than 24px with square bases, hairline grids, a tooltip on every column, and the values as a
 * table for screen readers. Text always wears text colours.
 */

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Round the top of the axis up to a clean whole number, and return the ticks. */
function niceTicks(max: number, count = 4) {
  if (max <= count) return { top: Math.max(1, max), ticks: Array.from({ length: Math.max(1, max) + 1 }, (_, i) => i) };
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw && Number.isInteger(s)) ?? Math.ceil(raw);
  const top = Math.ceil(max / step) * step;
  return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) };
}

const PAD = { top: 12, right: 8, bottom: 28, left: 32 };

/** A column with only its top corners rounded, square at the baseline. */
function columnPath(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return "";
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

const PREV = "#cdc6ba";

/**
 * One column per period, with the period before beside it in a lighter tone when there is one,
 * and a tooltip. Clicking a column calls `onPick` (to zoom in on it).
 */
export function Columns({
  data,
  height = 240,
  label,
  xLabel,
  unit = ["enquiry", "enquiries"],
  format,
  onPick,
}: {
  data: { key: string; value: number; prev?: number }[];
  height?: number;
  label: string;
  xLabel: (key: string, long?: boolean) => string;
  unit?: [string, string];
  /** Writes a value in place of "12 enquiries", for figures that aren't counts (a rate). */
  format?: (n: number) => string;
  onPick?: (index: number) => void;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const compare = data.some((d) => d.prev !== undefined);
  const { top, ticks } = niceTicks(Math.max(0, ...data.map((d) => Math.max(d.value, d.prev ?? 0))));
  const w = Math.max(0, width - PAD.left - PAD.right);
  const h = height - PAD.top - PAD.bottom;
  const band = w / Math.max(1, data.length);
  const barW = compare ? Math.min(12, band * 0.32) : Math.min(24, band * 0.62);
  const gap = compare ? Math.min(3, barW * 0.25) : 0;
  const y = (v: number) => PAD.top + h - (v / top) * h;
  const every = Math.max(1, Math.ceil(data.length / (width < 520 ? 4 : 7)));
  const count = (n: number) => (format ? format(n) : `${num(n)} ${n === 1 ? unit[0] : unit[1]}`);
  const tick = (n: number) => (format ? format(n) : num(n));
  const a = active !== null ? data[active] : null;

  return (
    <div>
      {/* Always there, so the chart doesn't move when the comparison comes and goes. */}
      <div className={clsx("mb-3 flex h-5 items-center gap-5 text-[0.8125rem] text-ink-soft", !compare && "invisible")} aria-hidden={!compare}>
        <span className="flex items-center gap-2">
          <span className="size-2.5 bg-ink" aria-hidden /> This period
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5" style={{ background: PREV }} aria-hidden /> The period before
        </span>
      </div>
      <div ref={ref} className="relative" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={label} className="block overflow-visible" onPointerLeave={() => setActive(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="#161412" strokeOpacity={t === 0 ? 0.16 : 0.06} />
                <text x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-mute text-[0.6875rem] tabular-nums">
                  {tick(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const cx = PAD.left + band * i + band / 2;
              const x = compare ? cx - barW - gap / 2 : cx - barW / 2;
              return (
                <g
                  key={d.key}
                  onPointerEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  onClick={() => onPick?.(i)}
                  onKeyDown={(e) => {
                    if (onPick && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onPick(i);
                    }
                  }}
                  tabIndex={0}
                  role={onPick ? "button" : "img"}
                  aria-label={`${xLabel(d.key, true)}: ${count(d.value)}${d.prev !== undefined ? `, ${num(d.prev)} the period before` : ""}`}
                  className={clsx("outline-none", onPick && "cursor-pointer")}
                  style={{ opacity: active !== null && active !== i ? 0.45 : 1, transition: "opacity 200ms" }}
                >
                  <rect x={PAD.left + band * i} y={PAD.top} width={band} height={h} fill="transparent" />
                  {compare && <path d={columnPath(cx + gap / 2, y(d.prev ?? 0), barW, PAD.top + h - y(d.prev ?? 0), 2)} fill={PREV} />}
                  <path d={columnPath(x, y(d.value), barW, PAD.top + h - y(d.value), compare ? 2 : 3)} fill="#161412" />
                  {(data.length - 1 - i) % every === 0 && (
                    <text x={cx} y={height - 8} textAnchor="middle" className="fill-ink-mute text-[0.6875rem]">
                      {xLabel(d.key)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
        {a && active !== null && width > 0 && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-40 border border-ink/10 bg-surface/95 px-3 py-2.5 text-[0.8125rem] shadow-[0_8px_24px_-12px_rgb(22_20_18/0.25)] backdrop-blur"
            style={PAD.left + band * active + band / 2 > width - 200 ? { right: width - (PAD.left + band * active) + 6 } : { left: PAD.left + band * (active + 1) + 6 }}
          >
            <p className="text-[0.75rem] text-ink-soft">{xLabel(a.key, true)}</p>
            <p className="mt-1 flex items-center gap-2 text-[0.9375rem] font-medium tabular-nums">
              {compare && <span className="size-2 bg-ink" aria-hidden />}
              {count(a.value)}
            </p>
            {a.prev !== undefined && (
              <p className="mt-0.5 flex items-center gap-2 text-ink-soft tabular-nums">
                <span className="size-2" style={{ background: PREV }} aria-hidden />
                {format ? format(a.prev) : num(a.prev)} the period before
              </p>
            )}
            {onPick && <p className="mt-1.5 text-[0.75rem] text-ink-soft">Click to look closer</p>}
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th>{xLabel(d.key, true)}</th>
              <td>{d.value}</td>
              {compare && <td>{d.prev}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type BarRow = { id: string; label: string; value: number; detail?: string; icon?: React.ReactNode; note?: React.ReactNode };

/**
 * A ranked list where each row's bar sits behind its label; the count stays readable without
 * hovering. Every row is shown: put it in a fixed-height box that scrolls. With `onPick`, each row
 * is a button that filters the page to it (`picked` is drawn darker).
 */
export function BarList({ rows, empty = "Nothing yet", onPick, picked }: { rows: BarRow[]; empty?: string; onPick?: (id: string) => void; picked?: string }) {
  if (!rows.length) return <p className="py-2 text-[0.875rem] text-ink-soft">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol className="space-y-1">
      {rows.map((r) => {
        const on = picked === r.id;
        const inner = (
          <>
            <span
              className={clsx("absolute inset-y-0 left-0 transition-[width,background-color] duration-700 ease-out-expo", on ? "bg-ink/[0.14]" : "bg-ink/[0.055] group-hover:bg-ink/[0.09]")}
              style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%` }}
              aria-hidden
            />
            <span className="relative flex min-w-0 items-center gap-2.5">
              {r.icon}
              <span className="truncate text-ink">{r.label}</span>
              {r.detail && <span className="truncate text-[0.8125rem] text-ink-soft">{r.detail}</span>}
            </span>
            <span className="relative flex shrink-0 items-center gap-3 tabular-nums">
              {r.note && <span className="text-[0.8125rem] text-ink-soft">{r.note}</span>}
              <span className="min-w-6 text-right text-ink">{num(r.value)}</span>
            </span>
          </>
        );
        const cls = "group relative flex h-10 w-full items-center justify-between gap-4 px-3 text-left text-[0.875rem]";
        return (
          <li key={r.id}>
            {onPick ? (
              <button type="button" aria-pressed={on} onClick={() => onPick(r.id)} className={clsx(cls, "cursor-pointer")}>
                {inner}
              </button>
            ) : (
              <div className={cls}>{inner}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** A block standing in for text or a figure while the page loads: the shared Skeleton, under the name these charts use. */
export function Bone({ className }: { className?: string }) {
  return <Skeleton className={className} />;
}
