"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import type { EditPhoto } from "@/lib/account/listing";
import { LIMITS } from "@/lib/apply/application";

const ratioOf = (p: { width: number | null; height: number | null }) => (p.width && p.height ? p.width / p.height : 0.8);
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

/**
 * The listing's photographs, laid out exactly as the vendor page sets them: the cover, then the rest
 * in justified rows that are never cropped. Drag one onto another to move it, or select it for its
 * actions; "Add photos" is the last tile, and photos can be dropped anywhere here. Every change stays
 * on the screen until the listing is saved.
 */
export function ListingPhotos({
  photos,
  preparing,
  readOnly,
  onChange,
  onAdd,
}: {
  photos: EditPhoto[];
  /** Photos being prepared, shown as placeholders after the rest. */
  preparing: number;
  readOnly?: boolean;
  onChange: (photos: EditPhoto[]) => void;
  onAdd: (files: File[]) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [dropping, setDropping] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const n = photos.length;
  const canAdd = !readOnly && n + preparing < LIMITS.photosMax;
  const editable = !readOnly;

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

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= n) return;
    const next = [...photos];
    const [p] = next.splice(from, 1);
    next.splice(to, 0, p);
    onChange(next);
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
  const chosen = photos.findIndex((p) => p.key === selected);
  const landscape = cover?.kind === "photo" && ratioOf(cover.photo) >= 1.2;
  const gallery = rows(rest);

  const render = (t: Tile, className: string, style?: React.CSSProperties, sizes = "30vw") => {
    if (t.kind === "pending") return <div key={t.key} className={clsx(className, "animate-pulse bg-ink/[0.07]")} style={style} aria-label="Preparing a photo" />;
    if (t.kind === "add")
      return (
        <button
          key="add"
          type="button"
          onClick={choose}
          // On phones the rows stack, so a full frame would be empty space: a short strip instead.
          className={clsx(className, "group flex items-center justify-center gap-3 border border-dashed border-ink/20 text-ink transition-colors duration-300 hover:border-ink max-sm:h-20 max-sm:aspect-auto! sm:flex-col")}
          style={style}
        >
          <Icon name="plus" className="size-5" strokeWidth={1.25} />
          <span className="t-nav">Add photos</span>
        </button>
      );
    const { photo, index: i } = t;
    const on = selected === photo.key;
    return (
      <div
        key={photo.key}
        draggable={editable && n > 1}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", photo.key);
          setDragging(i);
          setSelected(null);
        }}
        onDragOver={(e) => {
          if (dragging === null) return;
          e.preventDefault();
          setOver(i);
        }}
        onDrop={(e) => {
          if (dragging === null) return;
          e.preventDefault();
          e.stopPropagation();
          move(dragging, i);
          setDragging(null);
          setOver(null);
        }}
        onDragEnd={() => {
          setDragging(null);
          setOver(null);
        }}
        className={clsx(
          className,
          "group/tile relative bg-paper-soft outline-offset-[3px] transition-[opacity,outline-color] duration-300",
          editable && "cursor-pointer",
          editable && n > 1 && "active:cursor-grabbing",
          dragging === i && "opacity-40",
          on ? "outline-2 outline-ink" : over === i && dragging !== null && dragging !== i ? "outline-2 outline-ink/50" : "outline-2 outline-transparent",
        )}
        style={style}
      >
        <button
          type="button"
          disabled={!editable}
          onClick={() => setSelected(on ? null : photo.key)}
          aria-pressed={on}
          aria-label={`Photo ${i + 1}${i === 0 ? ", the cover" : ""}`}
          className="absolute inset-0 overflow-hidden select-none [&_img]:pointer-events-none"
        >
          <Media src={photo.src} alt="" brief="" sizes={sizes} className="size-full" />
        </button>
        <span className="pointer-events-none absolute top-3 left-3 flex gap-1.5">
          {i === 0 && <span className="bg-ink px-2 py-1 text-[0.75rem] text-paper">Cover</span>}
          {photo.upload && <span className="bg-paper px-2 py-1 text-[0.75rem] text-ink">New</span>}
        </span>
      </div>
    );
  };

  return (
    <div
      ref={root}
      className="relative"
      onDragOver={(e) => {
        if (!canAdd || dragging !== null || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDropping(true);
      }}
      onDragLeave={(e) => !root.current?.contains(e.relatedTarget as Node) && setDropping(false)}
      onDrop={(e) => {
        if (dragging !== null || !e.dataTransfer.files.length) return;
        e.preventDefault();
        setDropping(false);
        add(e.dataTransfer.files);
      }}
    >
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" tabIndex={-1} onChange={(e) => add(e.target.files)} />

      {/* The cover, framed as the vendor page frames it. */}
      {cover ? (
        render(cover, clsx("w-full lg:max-h-[calc(100svh-12rem)]", landscape ? "aspect-[4/3]" : "aspect-[4/5]"), undefined, "(min-width: 1024px) 58vw, 100vw")
      ) : readOnly ? (
        <div className="t-small flex aspect-[4/5] w-full items-center justify-center bg-paper-soft">No photos yet</div>
      ) : (
        <button type="button" onClick={choose} className="group flex aspect-[4/5] w-full flex-col items-center justify-center bg-paper-soft lg:max-h-[calc(100svh-12rem)]">
          <span className="t-nav inline-flex h-12 items-center gap-2.5 border border-ink/25 px-7 text-ink transition-colors duration-300 group-hover:border-ink">
            <Icon name="plus" className="size-3.5" strokeWidth={1.5} />
            Add photos
          </span>
          <span className="t-body mt-4">Or drop them here. The first one is the cover.</span>
        </button>
      )}

      {gallery.length > 0 && (
        <div className={clsx("mt-[clamp(0.5rem,1vw,1rem)] flex flex-col", GAP)}>
          {gallery.map((row, r) => {
            const total = row.reduce((sum, t) => sum + tileRatio(t), 0);
            return (
              <div key={r} className={clsx("flex flex-col sm:flex-row", GAP)}>
                {row.map((t) =>
                  render(
                    t,
                    "min-w-0 sm:[flex:var(--r)_1_0%]",
                    { "--r": tileRatio(t) / total, aspectRatio: row.length === 1 ? Math.max(tileRatio(t), 0.8) : tileRatio(t) } as React.CSSProperties,
                    `(min-width: 1024px) ${Math.round((tileRatio(t) / total) * 58)}vw, 100vw`,
                  ),
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* The selected photo's actions, in one place whatever the size of its tile. */}
      {n > 0 && (
        <div className="mt-4 flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {chosen !== -1 ? (
            <>
              <p className="text-[0.875rem] text-ink">{chosen === 0 ? "The cover" : `Photo ${chosen + 1}`}</p>
              <div className="flex flex-wrap gap-1.5">
                {chosen > 0 && <Action onClick={() => move(chosen, 0)}>Make cover</Action>}
                <Action icon="arrow-left" label="Move earlier" disabled={chosen === 0} onClick={() => move(chosen, chosen - 1)} />
                <Action icon="arrow" label="Move later" disabled={chosen === n - 1} onClick={() => move(chosen, chosen + 1)} />
                <Action onClick={() => remove(chosen)}>Remove</Action>
              </div>
            </>
          ) : (
            <p className="t-small">
              {n} of {LIMITS.photosMax} photos.{editable && n > 1 && " Drag to reorder, or select a photo to change it."}
              {editable && n === 1 && " Select it to change it."}
            </p>
          )}
        </div>
      )}

      {dropping && (
        <div className="t-nav pointer-events-none absolute inset-0 z-10 flex items-center justify-center border border-ink bg-paper/80 text-ink backdrop-blur-[2px]">Drop to add</div>
      )}
    </div>
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
