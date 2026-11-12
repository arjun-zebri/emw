"use client";

import clsx from "clsx";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { AU_LABELS, AU_STATES, auPoint } from "@/data/au-map";
import { states } from "@/data/taxonomy";
import { plural } from "@/lib/admin/format";

/*
 * Australia for Admin → Traffic: states shaded by visits and labelled with their share, a bubble
 * on each city sized by its visits. Drag to move, pinch or ⌘/Ctrl + scroll to zoom (plain scrolling still scrolls the
 * page), or use the buttons. Picking a state or a city narrows the page to it and the map flies
 * there; clearing it flies back. Hand-drawn SVG, no map library.
 */

export type MapCity = { id: string; name: string; region: string; visits: number; lat: number; lon: number };
type View = { x: number; y: number; w: number; h: number };

const HOME: View = { x: -6, y: -6, w: 412, h: 382 };
const MIN_W = HOME.w / 10;
const STATE_CODES = Object.keys(AU_STATES) as (keyof typeof AU_STATES)[];
const ease = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
/** A share as a whole percentage, or "<1%" for a sliver. */
export const share = (n: number, total: number) => (!total || !n ? "0%" : n / total < 0.01 ? "<1%" : `${Math.round((n / total) * 100)}%`);

/** Keep the view the map's shape, no closer than 10× and no further out than all of Australia. */
function clampView(v: View): View {
  const w = Math.min(HOME.w, Math.max(MIN_W, v.w));
  const h = (w * HOME.h) / HOME.w;
  const cx = v.x + v.w / 2;
  const cy = v.y + v.h / 2;
  const x = Math.min(HOME.x + HOME.w - w, Math.max(HOME.x, cx - w / 2));
  const y = Math.min(HOME.y + HOME.h - h, Math.max(HOME.y, cy - h / 2));
  return { x, y, w, h };
}

