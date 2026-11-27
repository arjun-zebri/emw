"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import { Portal } from "@/components/ui/Portal";
import type { EditPhoto } from "@/lib/account/listing";
import { toast } from "@/lib/admin/toast";
import { LIMITS } from "@/lib/apply/application";
import { PhotoError, rotatePhoto } from "@/lib/apply/photos";
import { cropStyle } from "@/lib/crop";

const ratioOf = (p: { width: number | null; height: number | null }) => (p.width && p.height ? p.width / p.height : 0.8);
const isSoft = (p: { width: number | null; height: number | null }) => !!p.width && !!p.height && Math.max(p.width, p.height) < LIMITS.photoMin;
const GAP = "gap-[clamp(0.5rem,1vw,1rem)]";
/** The cover's crop as CSS object-position, once someone has chosen one. */
const focusOf = (p: { focusX: number | null; focusY: number | null }) => (p.focusX != null && p.focusY != null ? `${p.focusX}% ${p.focusY}%` : undefined);
const zoomOf = (p: { focusZoom: number | null }) => (p.focusZoom && p.focusZoom > 100 ? p.focusZoom / 100 : undefined);

type Tile = { kind: "photo"; photo: EditPhoto; index: number } | { kind: "pending"; key: string } | { kind: "add" };
const tileRatio = (t: Tile) => (t.kind === "photo" ? ratioOf(t.photo) : 0.8);

/** The vendor page's justified rows: fill each to a combined ratio of about 2.4; a short last row joins the one before. */
function rows(tiles: Tile[], target = 2.4) {
  const out: Tile[][] = [];
  let row: Tile[] = [];
  let sum = 0;
  for (const t of tiles) {
    row.push(t);
    sum += tileRatio(t);
    if (sum >= target) {
      out.push(row);
      row = [];
      sum = 0;
    }
  }
  if (row.length) {
    if (out.length && sum < target * 0.6) out[out.length - 1].push(...row);
    else out.push(row);
  }
  return out;
}

type Drag = { from: number; pointer: number; x0: number; y0: number; touch: boolean; active: boolean; timer?: ReturnType<typeof setTimeout> };

/**
 * The listing's photographs, laid out exactly as the vendor page sets them: the cover, then the rest
 * in justified rows that are never cropped. Drag one onto another to move it (press and hold first
 * on a phone), or select it for its actions, which open under its row. "Add photos" is the last
 * tile, and photos can be dropped anywhere here. Every change stays on the screen until the listing
 * is saved.
 *
 * On phones the component dissolves into the page's grid (`contents`), so the page can set the
 * cover first, the vendor's words next and the rest of the photos after, as the vendor page does.
 */
