"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import { Portal } from "@/components/ui/Portal";
import type { EditPhoto } from "@/lib/account/listing";
import { LIMITS } from "@/lib/apply/application";

const ratioOf = (p: { width: number | null; height: number | null }) => (p.width && p.height ? p.width / p.height : 0.8);
const isSoft = (p: { width: number | null; height: number | null }) => !!p.width && !!p.height && Math.max(p.width, p.height) < LIMITS.photoSoft;
const GAP = "gap-[clamp(0.5rem,1vw,1rem)]";

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
  const chosen = photos.findIndex((p) => p.key === selected);

  /** The selected photo's actions, under its row. */
  const actions = (i: number) => {
    const p = photos[i];
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b hairline pb-3">
        <p className="text-[0.875rem] text-ink">
          {i === 0 ? "The cover" : `Photo ${i + 1}`}
          {isSoft(p) && <span className="text-ink-soft"> · Under {LIMITS.photoSoft}px, so it may look soft on a large screen</span>}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Action onClick={() => setViewing(p)} icon="eye" label="View large" />
          {i > 0 && <Action onClick={() => move(i, 0)}>Make cover</Action>}
          <Action icon="arrow-left" label="Move earlier" disabled={i === 0} onClick={() => move(i, i - 1)} />
          <Action icon="arrow" label="Move later" disabled={i === n - 1} onClick={() => move(i, i + 1)} />
          <Action onClick={() => remove(i)}>Remove</Action>
        </div>
      </div>
    );
  };

  const render = (t: Tile, className: string, style?: React.CSSProperties, sizes = "30vw") => {
    if (t.kind === "pending") return <div key={t.key} className={clsx(className, "animate-pulse bg-ink/[0.07]")} style={style} aria-label="Preparing a photo" />;
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
          <Media src={photo.src} alt="" brief="" sizes={sizes} className="size-full" />
        </button>
        <span className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-1.5">
          {i === 0 && <span className="bg-ink px-2 py-1 text-[0.75rem] text-paper">Cover</span>}
          {photo.upload && <span className="bg-paper px-2 py-1 text-[0.75rem] text-ink">New</span>}
          {isSoft(photo) && editable && <span className="bg-paper px-2 py-1 text-[0.75rem] text-warn">Soft</span>}
        </span>
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
        {chosen === 0 && actions(0)}
      </div>

      <div className="min-w-0 max-lg:order-3 lg:mt-[clamp(0.5rem,1vw,1rem)]">
        {gallery.length > 0 && (
          <div className={clsx("flex flex-col", GAP)}>
            {gallery.map((row, r) => {
              const total = row.reduce((sum, t) => sum + tileRatio(t), 0);
              const here = chosen > 0 && row.some((t) => t.kind === "photo" && t.index === chosen);
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
                  {here && actions(chosen)}
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
    </div>
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

function Action({ onClick, icon, label, disabled, children }: { onClick: () => void; icon?: IconName; label?: string; disabled?: boolean; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-9 min-w-9 items-center justify-center border border-ink/15 bg-surface px-3.5 text-[0.8125rem] text-ink transition-colors hover:border-ink disabled:opacity-30"
    >
      {icon ? <Icon name={icon} className="size-3.5" strokeWidth={1.6} /> : children}
    </button>
  );
}
