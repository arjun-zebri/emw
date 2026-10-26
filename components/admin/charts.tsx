"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Interval, Point, Row } from "@/lib/admin/analytics";
import { compact, day, month, num, pct } from "@/lib/admin/format";
import { Delta } from "./ui";

/*
 * Hand-drawn SVG charts (no chart library in the stack). One look throughout: 2px ink lines over a
 * faint wash, hairline grids, columns no wider than 24px with a 2px paper gap between segments,
 * and a tooltip on every chart. Text always wears text colours, never the series colour.
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

/** Round the top of the axis up to a clean number, and return the ticks. */
function niceTicks(max: number, count = 4) {
  if (max <= 0) return { top: 1, ticks: [0, 1] };
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const top = Math.ceil(max / step) * step;
  return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) };
}

export function pointLabel(key: string, interval: Interval, long = false) {
  if (interval === "month") return long ? month(key, true) : month(key);
  if (interval === "week") return long ? `Week of ${day(key, { year: false })}` : day(key, { year: false });
  return long ? day(key, { weekday: true }) : day(key, { year: false });
}

const PAD = { top: 12, right: 8, bottom: 28, left: 40 };

// ── Line / area ─────────────────────────────────────────────────────────

export function AreaChart({
  points,
  interval,
  height = 260,
  format = compact,
  label,
  showPrevious = true,
}: {
  points: Point[];
  interval: Interval;
  height?: number;
  format?: (n: number) => string;
  label: string;
  showPrevious?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...points.map((p) => Math.max(p.value, showPrevious ? p.prev : 0)));
  const { top, ticks } = niceTicks(max);
  const w = Math.max(0, width - PAD.left - PAD.right);
  const h = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w);
  const y = (v: number) => PAD.top + h - (v / top) * h;
  const line = (pick: (p: Point) => number) => points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(pick(p)).toFixed(1)}`).join("");
  const area = `${line((p) => p.value)}L${x(points.length - 1)},${PAD.top + h}L${x(0)},${PAD.top + h}Z`;
  // Five or six labels along the bottom, always including the last.
  const every = Math.max(1, Math.ceil(points.length / (width < 520 ? 4 : 6)));
  const labelled = points.map((_, i) => i).filter((i) => (points.length - 1 - i) % every === 0);

  const onMove = (e: React.PointerEvent) => {
    const box = (e.currentTarget as SVGElement).getBoundingClientRect();
    const i = Math.round(((e.clientX - box.left - PAD.left) / w) * (points.length - 1));
    setActive(Math.max(0, Math.min(points.length - 1, i)));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setActive((a) => Math.max(0, Math.min(points.length - 1, (a ?? points.length - 1) + (e.key === "ArrowLeft" ? -1 : 1))));
  };
  const p = active !== null ? points[active] : null;

  return (
    <div>
      {showPrevious && (
        <div className="mb-3 flex items-center gap-5 text-[0.75rem] text-ink-mute">
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-3.5 bg-ink" aria-hidden /> This period
          </span>
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-3.5 bg-[#cdc6ba]" aria-hidden /> Previous period
          </span>
        </div>
      )}
      <div ref={ref} className="relative" style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`${label}, ${pointLabel(points[0].key, interval, true)} to ${pointLabel(points.at(-1)!.key, interval, true)}. Use the arrow keys to read each value.`}
            tabIndex={0}
            onPointerMove={onMove}
            onPointerLeave={() => setActive(null)}
            onKeyDown={onKey}
            onBlur={() => setActive(null)}
            className="block touch-pan-y overflow-visible outline-none"
          >
            <defs>
              <linearGradient id={`wash-${label.replace(/\W/g, "")}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#161412" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#161412" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="#161412" strokeOpacity={t === 0 ? 0.16 : 0.06} />
                <text x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-mute text-[0.6875rem] tabular-nums">
                  {compact(t)}
                </text>
              </g>
            ))}
            {labelled.map((i) => (
              <text key={i} x={x(i)} y={height - 8} textAnchor={i === points.length - 1 ? "end" : i === 0 ? "start" : "middle"} className="fill-ink-mute text-[0.6875rem]">
                {pointLabel(points[i].key, interval)}
              </text>
            ))}
            {showPrevious && <path d={line((p) => p.prev)} fill="none" stroke="#cdc6ba" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />}
            <path d={area} fill={`url(#wash-${label.replace(/\W/g, "")})`} />
            <path d={line((p) => p.value)} fill="none" stroke="#161412" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {p && active !== null && (
              <g>
                <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + h} stroke="#161412" strokeOpacity={0.25} />
                {showPrevious && <circle cx={x(active)} cy={y(p.prev)} r={3.5} fill="#cdc6ba" stroke="#fff" strokeWidth={2} />}
                <circle cx={x(active)} cy={y(p.value)} r={4.5} fill="#161412" stroke="#fff" strokeWidth={2} />
              </g>
            )}
          </svg>
        )}
        {p && active !== null && (
          <Tooltip x={x(active)} width={width}>
            <p className="text-[0.75rem] text-ink-mute">{pointLabel(p.key, interval, true)}</p>
            <p className="mt-1 flex items-center gap-2">
              <span className="h-0.5 w-3 bg-ink" aria-hidden />
              <span className="text-[0.9375rem] font-medium tabular-nums">{format(p.value)}</span>
            </p>
            {showPrevious && (
              <p className="mt-0.5 flex items-center gap-2 text-ink-mute">
                <span className="h-0.5 w-3 bg-[#cdc6ba]" aria-hidden />
                <span className="tabular-nums">{format(p.prev)}</span>
                <span className="text-[0.75rem]">before</span>
              </p>
            )}
          </Tooltip>
        )}
      </div>
      <DataTable
        caption={label}
        head={["Period", "Value", ...(showPrevious ? ["Previous"] : [])]}
        rows={points.map((pt) => [pointLabel(pt.key, interval, true), format(pt.value), ...(showPrevious ? [format(pt.prev)] : [])])}
      />
    </div>
  );
}

