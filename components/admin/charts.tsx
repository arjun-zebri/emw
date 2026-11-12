"use client";

import clsx from "clsx";
import { Skeleton } from "@/components/ui/Skeleton";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { num } from "@/lib/admin/format";

/*
 * Hand-drawn SVG charts (no chart library in the stack). One look throughout: an ink line over a
 * faint fill for anything over time, ranked bars for anything else, hairline grids, a tooltip on
 * every point, and the values as a table for screen readers. Text always wears text colours.
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

const PREV = "#cdc6ba";

/**
 * A line over time, with the period before as a dashed line beneath it when there is one. Hover
 * (or arrow keys) to read any point; with `onPick`, clicking a point calls it (to zoom in).
 * Time series always use this, never columns.
 */
export function Trend({
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
  format?: (n: number) => string;
  onPick?: (index: number) => void;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const compare = data.some((d) => d.prev !== undefined);
  const { top, ticks } = niceTicks(Math.max(0, ...data.map((d) => Math.max(d.value, d.prev ?? 0))));
  const w = Math.max(0, width - PAD.left - PAD.right - 8);
  const h = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + 8 + (data.length > 1 ? (i / (data.length - 1)) * w : w / 2);
  const y = (v: number) => PAD.top + h - (v / top) * h;
  const count = (n: number) => (format ? format(n) : `${num(n)} ${n === 1 ? unit[0] : unit[1]}`);
  const tick = (n: number) => (format ? format(n) : num(n));
  const every = Math.max(1, Math.ceil(data.length / (width < 520 ? 4 : 7)));

  const line = (pick: (d: (typeof data)[number]) => number) => data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(pick(d)).toFixed(1)}`).join("");
  const now = line((d) => d.value);
  const area = data.length ? `${now}L${x(data.length - 1).toFixed(1)},${PAD.top + h}L${x(0).toFixed(1)},${PAD.top + h}Z` : "";
  const before = compare ? line((d) => d.prev ?? 0) : "";

  const nearest = (clientX: number, el: Element) => {
    const r = el.getBoundingClientRect();
    const px = clientX - r.left;
    if (data.length < 2) return 0;
    return Math.max(0, Math.min(data.length - 1, Math.round(((px - PAD.left - 8) / w) * (data.length - 1))));
  };
  const a = active !== null ? data[active] : null;
  const gradient = `trend-${label.replace(/\W+/g, "-")}`;

  return (
    <div>
      <div className={clsx("mb-3 flex h-5 items-center gap-5 text-[0.8125rem] text-ink-soft", !compare && "invisible")} aria-hidden={!compare}>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-4 bg-ink" aria-hidden /> This period
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 border-t-2 border-dashed" style={{ borderColor: PREV }} aria-hidden /> The period before
        </span>
      </div>
      <div ref={ref} className="relative" style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={label}
            tabIndex={0}
            className={clsx("block overflow-visible outline-none", onPick && "cursor-pointer")}
            onPointerMove={(e) => setActive(nearest(e.clientX, e.currentTarget))}
            onPointerLeave={() => setActive(null)}
            onClick={() => active !== null && onPick?.(active)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                setActive((i) => Math.max(0, Math.min(data.length - 1, (i ?? (e.key === "ArrowRight" ? -1 : data.length)) + (e.key === "ArrowRight" ? 1 : -1))));
              } else if (onPick && active !== null && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onPick(active);
              }
            }}
            onBlur={() => setActive(null)}
          >
            <defs>
              <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#161412" stopOpacity="0.1" />
                <stop offset="1" stopColor="#161412" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="#161412" strokeOpacity={t === 0 ? 0.16 : 0.06} />
                <text x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-mute text-[0.6875rem] tabular-nums">
                  {tick(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) =>
              (data.length - 1 - i) % every === 0 ? (
                <text key={d.key} x={x(i)} y={height - 8} textAnchor="middle" className="fill-ink-mute text-[0.6875rem]">
                  {xLabel(d.key)}
                </text>
              ) : null,
            )}
            <path d={area} fill={`url(#${gradient})`} />
            {compare && <path d={before} fill="none" stroke={PREV} strokeWidth={1.5} strokeDasharray="4 4" strokeLinejoin="round" strokeLinecap="round" />}
            <path d={now} fill="none" stroke="#161412" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
            {a && active !== null && (
              <g pointerEvents="none">
                <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + h} stroke="#161412" strokeOpacity={0.18} />
                {compare && <circle cx={x(active)} cy={y(a.prev ?? 0)} r={3.5} fill="#ffffff" stroke={PREV} strokeWidth={1.5} />}
                <circle cx={x(active)} cy={y(a.value)} r={4} fill="#161412" stroke="#ffffff" strokeWidth={2} />
              </g>
            )}
            {data.length === 1 && <circle cx={x(0)} cy={y(data[0].value)} r={3} fill="#161412" />}
          </svg>
        )}
        {a && active !== null && width > 0 && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-40 border border-ink/10 bg-surface/95 px-3 py-2.5 text-[0.8125rem] shadow-[0_8px_24px_-12px_rgb(22_20_18/0.25)] backdrop-blur"
            style={x(active) > width - 200 ? { right: width - x(active) + 12 } : { left: x(active) + 12 }}
          >
            <p className="text-[0.75rem] text-ink-soft">{xLabel(a.key, true)}</p>
            <p className="mt-1 flex items-center gap-2 text-[0.9375rem] font-medium tabular-nums">
              {compare && <span className="h-0.5 w-3 bg-ink" aria-hidden />}
              {count(a.value)}
            </p>
            {a.prev !== undefined && (
              <p className="mt-0.5 flex items-center gap-2 text-ink-soft tabular-nums">
                <span className="w-3 border-t-2 border-dashed" style={{ borderColor: PREV }} aria-hidden />
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
  // Indented like a row's label, so the message lines up with what would be there.
  if (!rows.length) return <p className="px-3 py-2 text-[0.875rem] text-ink-soft">{empty}</p>;
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
