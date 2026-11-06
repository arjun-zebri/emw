"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Portal } from "@/components/ui/Portal";
import { LIMITS } from "@/lib/apply/application";
import { type ApplyPhoto, isSoft, PhotoError, preparePhoto } from "@/lib/apply/photos";
import { StepHead } from "./parts";

// Slots are measured in page coordinates, so scrolling mid-drag doesn't throw the target off.
type Slot = { left: number; top: number; right: number; bottom: number };
type Drag = { id: string; from: number; to: number; x: number; y: number; slots: Slot[] };

const reorder = <T,>(list: T[], from: number, to: number) => {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

/**
 * Add, order and remove photos. The first is the cover. Photos are prepared as they're added, so
 * each appears as soon as it's ready.
 *
 * Reordering: pick a photo up and it follows the pointer; the others slide aside to show the order
 * it will make, and its own place is held by a faint copy. What you see while dragging is exactly
 * what you get on release. The slots are measured once, when the drag starts, and the target is
 * the slot under the pointer, so the photos moving underneath can never change it (which is what
 * makes drag-and-drop grids flicker and pick the wrong place). On touch screens, and from the
 * keyboard, the arrows on each photo move it instead.
 */
export function PhotoStep({ photos, onChange, headingId }: { photos: ApplyPhoto[]; onChange: (next: ApplyPhoto[] | ((p: ApplyPhoto[]) => ApplyPhoto[])) => void; headingId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const grid = useRef<HTMLUListElement>(null);
  const [pending, setPending] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const press = useRef<{ id: string; from: number; x: number; y: number } | null>(null);
  const room = LIMITS.photosMax - photos.length - pending;

  async function add(files: FileList | File[]) {
    const list = [...files].filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    const take = list.slice(0, Math.max(0, room));
    const errs: string[] = [];
    if (list.length > take.length) errs.push(`You can add up to ${LIMITS.photosMax} photos.`);
    setErrors(errs);
    setPending((n) => n + take.length);
    for (const file of take) {
      try {
        const photo = await preparePhoto(file);
        onChange((p) => [...p, photo]);
      } catch (e) {
        setErrors((x) => [...x, `${file.name}: ${e instanceof PhotoError ? e.message : "We couldn’t open this file."}`]);
      } finally {
        setPending((n) => n - 1);
      }
    }
  }

  const move = (from: number, to: number) => onChange((p) => reorder(p, from, to));

  const remove = (id: string) =>
    onChange((p) => {
      const gone = p.find((x) => x.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return p.filter((x) => x.id !== id);
    });

  // The slot under the pointer, or the nearest one, from the slots measured at the start.
  const slotAt = (x: number, y: number, slots: Slot[]) => {
    let best = 0;
    let dist = Infinity;
    slots.forEach((r, i) => {
      const d = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom ? -1 : Math.hypot(x - (r.left + r.right) / 2, y - (r.top + r.bottom) / 2);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    return best;
  };

  // The drag lives in a ref as well as state, so a quick release always sees where it ended.
  const dragRef = useRef<Drag | null>(null);
  const update = (next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  // Once a photo is pressed, the window follows the pointer: the tiles themselves move about
  // as the order previews, so they can't hold on to it.
  const [pressing, setPressing] = useState(false);
  useEffect(() => {
    if (!pressing) return;
    const at = (x: number, y: number) => {
      const d = dragRef.current;
      if (d) update({ ...d, x, y, to: slotAt(x + scrollX, y + scrollY, d.slots) });
    };
    const onMove = (e: PointerEvent) => {
      const p = press.current;
      if (!p) return;
      if (!dragRef.current) {
        if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return;
        // Read from the page in order: refs kept per index go stale once the photos have moved.
        const slots = [...(grid.current?.children ?? [])].slice(0, photos.length).map((t) => {
          const r = t.getBoundingClientRect();
          return { left: r.left + scrollX, top: r.top + scrollY, right: r.right + scrollX, bottom: r.bottom + scrollY };
        });
        dragRef.current = { id: p.id, from: p.from, to: p.from, x: e.clientX, y: e.clientY, slots };
      }
      at(e.clientX, e.clientY);
    };
    const onScroll = () => dragRef.current && at(dragRef.current.x, dragRef.current.y);
    const onUp = () => {
      const d = dragRef.current;
      if (d) move(d.from, d.to);
      press.current = null;
      update(null);
      setPressing(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      press.current = null;
      update(null);
      setPressing(false);
    };
    addEventListener("pointermove", onMove);
    addEventListener("pointerup", onUp);
    addEventListener("pointercancel", onUp);
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", onUp);
      removeEventListener("pointercancel", onUp);
      removeEventListener("scroll", onScroll);
      removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one set of listeners per press
  }, [pressing]);

  const onPointerDown = (e: React.PointerEvent, id: string, from: number) => {
    if (e.pointerType === "touch" || e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    press.current = { id, from, x: e.clientX, y: e.clientY };
    setPressing(true);
  };

  const picker = (
    <input
      ref={input}
      type="file"
      accept="image/*,.heic,.heif"
      multiple
      className="sr-only"
      tabIndex={-1}
      onChange={(e) => {
        if (e.target.files) add(e.target.files);
        e.target.value = "";
      }}
    />
  );

  const dropProps = {
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => {
      if (!e.dataTransfer.files.length) return;
      e.preventDefault();
      setOver(false);
      add(e.dataTransfer.files);
    },
  };

  const empty = photos.length === 0 && pending === 0;
  const soft = photos.filter(isSoft).length;
  const dragged = drag && photos.find((p) => p.id === drag.id);
  // While dragging, the grid shows the order the drop will make.
  const shown = drag ? reorder(photos, drag.from, drag.to) : photos;

  return (
    <div {...dropProps}>
      <StepHead id={headingId} title={empty ? "Add photos of your work" : photos.length < 5 ? "Add a few more if you can" : "Your photos"}>
        {empty
          ? "Your work is what couples see first, shown large and never cropped. Start with your best photo: it becomes your cover."
          : photos.length < 5
            ? "Five or more looks best. The first photo is your cover; drag to change the order."
            : "The first photo is your cover. Drag to change the order."}
      </StepHead>
      {picker}

      {empty ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className={clsx(
            "flex aspect-[4/3] w-full flex-col items-center justify-center gap-4 border bg-surface transition-colors duration-300 sm:aspect-[16/9]",
            over ? "border-ink" : "hairline hover:border-ink/40",
          )}
        >
          <Icon name="image" className="size-9 text-ink-soft" />
          <span className="t-title">Drag your photos here</span>
          <span className="t-small link-line text-ink">or choose them from your device</span>
        </button>
      ) : (
        <ul ref={grid} className={clsx("grid grid-cols-2 gap-2 select-none sm:grid-cols-3 sm:gap-3", over && "outline outline-1 outline-offset-8 outline-ink")}>
          {shown.map((p, i) => {
            const held = drag?.id === p.id;
            return (
              <motion.li
                key={p.id}
                layout
                transition={{ layout: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }}
                onPointerDown={(e) => onPointerDown(e, p.id, i)}
                className={clsx(
                  "group relative overflow-hidden bg-paper-soft",
                  i === 0 ? "col-span-2 aspect-[3/2] sm:col-span-3" : "aspect-square",
                  drag ? "cursor-grabbing" : "cursor-grab",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a local blob of their own photo */}
                <img
                  src={p.url}
                  alt={i === 0 ? "Cover photo" : `Photo ${i + 1}`}
                  draggable={false}
                  className={clsx("absolute inset-0 size-full object-cover transition-opacity duration-300", held && "opacity-30")}
                />
                {held && <span aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_2px_var(--color-ink)]" />}
                <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
                  <span className="flex gap-1.5">
                    {i === 0 && <span className="bg-paper px-2.5 py-1 text-[0.75rem] font-medium text-ink">Cover</span>}
                    {isSoft(p) && (
                      <span title={`Under ${LIMITS.photoSoft}px on the long side, so it may look soft on large screens`} className="grid size-7 place-items-center bg-paper text-warn">
                        <Icon name="alert" className="size-3.5" />
                        <span className="sr-only">May look soft on large screens</span>
                      </span>
                    )}
                  </span>
                  <span
                    className={clsx(
                      "flex gap-1 transition-opacity duration-300 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100",
                      drag && "invisible",
                    )}
                  >
                    {i > 0 && (
                      <>
                        <TileButton label={`Move photo ${i + 1} earlier`} onClick={() => move(i, i - 1)} icon="arrow-left" />
                        {i > 1 && (
                          <button type="button" onClick={() => move(i, 0)} className="h-7 bg-paper px-2.5 text-[0.75rem] text-ink transition-colors hover:bg-paper/85">
                            Make cover
                          </button>
                        )}
                      </>
                    )}
                    {i < photos.length - 1 && <TileButton label={`Move photo ${i + 1} later`} onClick={() => move(i, i + 1)} icon="arrow" />}
                    <TileButton label={`Remove photo ${i + 1}`} onClick={() => remove(p.id)} icon="close" />
                  </span>
                </div>
              </motion.li>
            );
          })}
          {Array.from({ length: pending }, (_, i) => (
            <li key={`pending-${i}`} className="aspect-square animate-pulse bg-paper-soft" aria-label="Preparing a photo" />
          ))}
          {room > 0 && (
            <li className="aspect-square">
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="flex size-full flex-col items-center justify-center gap-3 border hairline bg-surface transition-colors hover:border-ink/40"
              >
                <Icon name="plus" className="size-6 text-ink-soft" />
                <span className="t-small text-ink">Add more</span>
              </button>
            </li>
          )}
        </ul>
      )}

      <Portal>
        <AnimatePresence>
          {drag && dragged && (
            <motion.div
              key="ghost"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-none fixed top-0 left-0 z-[90] size-28 overflow-hidden shadow-[0_24px_48px_-16px_rgb(22_20_18/0.35)]"
              style={{ translate: `${drag.x - 56}px ${drag.y - 56}px` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a local blob of their own photo */}
              <img src={dragged.url} alt="" className="size-full object-cover" />
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>

      <div className="mt-5 space-y-1.5" aria-live="polite">
        {photos.length > 0 && (
          <p className="t-small">
            {photos.length} of {LIMITS.photosMax} photos
            {soft > 0 && (
              <>
                . <Icon name="alert" className="inline size-3.5 -translate-y-px text-warn" /> {soft === 1 ? "One is" : `${soft} are`} under {LIMITS.photoSoft}px on the long side; a larger copy will look sharper.
              </>
            )}
          </p>
        )}
        {errors.map((e) => (
          <p key={e} className="t-small text-bad">
            {e}
          </p>
        ))}
      </div>
    </div>
  );
}

function TileButton({ label, onClick, icon }: { label: string; onClick: () => void; icon: "arrow" | "arrow-left" | "close" }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="grid size-7 place-items-center bg-paper text-ink transition-colors hover:bg-paper/85">
      <Icon name={icon} className="size-3.5" />
    </button>
  );
}