function Tooltip({ x, width, children }: { x: number; width: number; children: React.ReactNode }) {
  const right = x > width - 180;
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 min-w-36 border border-ink/10 bg-surface/95 px-3 py-2.5 text-[0.8125rem] shadow-[0_8px_24px_-12px_rgb(22_20_18/0.25)] backdrop-blur"
      style={right ? { right: width - x + 14 } : { left: x + 14 }}
    >
      {children}
    </div>
  );
}

/** The chart's values as a table, for screen readers. */
function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Columns ─────────────────────────────────────────────────────────────

export type ColumnSeries = { id: string; label: string; color: string };

/** Stacked columns (or a single series), one per period, with a tooltip per column. */
export function Columns({
  data,
  series,
  height = 260,
  format = compact,
  label,
  xLabel,
}: {
  data: ({ key: string } & Record<string, number | string>)[];
  series: ColumnSeries[];
  height?: number;
  format?: (n: number) => string;
  label: string;
  xLabel: (key: string, long?: boolean) => string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const totals = data.map((d) => series.reduce((s, ser) => s + (Number(d[ser.id]) || 0), 0));
  const { top, ticks } = niceTicks(Math.max(...totals));
  const w = Math.max(0, width - PAD.left - PAD.right);
  const h = height - PAD.top - PAD.bottom;
  const band = w / data.length;
  const barW = Math.min(24, band * 0.62);
  const y = (v: number) => PAD.top + h - (v / top) * h;
  const every = Math.max(1, Math.ceil(data.length / (width < 520 ? 6 : 12)));

  return (
    <div>
      {series.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.75rem] text-ink-mute">
          {series.map((s) => (
            <span key={s.id} className="flex items-center gap-2">
              <span className="size-2.5" style={{ background: s.color }} aria-hidden /> {s.label}
            </span>
          ))}
        </div>
      )}
      <div ref={ref} className="relative" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={label} className="block overflow-visible" onPointerLeave={() => setActive(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="#161412" strokeOpacity={t === 0 ? 0.16 : 0.06} />
                <text x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-mute text-[0.6875rem] tabular-nums">
                  {format === compact ? compact(t) : format(t).replace(/\.00$/, "")}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const cx = PAD.left + band * i + band / 2;
              let base = 0;
              const segs = series
                .map((s) => ({ s, v: Number(d[s.id]) || 0 }))
                .filter((x) => x.v > 0)
                .map((x, j, arr) => {
                  const y0 = y(base);
                  base += x.v;
                  const y1 = y(base);
                  // A 2px paper gap between stacked segments.
                  const gap = j > 0 ? 2 : 0;
                  return { ...x, y: y1, height: Math.max(0, y0 - y1 - gap), last: j === arr.length - 1 };
                });
              const dim = active !== null && active !== i;
              return (
                <g
                  key={d.key}
                  onPointerEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  tabIndex={0}
                  role="img"
                  aria-label={`${xLabel(d.key, true)}: ${format(totals[i])}`}
                  className="outline-none"
                  style={{ opacity: dim ? 0.45 : 1, transition: "opacity 200ms" }}
                >
                  <rect x={PAD.left + band * i} y={PAD.top} width={band} height={h} fill="transparent" />
                  {segs.map((seg) => (
                    <path key={seg.s.id} d={columnPath(cx - barW / 2, seg.y, barW, seg.height, seg.last ? 3 : 0)} fill={seg.s.color} />
                  ))}
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
        {active !== null && width > 0 && (
          <Tooltip x={PAD.left + band * active + band / 2} width={width}>
            <p className="text-[0.75rem] text-ink-mute">{xLabel(data[active].key, true)}</p>
            <p className="mt-1 text-[0.9375rem] font-medium tabular-nums">{format(totals[active])}</p>
            {series.length > 1 && (
              <div className="mt-1.5 space-y-0.5">
                {[...series].reverse().map((s) => (
                  <p key={s.id} className="flex items-center justify-between gap-4 text-ink-mute">
                    <span className="flex items-center gap-2">
                      <span className="size-2" style={{ background: s.color }} aria-hidden />
                      {s.label}
                    </span>
                    <span className="text-ink tabular-nums">{format(Number(data[active][s.id]) || 0)}</span>
                  </p>
                ))}
              </div>
            )}
          </Tooltip>
        )}
      </div>
      <DataTable
        caption={label}
        head={["Period", ...series.map((s) => s.label), "Total"]}
        rows={data.map((d, i) => [xLabel(d.key, true), ...series.map((s) => format(Number(d[s.id]) || 0)), format(totals[i])])}
      />
    </div>
  );
}

/** A column with only its top corners rounded, square at the baseline. */
function columnPath(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return "";
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

// ── Ranked lists ────────────────────────────────────────────────────────

/** A ranked list where each row's bar sits behind its label. The value and share stay readable without hovering. */
export function BarList({
  rows,
  limit = 8,
  format = num,
  showShare,
  showDelta,
  icon,
  empty = "Nothing yet",
  emphasis,
}: {
  rows: (Row & { id?: string })[];
  limit?: number;
  format?: (n: number) => string;
  showShare?: boolean;
  showDelta?: boolean;
  icon?: (row: Row & { id?: string }) => React.ReactNode;
  empty?: string;
  /** Rows to draw attention to, e.g. searches with no results. */
  emphasis?: (row: Row) => boolean;
}) {
  if (!rows.length) return <p className="t-small py-6">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <ol className="space-y-1">
      {rows.slice(0, limit).map((r) => {
        const inner = (
          <>
            <span
              className={clsx("absolute inset-y-0 left-0 transition-[width] duration-700 ease-out-expo", emphasis?.(r) ? "bg-warn/[0.14]" : "bg-ink/[0.055] group-hover:bg-ink/[0.08]")}
              style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%` }}
              aria-hidden
            />
            <span className="relative flex min-w-0 items-center gap-2.5">
              {icon?.(r)}
              <span className="truncate">{r.label}</span>
              {r.detail && <span className="truncate text-[0.75rem] text-ink-mute">{r.detail}</span>}
            </span>
            <span className="relative flex shrink-0 items-center gap-3 tabular-nums">
              {showDelta && r.prev !== undefined && r.prev > 0 && <Delta value={r.value / r.prev - 1} />}
              <span className="text-ink">{format(r.value)}</span>
              {showShare && <span className="w-10 text-right text-[0.75rem] text-ink-mute">{pct(r.value / total)}</span>}
            </span>
          </>
        );
        const cls = "group relative flex h-9 items-center justify-between gap-4 px-3 text-[0.8125rem]";
        return (
          <li key={r.label + (r.detail ?? "")}>
            {r.href ? (
              <Link href={r.href} className={cls}>
                {inner}
              </Link>
            ) : (
              <div className={cls}>{inner}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ── Small figures ───────────────────────────────────────────────────────

export function Sparkline({ values, height = 36, className }: { values: number[]; height?: number; className?: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const x = (i: number) => 4 + (i / Math.max(1, values.length - 1)) * (width - 8);
  const y = (v: number) => 4 + (height - 8) * (1 - (v - min) / Math.max(1, max - min));
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  return (
    <div ref={ref} className={clsx("w-full", className)} style={{ height }} aria-hidden>
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible">
          <path d={d} fill="none" stroke="#161412" strokeOpacity={0.28} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={x(values.length - 1)} cy={y(values.at(-1)!)} r={3} fill="#161412" stroke="#fff" strokeWidth={1.5} />
        </svg>
      )}
    </div>
  );
}

/** A proportion as a thin bar, e.g. paying vendors by tier. */
export function Meter({ parts, className }: { parts: { label: string; value: number; color: string }[]; className?: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div className={className}>
      <div className="flex h-2 gap-0.5" aria-hidden>
        {parts.map((p) => (
          <span key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.75rem] text-ink-mute">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1.5">
            <span className="size-2" style={{ background: p.color }} aria-hidden />
            {p.label} <span className="text-ink tabular-nums">{p.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