export function TrafficMap({
  byState,
  total,
  cities,
  picked,
  onPickState,
  onPickCity,
}: {
  byState: Map<string, number>;
  /** All visits in the period, overseas too: what the shares are of. */
  total: number;
  cities: MapCity[];
  /** The place facet: "AU-VIC", or "city:Melbourne|VIC". */
  picked?: string;
  onPickState: (code: string) => void;
  onPickCity: (id: string) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [view, setViewState] = useState<View>(HOME);
  const viewRef = useRef(view);
  /** Every change of view goes through here, so handlers always read the latest. */
  const setView = useCallback((v: View) => {
    viewRef.current = v;
    setViewState(v);
  }, []);
  const [width, setWidth] = useState(0);
  const [tip, setTip] = useState<{ x: number; y: number; title: string; detail: string } | null>(null);
  const frame = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: number; start?: { view: View; dist: number; mid: { x: number; y: number } } }>({ moved: 0 });

  useLayoutEffect(() => {
    const el = svg.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** Map units per screen pixel, so bubbles and labels stay the same size on screen at any zoom. */
  const upp = width ? view.w / width : 1;
  const zoom = HOME.w / view.w;

  const flyTo = useCallback((target: View) => {
    cancelAnimationFrame(frame.current);
    const to = clampView(target);
    const from = viewRef.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      frame.current = requestAnimationFrame(() => setView(to));
      return;
    }
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / 700);
      const k = ease(t);
      setView({ x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, w: from.w + (to.w - from.w) * k, h: from.h + (to.h - from.h) * k });
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, [setView]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // Fly to what's picked, or back to all of Australia.
  const cityPoints = useMemo(() => cities.map((c) => ({ ...c, ...auPoint(c.lon, c.lat) })), [cities]);
  useEffect(() => {
    if (!picked) return flyTo(HOME);
    if (picked.startsWith("AU-")) {
      const el = svg.current?.querySelector<SVGPathElement>(`[data-state="${picked.slice(3)}"]`);
      if (!el) return;
      const b = el.getBBox();
      const pad = Math.max(b.width, b.height) * 0.15 + 4;
      const w = Math.max(b.width + pad * 2, ((b.height + pad * 2) * HOME.w) / HOME.h);
      flyTo({ x: b.x + b.width / 2 - w / 2, y: b.y + b.height / 2 - (w * HOME.h) / HOME.w / 2, w, h: (w * HOME.h) / HOME.w });
    } else if (picked.startsWith("city:")) {
      const c = cityPoints.find((p) => p.id === picked);
      if (c) flyTo({ x: c.x - 75, y: c.y - 70, w: 150, h: (150 * HOME.h) / HOME.w });
    }
  }, [picked, cityPoints, flyTo]);

  const zoomBy = (factor: number, at?: { x: number; y: number }) => {
    const v = viewRef.current;
    const cx = at?.x ?? v.x + v.w / 2;
    const cy = at?.y ?? v.y + v.h / 2;
    const w = v.w / factor;
    const h = v.h / factor;
    setView(clampView({ x: cx - ((cx - v.x) / v.w) * w, y: cy - ((cy - v.y) / v.h) * h, w, h }));
  };

  /** A screen point in map units. */
  const toMap = (clientX: number, clientY: number) => {
    const r = svg.current!.getBoundingClientRect();
    const v = viewRef.current;
    return { x: v.x + ((clientX - r.left) / r.width) * v.w, y: v.y + ((clientY - r.top) / r.height) * v.h };
  };

  // ⌘/Ctrl + scroll (and a trackpad pinch, which arrives the same way) zooms; plain scrolling is left to the page.
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      cancelAnimationFrame(frame.current);
      zoomBy(Math.exp(-e.deltaY * 0.01), toMap(e.clientX, e.clientY));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  const onPointerDown = (e: React.PointerEvent) => {
    cancelAnimationFrame(frame.current);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current = { moved: 0 };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.start = { view: viewRef.current, dist: Math.hypot(a.x - b.x, a.y - b.y), mid: toMap((a.x + b.x) / 2, (a.y + b.y) / 2) };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const last = pointers.current.get(e.pointerId);
    if (!last) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current.moved += Math.abs(dx) + Math.abs(dy);
    if (gesture.current.moved > 4 && !svg.current!.hasPointerCapture(e.pointerId)) svg.current!.setPointerCapture(e.pointerId);
    const r = svg.current!.getBoundingClientRect();
    if (pointers.current.size === 2 && gesture.current.start) {
      const [a, b] = [...pointers.current.values()];
      const { view: v0, dist, mid } = gesture.current.start;
      const f = Math.hypot(a.x - b.x, a.y - b.y) / dist;
      const w = v0.w / f;
      const h = v0.h / f;
      setView(clampView({ x: mid.x - ((mid.x - v0.x) / v0.w) * w, y: mid.y - ((mid.y - v0.y) / v0.h) * h, w, h }));
    } else if (pointers.current.size === 1 && gesture.current.moved > 4) {
      setTip(null);
      const v = viewRef.current;
      setView(clampView({ ...v, x: v.x - (dx / r.width) * v.w, y: v.y - (dy / r.height) * v.h }));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current.start = undefined;
  };
  /** A click that wasn't the end of a drag. */
  const click = (fn: () => void) => () => {
    if (gesture.current.moved <= 4) fn();
  };

  const showTip = (e: React.PointerEvent | React.FocusEvent, title: string, n: number) => {
    const box = svg.current!.getBoundingClientRect();
    const src = "clientX" in e ? { x: e.clientX, y: e.clientY } : (() => {
      const r = (e.target as Element).getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top };
    })();
    setTip({ x: src.x - box.left, y: src.y - box.top, title, detail: `${plural(n, "visit")} · ${share(n, total)}` });
  };

  const top = Math.max(1, ...byState.values());
  const maxCity = Math.max(1, ...cities.map((c) => c.visits));
  // Name the biggest cities; more as you zoom in.
  const labelled = new Set(
    [...cityPoints]
      .sort((a, b) => b.visits - a.visits)
      .slice(0, Math.round(4 * zoom))
      .map((c) => c.id),
  );

  return (
    <div className="relative select-none">
      <svg
        ref={svg}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className={clsx("block aspect-[412/382] h-auto w-full", zoom > 1.01 ? "cursor-grab touch-none active:cursor-grabbing" : "touch-pan-y")}
        role="group"
        aria-label="Map of visits by state and city"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setTip(null)}
      >
        {STATE_CODES.map((code) => {
          const n = byState.get(code) ?? 0;
          const on = picked === `AU-${code}`;
          const name = states[code];
          return (
            <path
              key={code}
              data-state={code}
              d={AU_STATES[code]}
              fill="#161412"
              fillOpacity={n ? 0.1 + (n / top) * 0.55 : 0.045}
              stroke={on ? "#161412" : "#ffffff"}
              strokeWidth={(on ? 1.6 : 0.9) * upp}
              strokeLinejoin="round"
              className="cursor-pointer outline-none transition-[fill-opacity] duration-300 hover:fill-opacity-70 focus-visible:fill-opacity-70"
              tabIndex={0}
              role="button"
              aria-label={`${name}: ${plural(n, "visit")}`}
              aria-pressed={on}
              onPointerMove={(e) => gesture.current.moved <= 4 && showTip(e, name, n)}
              onFocus={(e) => showTip(e, name, n)}
              onBlur={() => setTip(null)}
              onClick={click(() => onPickState(code))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPickState(code);
                }
              }}
            />
          );
        })}
        {STATE_CODES.map((code) => {
          const at = AU_LABELS[code];
          const n = byState.get(code) ?? 0;
          if (!at || !n) return null;
          const halo = { paintOrder: "stroke" as const, stroke: "#ffffff", strokeWidth: 3 * upp, strokeLinejoin: "round" as const, strokeOpacity: 0.85 };
          return (
            <text key={code} x={at.x} y={at.y} textAnchor={at.anchor ?? "middle"} className="pointer-events-none" style={halo}>
              <tspan x={at.x} fontSize={11 * upp} className="fill-ink" fontWeight={500}>
                {code}
              </tspan>
              <tspan x={at.x} dy={13 * upp} fontSize={11 * upp} className="fill-ink-soft">
                {share(n, total)}
              </tspan>
            </text>
          );
        })}
        {cityPoints
          .slice()
          .sort((a, b) => b.visits - a.visits)
          .map((c) => {
            const on = picked === c.id;
            const r = (4 + 14 * Math.sqrt(c.visits / maxCity)) * upp;
            return (
              <g key={c.id}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={r}
                  fill="#ad9e5d"
                  fillOpacity={on ? 1 : 0.82}
                  stroke={on ? "#161412" : "#ffffff"}
                  strokeWidth={(on ? 2 : 1.2) * upp}
                  className="cursor-pointer outline-none transition-[fill-opacity] hover:fill-opacity-100 focus-visible:fill-opacity-100"
                  tabIndex={0}
                  role="button"
                  aria-label={`${c.name}: ${plural(c.visits, "visit")}`}
                  aria-pressed={on}
                  onPointerMove={(e) => {
                    e.stopPropagation();
                    if (gesture.current.moved <= 4) showTip(e, `${c.name}, ${c.region}`, c.visits);
                  }}
                  onFocus={(e) => showTip(e, `${c.name}, ${c.region}`, c.visits)}
                  onBlur={() => setTip(null)}
                  onClick={click(() => onPickCity(c.id))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onPickCity(c.id);
                    }
                  }}
                />
                {labelled.has(c.id) && (
                  <text
                    // Near the right edge the name goes on the left, so it isn't cut off.
                    x={c.x > view.x + view.w * 0.72 ? c.x - r - 4 * upp : c.x + r + 4 * upp}
                    textAnchor={c.x > view.x + view.w * 0.72 ? "end" : "start"}
                    y={c.y}
                    dy="0.35em"
                    fontSize={11 * upp}
                    className="pointer-events-none fill-ink"
                    style={{ paintOrder: "stroke", stroke: "#ffffff", strokeWidth: 3 * upp, strokeLinejoin: "round" }}
                  >
                    {c.name}
                  </text>
                )}
              </g>
            );
          })}
      </svg>

      {tip && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)] border border-ink/10 bg-surface/95 px-3 py-2 text-[0.8125rem] whitespace-nowrap shadow-[0_8px_24px_-12px_rgb(22_20_18/0.25)] backdrop-blur"
          style={{ left: tip.x, top: tip.y }}
        >
          <p className="text-ink">{tip.title}</p>
          <p className="text-ink-soft tabular-nums">{tip.detail}</p>
        </div>
      )}

      <div className="absolute right-0 bottom-0 flex flex-col border border-ink/15 bg-surface">
        <button type="button" onClick={() => zoomBy(1.6)} disabled={view.w <= MIN_W + 0.5} aria-label="Zoom in" className="flex size-8 items-center justify-center text-ink-soft transition-colors hover:text-ink disabled:opacity-30">
          <Icon name="plus" className="size-3.5" strokeWidth={1.6} />
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.6)} disabled={zoom <= 1.01} aria-label="Zoom out" className="flex size-8 items-center justify-center border-t border-ink/10 text-ink-soft transition-colors hover:text-ink disabled:opacity-30">
          <Icon name="minus" className="size-3.5" strokeWidth={1.6} />
        </button>
        <button type="button" onClick={() => flyTo(HOME)} disabled={zoom <= 1.01} aria-label="Show all of Australia" className="flex size-8 items-center justify-center border-t border-ink/10 text-ink-soft transition-colors hover:text-ink disabled:opacity-30">
          <Icon name="refresh" className="size-3.5" strokeWidth={1.6} />
        </button>
      </div>
      <p className="mt-2 text-[0.75rem] text-ink-soft">Drag to move, pinch or ⌘ + scroll to zoom.</p>
    </div>
  );
}
