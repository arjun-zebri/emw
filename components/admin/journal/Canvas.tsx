"use client";

import clsx from "clsx";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import { postDate } from "@/components/journal/Article";
import type { PostContent } from "@/lib/admin/journal";
import { type Block, type Photo, photoUrl, ratioOf } from "@/lib/journal/blocks";
import { AltField, BodyEditor, type BodyHandle, OnPhoto, pickFiles } from "./BodyEditor";
import type { PhotoTarget } from "./ops";

/*
 * The post, written where it will be read: the title, standfirst and line set as the article sets
 * them, the cover at its own shape, then the body as one page to write on.
 */

export type Focus = { id: "title" | "standfirst" | "body"; at: "start" | "end"; nonce: number };

let nonce = 0;
export const focusOn = (id: Focus["id"], at: Focus["at"]): Focus => ({ id, at, nonce: ++nonce });

type Props = {
  content: PostContent;
  update: (fn: (c: PostContent) => PostContent) => void;
  /** Bumped when the post is replaced from outside (discarded, reloaded), so the body is drawn afresh. */
  version: number;
  /** Photos still uploading, by preview URL. */
  uploading: Set<string>;
  onFiles: (files: File[], target: PhotoTarget) => Promise<void>;
  /** The date shown in the line under the title. */
  date?: string;
  minutes: number;
  focus: Focus | null;
  setFocus: (f: Focus) => void;
};

const TEXT = "mx-auto w-full max-w-[42rem]";

export function Canvas({ content, update, version, uploading, onFiles, date, minutes, focus, setFocus }: Props) {
  const body = useRef<BodyHandle>(null);
  const setBody = useCallback((fn: (b: Block[]) => Block[]) => update((c) => ({ ...c, body: fn(c.body) })), [update]);

  useEffect(() => {
    if (focus?.id === "body") body.current?.focus(focus.at);
  }, [focus]);

  return (
    <div data-canvas className="min-w-0 pb-24">
      <header className={TEXT}>
        <Plain
          id="title"
          value={content.title}
          onChange={(title) => update((c) => ({ ...c, title }))}
          placeholder="Title"
          focus={focus}
          onEnter={() => setFocus(focusOn("standfirst", "end"))}
          onDown={() => setFocus(focusOn("standfirst", "start"))}
          className="t-display text-[clamp(2.5rem,4.4vw,4.25rem)] text-balance"
        />
        <Plain
          id="standfirst"
          value={content.standfirst}
          onChange={(standfirst) => update((c) => ({ ...c, standfirst }))}
          placeholder="A line or two to draw readers in"
          focus={focus}
          onEnter={() => setFocus(focusOn("body", "start"))}
          onUp={() => setFocus(focusOn("title", "end"))}
          onDown={() => setFocus(focusOn("body", "start"))}
          className="t-body mt-6 max-w-[40ch] text-[clamp(1.125rem,1.5vw,1.3125rem)] leading-[1.5] text-pretty"
        />
        <p className="t-small mt-6 flex flex-wrap gap-x-2">
          <span>{content.category}</span>
          <span aria-hidden>·</span>
          <span>{date ? postDate(date) : "Not yet published"}</span>
          <span aria-hidden>·</span>
          <span>{minutes} min read</span>
          {content.author.trim() && content.author.trim() !== "East Meets Wed" && (
            <>
              <span aria-hidden>·</span>
              <span>{content.author}</span>
            </>
          )}
        </p>
      </header>

      <Cover
        photo={content.cover}
        uploading={!!content.cover && uploading.has(content.cover.src)}
        onFiles={(files) => void onFiles(files.slice(0, 1), { kind: "cover" })}
        onAlt={(alt) => update((c) => (c.cover ? { ...c, cover: { ...c.cover, alt } } : c))}
        onRemove={() => update((c) => ({ ...c, cover: null }))}
      />

      <div className="mt-12">
        <BodyEditor
          key={version}
          body={content.body}
          setBody={setBody}
          uploading={uploading}
          onFiles={onFiles}
          onLeaveTop={() => setFocus(focusOn("standfirst", "end"))}
          ref={body}
        />
      </div>
    </div>
  );
}