export function ListingPhotos({
  photos,
  preparing,
  uploads,
  readOnly,
  onChange,
  onAdd,
}: {
  photos: EditPhoto[];
  /** Photos being prepared, shown as placeholders after the rest. */
  preparing: number;
  /** New photos on their way up while saving. */
  uploads?: Record<string, "uploading" | "done">;
  readOnly?: boolean;
  onChange: (photos: EditPhoto[]) => void;
  onAdd: (files: File[]) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number; src: string } | null>(null);
  const [dropping, setDropping] = useState(false);
  const [viewing, setViewing] = useState<EditPhoto | null>(null);
  const [framing, setFraming] = useState(false);
  const [turning, setTurning] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const drag = useRef<Drag | null>(null);
  const overRef = useRef<number | null>(null);
  const swallowClick = useRef(false);
  const n = photos.length;
  const editable = !readOnly;
  const canAdd = editable && n + preparing < LIMITS.photosMax;

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= n) return;
    const next = [...photos];
    const [p] = next.splice(from, 1);
    next.splice(to, 0, p);
    onChange(next);
  };
  // The pointer listeners live for the whole time the gallery is open, so they read these.
  const latest = useRef({ move, photos });
  useEffect(() => {
    latest.current = { move, photos };
  });

  // Clicking elsewhere, or Escape, puts the selection down.
  useEffect(() => {
    if (!selected) return;
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setSelected(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [selected]);

  // Dragging to reorder, with a mouse or a finger. The browser's own drag and drop doesn't work on
  // phones, so this follows the pointer itself: a mouse starts after a few pixels, a finger after a
  // short press (a quick swipe still scrolls the page).
  useEffect(() => {
    const reset = () => {
      if (drag.current?.timer) clearTimeout(drag.current.timer);
      drag.current = null;
      overRef.current = null;
      setDragging(null);
      setOver(null);
      setGhost(null);
    };
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointer) return;
      const far = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
      if (!d.active) {
        if (d.touch) {
          if (far > 10) reset();
          return;
        }
        if (far < 6) return;
        d.active = true;
        setDragging(d.from);
        setSelected(null);
      }
      setGhost({ x: e.clientX, y: e.clientY, src: latest.current.photos[d.from]?.src ?? "" });
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-photo]");
      const at = el ? Number(el.dataset.photo) : null;
      overRef.current = at;
      setOver(at);
    };
    const onUp = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointer) return;
      if (d.active) {
        if (overRef.current !== null) latest.current.move(d.from, overRef.current);
        swallowClick.current = true;
      }
      reset();
    };
    // While a finger drags a photo, the page mustn't scroll.
    const onTouch = (e: TouchEvent) => {
      if (drag.current?.active) e.preventDefault();
    };
    addEventListener("pointermove", onMove);
    addEventListener("pointerup", onUp);
    addEventListener("pointercancel", reset);
    addEventListener("touchmove", onTouch, { passive: false });
    return () => {
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", onUp);
      removeEventListener("pointercancel", reset);
      removeEventListener("touchmove", onTouch);
    };
  }, []);

  const press = (e: React.PointerEvent, i: number) => {
    if (!editable || n < 2 || e.button !== 0) return;
    const touch = e.pointerType !== "mouse";
    const d: Drag = { from: i, pointer: e.pointerId, x0: e.clientX, y0: e.clientY, touch, active: false };
    if (touch)
      d.timer = setTimeout(() => {
        if (drag.current !== d) return;
        d.active = true;
        setDragging(i);
        setSelected(null);
        setGhost({ x: d.x0, y: d.y0, src: photos[i]?.src ?? "" });
        navigator.vibrate?.(8);
      }, 350);
    drag.current = d;
  };

  const remove = (i: number) => {
    const p = photos[i];
    if (p.upload) URL.revokeObjectURL(p.src);
    onChange(photos.filter((_, j) => j !== i));
    setSelected(null);
  };
  /** A quarter turn clockwise. The turned copy is a new photo in the same place; saving replaces the old one. */
  const rotate = async (i: number) => {
    const p = photos[i];
    if (turning) return;
    setTurning(p.key);
    try {
      const turned = await rotatePhoto(p.upload ? p.upload.full : p.src);
      if (p.upload) URL.revokeObjectURL(p.src);
      const next: EditPhoto = { key: turned.id, src: turned.url, width: turned.width, height: turned.height, focusX: null, focusY: null, focusZoom: null, upload: turned };
      onChange(latest.current.photos.map((x) => (x.key === p.key ? next : x)));
      setSelected(next.key);
    } catch (e) {
      toast(e instanceof PhotoError ? e.message : "We couldn’t turn this photo. Try again.");
    } finally {
      setTurning(null);
    }
  };
  const choose = () => input.current?.click();
  const add = (files: FileList | null) => {
    const images = [...(files ?? [])].filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (images.length) onAdd(images);
    if (input.current) input.current.value = "";
  };

  const tiles: Tile[] = [
    ...photos.map((photo, index) => ({ kind: "photo" as const, photo, index })),
    ...Array.from({ length: preparing }, (_, k) => ({ kind: "pending" as const, key: `pending-${k}` })),
    ...(canAdd && n > 0 ? [{ kind: "add" as const }] : []),
  ];
  const [cover, ...rest] = tiles;
  const landscape = cover?.kind === "photo" && ratioOf(cover.photo) >= 1.2;
  const gallery = rows(rest);

  /** A photo's menu: opened by selecting the photo, or its button in the corner. */
  const menu = (i: number) => {
    const p = photos[i];
    const items: { label: string; icon: IconName; run: () => void; danger?: boolean; rule?: boolean }[] = [
      { label: "View large", icon: "eye", run: () => setViewing(p) },
      ...(i === 0 ? [{ label: "Crop the cover", icon: "crop" as const, run: () => setFraming(true) }] : [{ label: "Make cover", icon: "image" as const, run: () => move(i, 0) }]),
      { label: "Rotate", icon: "refresh", run: () => void rotate(i) },
      ...(i > 0 ? [{ label: "Move earlier", icon: "arrow-left" as const, run: () => move(i, i - 1) }] : []),
      ...(i < n - 1 ? [{ label: "Move later", icon: "arrow" as const, run: () => move(i, i + 1) }] : []),
      { label: "Remove", icon: "trash", run: () => remove(i), danger: true, rule: true },
    ];
    return (
      <motion.div
        role="menu"
        aria-label={i === 0 ? "The cover" : `Photo ${i + 1}`}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-14 right-3 z-30 w-56 border border-ink/10 bg-surface py-1.5 shadow-[0_24px_48px_-20px_rgb(22_20_18/0.3)]"
      >
        {isSoft(p) && <p className="border-b hairline px-4 pt-1.5 pb-3 text-[0.8125rem] leading-snug text-warn">Under {LIMITS.photoMin}px, so it may look soft on a large screen.</p>}
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            disabled={item.label === "Rotate" && !!turning}
            onClick={() => {
              setSelected(null);
              item.run();
            }}
            className={clsx(
              "flex h-10 w-full items-center gap-3 px-4 text-left text-[0.875rem] transition-colors hover:bg-paper focus:bg-paper focus:outline-none disabled:opacity-40",
              item.danger ? "text-bad" : "text-ink-soft hover:text-ink",
              item.rule && "mt-1.5 h-[2.875rem] border-t hairline pt-1.5",
            )}
          >
            <Icon name={item.icon} className="size-3.5 shrink-0" strokeWidth={1.5} />
            {item.label}
          </button>
        ))}
      </motion.div>
    );
  };

  const render = (t: Tile, className: string, style?: React.CSSProperties, sizes = "30vw") => {
    if (t.kind === "pending") return <div key={t.key} className={className} style={style} aria-label="Preparing a photo"><Skeleton className="size-full" /></div>;
    if (t.kind === "add")
      return (
        <button
          key="add"
          type="button"
          onClick={choose}
          // On phones the rows stack, so a full frame would be empty space: a short strip instead.
          className={clsx(
            className,
            "group flex items-center justify-center gap-3 border border-dashed border-ink/20 text-ink transition-colors duration-300 hover:border-ink max-sm:h-20 max-sm:aspect-auto! sm:flex-col",
          )}
          style={style}
        >
          <Icon name="plus" className="size-5" strokeWidth={1.25} />
          <span className="t-nav">Add photos</span>
        </button>
      );
    const { photo, index: i } = t;
    const on = selected === photo.key;
    const upload = uploads?.[photo.key];
    return (
      <div
        key={photo.key}
        data-photo={i}
        onPointerDown={(e) => press(e, i)}
        onContextMenu={(e) => editable && e.preventDefault()}
        className={clsx(
          className,
          "group/tile relative bg-paper-soft outline-offset-[3px] transition-[opacity,outline-color] duration-300 select-none [-webkit-touch-callout:none]",
          editable && "cursor-pointer",
          dragging === i && "opacity-30",
          on && "z-20",
          on ? "outline-2 outline-ink" : over === i && dragging !== null && dragging !== i ? "outline-2 outline-ink/50" : "outline-2 outline-transparent",
        )}
        style={style}
      >
        <button
          type="button"
          disabled={!editable}
          draggable={false}
          onClick={() => {
            if (swallowClick.current) {
              swallowClick.current = false;
              return;
            }
            setSelected(on ? null : photo.key);
          }}
          aria-pressed={on}
          aria-label={`Photo ${i + 1}${i === 0 ? ", the cover" : ""}`}
          className="absolute inset-0 overflow-hidden [&_img]:pointer-events-none"
        >
          <Media src={photo.src} alt="" brief="" sizes={sizes} position={i === 0 ? focusOf(photo) : undefined} zoom={i === 0 ? zoomOf(photo) : undefined} className="size-full" />
        </button>
        {editable && (
          <button
            type="button"
            aria-label={`More for photo ${i + 1}`}
            aria-haspopup="menu"
            aria-expanded={on}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setSelected(on ? null : photo.key)}
            className={clsx(
              "absolute top-3 right-3 flex size-9 items-center justify-center bg-paper/90 text-ink backdrop-blur-sm transition-opacity duration-300 hover:bg-paper",
              on ? "opacity-100" : "opacity-0 group-hover/tile:opacity-100 focus-visible:opacity-100 max-lg:opacity-100",
            )}
          >
            <Icon name="more" className="size-4" strokeWidth={1.5} />
          </button>
        )}
        <AnimatePresence>{on && editable && menu(i)}</AnimatePresence>
        <span className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-1.5">
          {i === 0 && <span className="bg-ink px-2 py-1 text-[0.75rem] text-paper">Cover</span>}
          {photo.upload && <span className="bg-paper px-2 py-1 text-[0.75rem] text-ink">New</span>}
          {isSoft(photo) && editable && <span className="bg-paper px-2 py-1 text-[0.75rem] text-warn">Soft</span>}
        </span>
        {turning === photo.key && (
          <span className="pointer-events-none absolute inset-0" aria-label="Turning the photo">
            <Skeleton className="size-full opacity-80" />
          </span>
        )}
        {upload && (
          <span className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-paper/55">
            <span className="px-3 pb-2 text-[0.75rem] text-ink">{upload === "done" ? "Uploaded" : "Uploading"}</span>
            <span className="h-0.5 w-full overflow-hidden bg-ink/10">
              <span className={clsx("block h-full bg-ink transition-[width] duration-700 ease-out-expo", upload === "done" ? "w-full" : "w-2/3 animate-pulse")} />
            </span>
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      ref={root}
      className="relative max-lg:contents"
      onDragOver={(e) => {
        if (!canAdd || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDropping(true);
      }}
      onDragLeave={(e) => !root.current?.contains(e.relatedTarget as Node) && setDropping(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDropping(false);
        add(e.dataTransfer.files);
      }}
    >
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" tabIndex={-1} onChange={(e) => add(e.target.files)} />

      {/* The cover, framed as the vendor page frames it. */}
      <div className="flex min-w-0 flex-col gap-3 max-lg:order-1">
        {cover ? (
          render(cover, clsx("w-full lg:max-h-[calc(100svh-10rem)]", landscape ? "aspect-[4/3]" : "aspect-[4/5]"), undefined, "(min-width: 1024px) 58vw, 100vw")
        ) : readOnly ? (
          <div className="t-small flex aspect-[4/5] w-full items-center justify-center bg-paper-soft">No photos yet</div>
        ) : (
          <button type="button" onClick={choose} className="group flex aspect-[4/5] w-full flex-col items-center justify-center bg-paper-soft lg:max-h-[calc(100svh-10rem)]">
            <span className="t-nav inline-flex h-12 items-center gap-2.5 border border-ink/25 px-7 text-ink transition-colors duration-300 group-hover:border-ink">
              <Icon name="plus" className="size-3.5" strokeWidth={1.5} />
              Add photos
            </span>
            <span className="t-body mt-4">Or drop them here. The first one is the cover.</span>
          </button>
        )}
      </div>

      <div className="min-w-0 max-lg:order-3 lg:mt-[clamp(0.5rem,1vw,1rem)]">
        {gallery.length > 0 && (
          <div className={clsx("flex flex-col", GAP)}>
            {gallery.map((row, r) => {
              const total = row.reduce((sum, t) => sum + tileRatio(t), 0);
              return (
                <Fragment key={r}>
                  <div className={clsx("flex flex-col sm:flex-row", GAP)}>
                    {row.map((t) =>
                      render(
                        t,
                        "min-w-0 sm:[flex:var(--r)_1_0%]",
                        { "--r": tileRatio(t) / total, aspectRatio: row.length === 1 ? Math.max(tileRatio(t), 0.8) : tileRatio(t) } as React.CSSProperties,
                        `(min-width: 1024px) ${Math.round((tileRatio(t) / total) * 58)}vw, 100vw`,
                      ),
                    )}
                  </div>
                </Fragment>
              );
            })}
          </div>
        )}

        {n > 0 && (
          <p className="t-small mt-4">
            {n} of {LIMITS.photosMax} photos.
            {editable && n > 1 && " Drag to reorder (press and hold on a phone), or select a photo for more."}
            {editable && n === 1 && " Select it for more."}
          </p>
        )}
      </div>

      {dropping && (
        <div className="t-nav pointer-events-none absolute inset-0 z-10 flex items-center justify-center border border-ink bg-paper/80 text-ink backdrop-blur-[2px]">Drop to add</div>
      )}

      {/* The photo under the finger or the mouse while it's dragged. */}
      {ghost && (
        <Portal>
          <span className="pointer-events-none fixed z-[90] w-24 -translate-x-1/2 -translate-y-1/2 shadow-[0_18px_40px_-12px_rgb(22_20_18/0.45)]" style={{ left: ghost.x, top: ghost.y }}>
            <Media src={ghost.src} alt="" brief="" sizes="96px" className="aspect-[4/5] w-full" />
          </span>
        </Portal>
      )}

      <AnimatePresence>{viewing && <Large photo={viewing} onClose={() => setViewing(null)} />}</AnimatePresence>
      <AnimatePresence>
        {framing && photos[0] && (
          <Framing
            photo={photos[0]}
            onClose={() => setFraming(false)}
            onDone={(focusX, focusY, focusZoom) => {
              onChange(photos.map((p, i) => (i === 0 ? { ...p, focusX, focusY, focusZoom } : p)));
              setFraming(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/** The frames the cover is shown in: the top of its page, the directory tile, and the directory on a phone. */
const framesFor = (ratio: number) => [
  { id: "page", label: "Listing page", aspect: ratio >= 1.2 ? 4 / 3 : 0.8 },
  { id: "tile", label: "Directory", aspect: 0.8 },
  { id: "phone", label: "Directory on phones", aspect: 1.5 },
];

const ZOOM_MAX = 300;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Cropping the cover, as a photo editor does it: the frame stays still and the photo moves behind it.
 * Drag the photo, zoom with the slider (or pinch on a trackpad), and see what falls outside the frame,
 * dimmed. One crop serves every frame (lib/crop.ts): switch frames to check each. Nothing changes until
 * "Done", and the listing still has to be saved.
 */
function Framing({ photo, onClose, onDone }: { photo: EditPhoto; onClose: () => void; onDone: (x: number, y: number, zoom: number | null) => void }) {
  const [x, setX] = useState((photo.focusX ?? 50) / 100);
  const [y, setY] = useState((photo.focusY ?? 50) / 100);
  const [zoom, setZoom] = useState(photo.focusZoom ?? 100);
  const ratio = ratioOf(photo);
  const frames = framesFor(ratio);
  const [frameId, setFrameId] = useState(frames[0].id);
  const frame = frames.find((f) => f.id === frameId) ?? frames[0];
  const stage = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const held = useRef<{ id: number; cx: number; cy: number; x: number; y: number } | null>(null);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [onClose]);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The frame, as large as the stage allows with room around it to see what's cropped away.
  const fit = box ? Math.min((box.w * 0.74) / frame.aspect, box.h * 0.8) : 0;
  const fh = fit;
  const fw = fit * frame.aspect;
  const fx = box ? (box.w - fw) / 2 : 0;
  const fy = box ? (box.h - fh) / 2 : 0;
  // The photo covering the frame, then zoomed: the same sums as object-position and scale (lib/crop.ts).
  const cw = Math.max(fw, fh * ratio) * (zoom / 100);
  const ch = cw / ratio;
  const left = fx + x * (fw - cw);
  const top = fy + y * (fh - ch);

  const zoomBy = (to: number) => setZoom(Math.round(Math.min(ZOOM_MAX, Math.max(100, to))));

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    // A trackpad pinch arrives as a wheel with ctrl held; a plain wheel zooms too, the page doesn't scroll here.
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => Math.round(Math.min(ZOOM_MAX, Math.max(100, z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002))))));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);

  const keys = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    const by = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (by) {
      e.preventDefault();
      setX((v) => clamp01(v + by[0]));
      setY((v) => clamp01(v + by[1]));
    } else if (e.key === "+" || e.key === "=") zoomBy(zoom + 10);
    else if (e.key === "-") zoomBy(zoom - 10);
  };

  const position = `${Math.round(x * 100)}% ${Math.round(y * 100)}%`;
  const done = () => onDone(Math.round(x * 100), Math.round(y * 100), zoom > 100 ? zoom : null);

  return (
    <Portal>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Crop the cover"
        className="fixed inset-0 z-[90] flex flex-col bg-paper"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between gap-6 border-b hairline px-5 py-3.5 sm:px-8">
          <h2 className="t-title text-[1.375rem]">Crop the cover</h2>
          <div className="flex items-center gap-5">
            <button type="button" onClick={onClose} className="t-nav link-line text-ink-soft hover:text-ink">
              Cancel
            </button>
            <button type="button" onClick={done} className="t-nav inline-flex h-10 items-center bg-ink px-6 text-paper transition-opacity hover:opacity-85">
              Done
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_17rem]">
          <div className="flex min-h-0 flex-col">
            <div
              ref={stage}
              role="application"
              tabIndex={0}
              aria-label={`Drag the photo to move it in the frame. Arrow keys move it, plus and minus zoom. Now ${position}, ${zoom}%.`}
              onKeyDown={keys}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                held.current = { id: e.pointerId, cx: e.clientX, cy: e.clientY, x, y };
                setMoving(true);
              }}
              onPointerMove={(e) => {
                const h = held.current;
                if (!h || h.id !== e.pointerId) return;
                // The photo follows the pointer: the room it has to move in each way is how far it overhangs the frame.
                if (cw - fw > 0.5) setX(clamp01(h.x + (e.clientX - h.cx) / (fw - cw)));
                if (ch - fh > 0.5) setY(clamp01(h.y + (e.clientY - h.cy) / (fh - ch)));
              }}
              onPointerUp={() => ((held.current = null), setMoving(false))}
              onPointerCancel={() => ((held.current = null), setMoving(false))}
              className={clsx("relative min-h-[55svh] flex-1 touch-none overflow-hidden bg-paper-soft outline-none select-none lg:min-h-0", moving ? "cursor-grabbing" : "cursor-grab")}
            >
              {box && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- the whole photo, straight from storage or the browser */}
                  <img src={photo.src} alt="" draggable={false} className="pointer-events-none absolute max-w-none" style={{ left, top, width: cw, height: ch }} />
                  {/* Everything outside the frame, dimmed; the frame itself, with thirds while the photo moves. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute shadow-[0_0_0_200vmax_rgb(250_248_245/0.8)] outline outline-1 outline-paper"
                    style={{ left: fx, top: fy, width: fw, height: fh }}
                  >
                    <span className={clsx("absolute inset-0 transition-opacity duration-300", moving ? "opacity-100" : "opacity-0")}>
                      <span className="absolute inset-y-0 left-1/3 w-px bg-paper/60" />
                      <span className="absolute inset-y-0 left-2/3 w-px bg-paper/60" />
                      <span className="absolute inset-x-0 top-1/3 h-px bg-paper/60" />
                      <span className="absolute inset-x-0 top-2/3 h-px bg-paper/60" />
                    </span>
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center justify-center gap-4 border-t hairline px-5 py-4">
              <button type="button" onClick={() => zoomBy(zoom - 20)} disabled={zoom <= 100} aria-label="Zoom out" className="flex size-8 items-center justify-center text-ink-soft transition-colors hover:text-ink disabled:opacity-30">
                <Icon name="minus" className="size-4" strokeWidth={1.4} />
              </button>
              <input
                type="range"
                min={100}
                max={ZOOM_MAX}
                value={zoom}
                onChange={(e) => zoomBy(Number(e.target.value))}
                aria-label="Zoom"
                className="h-px w-[min(18rem,50vw)] cursor-pointer appearance-none bg-ink/20 [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-ink [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ink"
              />
              <button type="button" onClick={() => zoomBy(zoom + 20)} disabled={zoom >= ZOOM_MAX} aria-label="Zoom in" className="flex size-8 items-center justify-center text-ink-soft transition-colors hover:text-ink disabled:opacity-30">
                <Icon name="plus" className="size-4" strokeWidth={1.4} />
              </button>
              <button
                type="button"
                onClick={() => (setX(0.5), setY(0.5), setZoom(100))}
                disabled={x === 0.5 && y === 0.5 && zoom === 100}
                className="t-nav link-line ml-4 text-ink-soft hover:text-ink disabled:pointer-events-none disabled:opacity-30"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Each frame the cover is shown in, live; choose one to crop in that shape. */}
          <div className="flex gap-4 overflow-x-auto border-t hairline p-5 lg:flex-col lg:gap-6 lg:overflow-y-auto lg:border-t-0 lg:border-l lg:p-7">
            {frames.map((f) => (
              <button key={f.id} type="button" onClick={() => setFrameId(f.id)} aria-pressed={f.id === frameId} className="group w-28 shrink-0 text-left lg:w-full">
                <span
                  className={clsx(
                    "block overflow-hidden bg-paper-soft outline-offset-[3px] transition-[outline-color] duration-300",
                    f.id === frameId ? "outline-2 outline-ink" : "outline-2 outline-transparent group-hover:outline-ink/25",
                  )}
                  style={{ aspectRatio: f.aspect, width: f.aspect < 1 ? "72%" : undefined }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- a preview of the crop */}
                  <img src={photo.src} alt="" className="size-full object-cover" style={cropStyle(position, zoom / 100)} />
                </span>
                <span className={clsx("mt-2 block text-[0.8125rem]", f.id === frameId ? "text-ink" : "text-ink-soft")}>{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </Portal>
  );
}

/** One photo, full screen, as large as it will go without cropping. */
function Large({ photo, onClose }: { photo: EditPhoto; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <Portal>
      <motion.div
        role="dialog"
        aria-label="Photo"
        className="fixed inset-0 z-[90] flex items-center justify-center bg-night/92 p-4 sm:p-10"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- the full photo, straight from storage or the browser */}
        <img src={photo.src} alt="" className="max-h-full max-w-full object-contain" />
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 flex size-11 items-center justify-center text-paper/80 transition-colors hover:text-paper">
          <Icon name="close" className="size-5" strokeWidth={1.25} />
        </button>
        {photo.width && photo.height && (
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[0.8125rem] text-paper/70">
            {photo.width} × {photo.height}
          </p>
        )}
      </motion.div>
    </Portal>
  );
}