// ── Title and standfirst ────────────────────────────────────────────────

function Plain({
  id,
  value,
  onChange,
  placeholder,
  focus,
  onEnter,
  onUp,
  onDown,
  className,
}: {
  id: "title" | "standfirst";
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  focus: Focus | null;
  onEnter: () => void;
  onUp?: () => void;
  onDown?: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  useEffect(() => {
    if (focus?.id !== id || !ref.current) return;
    const el = ref.current;
    el.focus();
    const at = focus.at === "start" ? 0 : el.value.length;
    el.setSelectionRange(at, at);
  }, [focus, id]);
  return (
    <textarea
      ref={ref}
      id={`block-${id}`}
      rows={1}
      value={value}
      aria-label={id === "title" ? "Title" : "Standfirst"}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))}
      onKeyDown={(e) => {
        const el = e.currentTarget;
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter();
        } else if (e.key === "ArrowUp" && onUp && el.selectionStart === 0) {
          e.preventDefault();
          onUp();
        } else if (e.key === "ArrowDown" && onDown && el.selectionEnd === el.value.length) {
          e.preventDefault();
          onDown();
        }
      }}
      className={clsx("block w-full resize-none overflow-hidden bg-transparent p-0 placeholder:text-ink-mute/40 focus:outline-none", className)}
    />
  );
}

// ── The cover ───────────────────────────────────────────────────────────

function Cover({
  photo,
  uploading,
  onFiles,
  onAlt,
  onRemove,
}: {
  photo: Photo | null;
  uploading: boolean;
  onFiles: (files: File[]) => void;
  onAlt: (alt: string) => void;
  onRemove: () => void;
}) {
  const [over, setOver] = useState(false);
  const drop = {
    onDragOver: (e: React.DragEvent) => {
      if (![...e.dataTransfer.types].includes("Files")) return;
      e.preventDefault();
      e.stopPropagation();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => {
      const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;
      e.preventDefault();
      e.stopPropagation();
      setOver(false);
      onFiles(files);
    },
  };

  if (!photo) {
    return (
      <button
        type="button"
        {...drop}
        onClick={() => pickFiles(onFiles, false)}
        className={clsx(
          "mt-10 flex aspect-[3/2] w-full flex-col items-center justify-center gap-4 border border-dashed transition-colors duration-300",
          over ? "border-ink bg-ink/[0.03]" : "border-ink/20 bg-surface hover:border-ink/40",
        )}
      >
        <Icon name="upload" className="size-5 text-ink-soft" strokeWidth={1.25} />
        <span className="font-display text-[1.5rem] text-ink">Add the cover photo</span>
        <span className="text-[0.8125rem] text-ink-soft">Choose one, or drop it here. It shows whole, never cropped.</span>
      </button>
    );
  }

  const ratio = ratioOf(photo) ?? 3 / 2;
  return (
    <figure {...drop} className="group/cover mt-10">
      <div className={clsx("relative mx-auto", over && "outline outline-2 outline-offset-4 outline-ink")} style={{ aspectRatio: ratio, width: `min(100%, calc(80vh * ${ratio}))` }}>
        <Media src={photoUrl(photo.src)} alt={photo.alt} brief="" quiet sizes="900px" priority className="size-full" />
        {uploading && <span aria-hidden className="skeleton absolute inset-0 opacity-60 mix-blend-multiply" />}
        <div className="absolute right-3 bottom-3 flex gap-1.5 opacity-0 transition-opacity group-focus-within/cover:opacity-100 group-hover/cover:opacity-100">
          <OnPhoto onClick={() => pickFiles(onFiles, false)}>Replace</OnPhoto>
          <OnPhoto onClick={onRemove}>Remove</OnPhoto>
        </div>
      </div>
      <AltField value={photo.alt} onChange={onAlt} className="mx-auto mt-3" style={{ width: `min(100%, calc(80vh * ${ratio}))` }} />
    </figure>
  );
}
