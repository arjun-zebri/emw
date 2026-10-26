"use client";

import clsx from "clsx";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import { Button } from "@/components/ui/Button";
import { postCategories, type Block, type Post } from "@/data/journal";
import { day } from "@/lib/admin/format";
import { deletePost, nowIso, savePost, slugify, useAdmin } from "@/lib/admin/store";
import { TODAY } from "@/lib/admin/time";
import { toast } from "@/lib/admin/toast";
import { getVendor, vendors } from "@/lib/vendors";
import { DetailRow, rowInput } from "../shared/DetailRow";
import { Dropdown } from "../shared/Dropdown";
import { PreviewFrame } from "../shared/PreviewFrame";
import { Drawer } from "../Drawer";
import { Btn, Empty, inputCls } from "../ui";

/*
 * The journal editor: a quiet writing column on the paper, the post's settings beside it, and a
 * preview that renders the post as couples will see it. Every change saves itself after a pause.
 */

const blank = (): Post => ({
  id: "",
  slug: "",
  title: "",
  standfirst: "",
  category: "Planning",
  cover: { alt: "" },
  body: [{ id: "b1", type: "p", text: "" }],
  vendors: [],
  status: "draft",
  date: TODAY,
  updated: "",
  author: "East Meets Wed",
  description: "",
});

const uid = () => Math.random().toString(36).slice(2, 9);
const noop = () => () => {};

export function JournalEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { posts } = useAdmin();
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const stored = posts.find((p) => p.id === id);

  const [draft, setDraft] = useState<Post | null>(id === "new" ? blank() : null);
  const [loadedId, setLoadedId] = useState<string | null>(id === "new" ? "new" : null);
  // Load the post once the browser's copy of the store is available (or when moving to another post).
  if (id === "new" && loadedId !== "new") {
    setLoadedId("new");
    setDraft(blank());
  } else if (stored && loadedId !== stored.id && !(loadedId === "new" && draft?.id === stored.id)) {
    setLoadedId(stored.id);
    setDraft(stored);
  }

  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [previewing, setPreviewing] = useState(false);
  const closePreview = useCallback(() => setPreviewing(false), []);
  const [picker, setPicker] = useState<null | { kind: "cover" } | { kind: "block"; id: string } | { kind: "insert"; after: string }>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const dirty = useRef(false);

  // Autosave 600ms after the last change.
  useEffect(() => {
    if (!draft || !dirty.current) return;
    const t = setTimeout(() => {
      const isNew = !draft.id;
      const post = { ...draft, id: draft.id || `p-${uid()}`, updated: nowIso() };
      savePost(post);
      dirty.current = false;
      setSaving("saved");
      if (isNew) {
        setDraft(post);
        // Swap the URL without a navigation, so the cursor stays where it is.
        window.history.replaceState(null, "", `/admin/journal/${post.id}`);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [draft]);

  if (!draft) {
    if (!hydrated) return null;
    return <Empty title="This post doesn't exist" action={<Btn href="/admin/journal">Back to the journal</Btn>} />;
  }

  const change = (patch: Partial<Post>) => {
    dirty.current = true;
    setSaving("saving");
    setDraft((d) => {
      const next = { ...d!, ...patch };
      if (patch.title !== undefined && !slugTouched) next.slug = slugify(patch.title);
      return next;
    });
  };

  const setBlocks = (fn: (b: Block[]) => Block[]) => change({ body: fn(draft.body) });

  const commit = (patch: Partial<Post>, message: string, action?: { label: string; run: () => void }) => {
    const post = { ...draft, ...patch, id: draft.id || `p-${uid()}`, updated: nowIso() };
    if (!post.slug) post.slug = slugify(post.title) || post.id;
    savePost(post);
    dirty.current = false;
    setDraft(post);
    setSaving("saved");
    if (!draft.id) window.history.replaceState(null, "", `/admin/journal/${post.id}`);
    toast(message, action);
  };

  const future = draft.date > TODAY;
  const primary =
    draft.status === "published"
      ? { label: "Update", run: () => commit({}, "Changes published") }
      : future
        ? { label: "Schedule", run: () => commit({ status: "scheduled" }, `Scheduled for ${day(draft.date)}`) }
        : {
            label: "Publish",
            run: () =>
              commit({ status: "published", date: draft.date || TODAY }, "Published. It's on the home page now.", { label: "View", run: () => window.open("/#journal", "_blank") }),
          };

  const remove = () => {
    const copy = draft;
    if (copy.id) deletePost(copy.id);
    router.push("/admin/journal");
    toast("Post deleted", copy.id ? { label: "Undo", run: () => savePost(copy) } : undefined);
  };

  const insertAfter = (afterId: string | null, block: Block) => {
    setBlocks((blocks) => {
      const i = afterId ? blocks.findIndex((b) => b.id === afterId) : blocks.length - 1;
      return [...blocks.slice(0, i + 1), block, ...blocks.slice(i + 1)];
    });
    if (block.type !== "img") setFocusId(block.id);
  };

  const choosePhoto = (src: string, alt: string) => {
    if (!picker) return;
    if (picker.kind === "cover") change({ cover: { src, alt } });
    else if (picker.kind === "block") setBlocks((bs) => bs.map((b) => (b.id === picker.id ? { ...b, src, alt } : b)));
    else insertAfter(picker.after, { id: uid(), type: "img", src, alt, caption: "" });
    setPicker(null);
  };

  const publish = () => {
    if (draft.title.trim()) return primary.run();
    setFocusId("title");
    toast("Give the post a title first");
  };

  return (
    <>
      <nav className="t-small mb-8 flex items-center gap-2">
        <Link href="/admin/journal" className="inline-flex items-center gap-1.5 transition-colors hover:text-ink">
          <Icon name="chevron-left" className="size-3.5" strokeWidth={1.5} />
          Journal
        </Link>
        <span aria-hidden>/</span>
        <h1 className="min-w-0 truncate text-ink">{draft.id ? draft.title || "Untitled" : "New post"}</h1>
        <span className="ml-auto flex shrink-0 items-center gap-2 text-[0.75rem]" aria-live="polite">
          <span className={clsx("size-1.5 rounded-full", saving === "saving" ? "animate-pulse bg-warn" : "bg-good")} aria-hidden />
          {saving === "saving" ? "Saving" : saving === "saved" ? "Saved" : draft.id ? `Saved ${day(draft.updated || TODAY)}` : "Saves as you write"}
        </span>
      </nav>

      <div className="grid grid-cols-1 gap-y-12 xl:grid-cols-12 xl:gap-x-[clamp(2rem,4vw,4.5rem)]">
        <article className="min-w-0 xl:col-span-7">
          <Cover post={draft} onPick={() => setPicker({ kind: "cover" })} onRemove={() => change({ cover: { alt: "" } })} />

          <AutoText
            value={draft.title}
            onChange={(title) => change({ title })}
            id="title"
            focusId={focusId}
            placeholder="Title"
            aria-label="Title"
            onEnter={() => setFocusId("standfirst")}
            className="mt-10 font-display text-[clamp(2.5rem,3.6vw,4rem)] leading-[1] tracking-[-0.03em] text-balance text-ink placeholder:text-ink-mute/35"
          />
          <AutoText
            id="standfirst"
            focusId={focusId}
            value={draft.standfirst}
            onChange={(standfirst) => change({ standfirst })}
            placeholder="A line to draw readers in."
            aria-label="Standfirst"
            onEnter={() => setFocusId(draft.body[0]?.id ?? null)}
            className="t-title mt-6 text-[1.5rem] leading-[1.3] text-pretty text-ink-soft placeholder:text-ink-mute/35"
          />

          <div className="mt-10 border-t hairline pt-8">
            {draft.body.map((block, i) => (
              <div key={block.id}>
                {i > 0 && <Inserter onInsert={(type) => (type === "img" ? setPicker({ kind: "insert", after: draft.body[i - 1].id }) : insertAfter(draft.body[i - 1].id, { id: uid(), type, text: "" }))} />}
                <BlockEditor
                  block={block}
                  focusId={focusId}
                  first={i === 0}
                  last={i === draft.body.length - 1}
                  onChange={(b) => setBlocks((bs) => bs.map((x) => (x.id === b.id ? b : x)))}
                  onMove={(dir) =>
                    setBlocks((bs) => {
                      const j = i + dir;
                      if (j < 0 || j >= bs.length) return bs;
                      const next = [...bs];
                      [next[i], next[j]] = [next[j], next[i]];
                      return next;
                    })
                  }
                  onDelete={() => {
                    setBlocks((bs) => (bs.length > 1 ? bs.filter((x) => x.id !== block.id) : [{ id: uid(), type: "p", text: "" }]));
                    const prev = draft.body[i - 1];
                    if (prev && prev.type !== "img") setFocusId(prev.id);
                  }}
                  onSplit={(before, after) => {
                    const next: Block = { id: uid(), type: "p", text: after };
                    setBlocks((bs) => {
                      const at = bs.findIndex((x) => x.id === block.id);
                      const updated = block.type === "img" ? block : { ...block, text: before };
                      return [...bs.slice(0, at), updated, next, ...bs.slice(at + 1)];
                    });
                    setFocusId(next.id);
                  }}
                  onReplaceImage={() => setPicker({ kind: "block", id: block.id })}
                />
              </div>
            ))}
            <Inserter
              always
              onInsert={(type) =>
                type === "img" ? setPicker({ kind: "insert", after: draft.body.at(-1)!.id }) : insertAfter(draft.body.at(-1)?.id ?? null, { id: uid(), type, text: "" })
              }
            />
          </div>
        </article>

        <Sidebar
          post={draft}
          change={change}
          slugTouched={() => setSlugTouched(true)}
          onDelete={remove}
          onUnpublish={() => commit({ status: "draft" }, "Moved back to drafts")}
          primaryLabel={primary.label}
          onPublish={publish}
          onPreview={() => setPreviewing(true)}
        />
      </div>

      <PhotoPicker open={!!picker} onClose={() => setPicker(null)} onChoose={choosePhoto} title={picker?.kind === "cover" ? "Choose a cover" : "Choose a photo"} />
      <AnimatePresence>
        {previewing && (
          <PreviewFrame onClose={closePreview}>
            <div className="shell pt-6">
              <Preview post={draft} />
            </div>
          </PreviewFrame>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Writing ─────────────────────────────────────────────────────────────

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** A textarea that grows with its text and can be focused from outside by id. */
function AutoText({
  id,
  focusId,
  value,
  onChange,
  onEnter,
  onKeyDown,
  className,
  ...props
}: {
  id?: string;
  focusId?: string | null;
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  className?: string;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "onKeyDown" | "id">) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  useEffect(() => {
    if (id && focusId === id && ref.current && document.activeElement !== ref.current) {
      const el = ref.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [focusId, id]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (onKeyDown) return onKeyDown(e);
        if (e.key === "Enter" && !e.shiftKey && onEnter) {
          e.preventDefault();
          onEnter();
        }
      }}
      className={clsx("block w-full resize-none overflow-hidden bg-transparent placeholder:text-ink-mute/45 focus:outline-none", className)}
      {...props}
    />
  );
}

function BlockEditor({
  block,
  focusId,
  first,
  last,
  onChange,
  onMove,
  onDelete,
  onSplit,
  onReplaceImage,
}: {
  block: Block;
  focusId: string | null;
  first: boolean;
  last: boolean;
  onChange: (b: Block) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  onSplit: (before: string, after: string) => void;
  onReplaceImage: () => void;
}) {
  const controls = (
    <div className="absolute top-0 right-full mr-3 hidden flex-col opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 lg:flex">
      <BlockButton icon="arrow-up" label="Move up" onClick={() => onMove(-1)} disabled={first} />
      <BlockButton icon="arrow-down" label="Move down" onClick={() => onMove(1)} disabled={last} />
      <BlockButton icon="trash" label="Delete block" onClick={onDelete} />
    </div>
  );

  if (block.type === "img") {
    return (
      <figure className="group relative my-6">
        {controls}
        <button type="button" onClick={onReplaceImage} className="group/img relative block w-full overflow-hidden" aria-label="Replace photo">
          <Media src={block.src} alt={block.alt} brief="" sizes="720px" className="aspect-[3/2] w-full" />
          <span className="absolute inset-0 flex items-center justify-center bg-night/0 text-[0.8125rem] text-paper opacity-0 transition-all group-hover/img:bg-night/25 group-hover/img:opacity-100">
            Replace photo
          </span>
        </button>
        <input
          value={block.caption ?? ""}
          onChange={(e) => onChange({ ...block, caption: e.target.value })}
          placeholder="Caption"
          aria-label="Caption"
          className="t-small mt-3 w-full bg-transparent placeholder:text-ink-mute/45 focus:outline-none"
        />
        <button type="button" onClick={onDelete} className="mt-2 text-[0.75rem] text-ink-mute hover:text-bad lg:hidden">
          Remove photo
        </button>
      </figure>
    );
  }

  const heading = block.type === "h";
  return (
    <div className={clsx("group relative", heading ? "mt-8 mb-3" : "my-1")}>
      {controls}
      <AutoText
        id={block.id}
        focusId={focusId}
        value={block.text}
        onChange={(text) => onChange({ ...block, text })}
        placeholder={heading ? "Heading" : first ? "Start writing" : "Write, or press Enter for a new paragraph"}
        aria-label={heading ? "Heading" : "Paragraph"}
        onKeyDown={(e) => {
          const el = e.currentTarget;
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSplit(el.value.slice(0, el.selectionStart), el.value.slice(el.selectionEnd));
          } else if (e.key === "Backspace" && el.value === "" && !first) {
            e.preventDefault();
            onDelete();
          }
        }}
        className={heading ? "font-display text-[1.75rem] leading-[1.15] tracking-[-0.015em] text-ink" : "text-[1.0625rem] leading-[1.75] text-ink-soft"}
      />
    </div>
  );
}

function BlockButton({ icon, label, onClick, disabled }: { icon: IconName; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="p-1 text-ink-mute transition-colors hover:text-ink disabled:opacity-25">
      <Icon name={icon} className="size-3.5" strokeWidth={1.5} />
    </button>
  );
}

/** A quiet "+" between blocks that opens Paragraph / Heading / Photo. */
function Inserter({ onInsert, always }: { onInsert: (type: "p" | "h" | "img") => void; always?: boolean }) {
  const [open, setOpen] = useState(false);
  const options: { type: "p" | "h" | "img"; label: string; icon: IconName }[] = [
    { type: "p", label: "Paragraph", icon: "text" },
    { type: "h", label: "Heading", icon: "heading" },
    { type: "img", label: "Photo", icon: "image" },
  ];
  return (
    <div className={clsx("group/ins relative flex h-7 items-center", always && "mt-4")}>
      <span className={clsx("h-px flex-1 bg-ink/10 transition-opacity", open || always ? "opacity-100" : "opacity-0 group-hover/ins:opacity-100")} aria-hidden />
      <div className={clsx("flex items-center transition-opacity", open || always ? "opacity-100" : "opacity-0 group-hover/ins:opacity-100 focus-within:opacity-100")}>
        {open ? (
          <div className="flex items-center bg-surface shadow-[0_8px_24px_-12px_rgb(22_20_18/0.3)]">
            {options.map((o) => (
              <button
                key={o.type}
                type="button"
                onClick={() => {
                  onInsert(o.type);
                  setOpen(false);
                }}
                className="flex h-8 items-center gap-1.5 px-3 text-[0.75rem] text-ink-soft transition-colors hover:bg-ink/[0.04] hover:text-ink"
              >
                <Icon name={o.icon} className="size-3.5" strokeWidth={1.5} />
                {o.label}
              </button>
            ))}
            <button type="button" onClick={() => setOpen(false)} aria-label="Cancel" className="flex h-8 items-center px-2 text-ink-mute hover:text-ink">
              <Icon name="close" className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Add a block"
            className="mx-2 flex size-7 items-center justify-center rounded-full text-ink-mute transition-all duration-500 ease-out-expo hover:rotate-90 hover:bg-ink hover:text-paper"
          >
            <Icon name="plus" className="size-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>
      <span className={clsx("h-px flex-1 bg-ink/10 transition-opacity", open || always ? "opacity-100" : "opacity-0 group-hover/ins:opacity-100")} aria-hidden />
    </div>
  );
}

function Cover({ post, onPick, onRemove }: { post: Post; onPick: () => void; onRemove: () => void }) {
  if (!post.cover.src) {
    return (
      <button type="button" onClick={onPick} className="group flex aspect-[3/2] w-full flex-col items-center justify-center bg-paper-soft">
        <span className="t-nav inline-flex h-12 items-center gap-2.5 border border-ink/25 px-7 text-ink transition-colors duration-300 group-hover:border-ink">
          <Icon name="plus" className="size-3.5" strokeWidth={1.5} />
          Add a cover
        </span>
        <span className="t-small mt-4">From the vendors&rsquo; photos, or upload your own</span>
      </button>
    );
  }
  return (
    <div className="group relative">
      <Media src={post.cover.src} alt={post.cover.alt} brief="" sizes="720px" priority className="aspect-[3/2] w-full" />
      <div className="absolute right-3 bottom-3 flex gap-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <button type="button" onClick={onPick} className="bg-paper/90 px-3 py-1.5 text-[0.75rem] backdrop-blur transition-colors hover:bg-paper">
          Replace
        </button>
        <button type="button" onClick={onRemove} className="bg-paper/90 px-3 py-1.5 text-[0.75rem] backdrop-blur transition-colors hover:bg-paper">
          Remove
        </button>
      </div>
      {post.cover.alt && <p className="t-small mt-2 text-[0.75rem]">{post.cover.alt}</p>}
    </div>
  );
}

// ── Settings ────────────────────────────────────────────────────────────

function Sidebar({
  post,
  change,
  slugTouched,
  onDelete,
  onUnpublish,
  primaryLabel,
  onPublish,
  onPreview,
}: {
  post: Post;
  change: (p: Partial<Post>) => void;
  slugTouched: () => void;
  onDelete: () => void;
  onUnpublish: () => void;
  primaryLabel: string;
  onPublish: () => void;
  onPreview: () => void;
}) {
  const dateInput = useRef<HTMLInputElement>(null);
  const over = post.description.length > 160;

  return (
    <aside className="min-w-0 self-start xl:sticky xl:top-24 xl:col-span-5">
      <dl className="border-t hairline">
        <DetailRow label="Publish date" htmlFor="post-date">
          {/* The native picker sits invisibly over a formatted date, so the row reads like the others. */}
          <span className="relative flex items-center justify-between gap-4 text-[0.9375rem]">
            {day(post.date || TODAY, { year: true })}
            <Icon name="calendar" className="size-3.5 text-ink-mute" strokeWidth={1.4} />
            <input
              ref={dateInput}
              id="post-date"
              type="date"
              value={post.date}
              onChange={(e) => change({ date: e.target.value || TODAY })}
              onClick={() => dateInput.current?.showPicker?.()}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </span>
        </DetailRow>
        <DetailRow label="Category" htmlFor="post-category">
          <Dropdown id="post-category" options={postCategories.map((c) => ({ value: c, label: c }))} value={post.category} onChange={(c) => change({ category: c })} placeholder="Choose a category" />
        </DetailRow>
        <DetailRow label="Author" htmlFor="post-author">
          <input id="post-author" value={post.author} onChange={(e) => change({ author: e.target.value })} placeholder="Who wrote it" className={rowInput} />
        </DetailRow>
        <DetailRow label="Vendors" htmlFor="post-vendors">
          <Dropdown
            id="post-vendors"
            multiple
            options={vendorOptions}
            value={post.vendors}
            onChange={(v) => change({ vendors: v })}
            placeholder="Credit the vendors in this story"
          />
        </DetailRow>
        <DetailRow label="Web address" htmlFor="post-slug">
          <span className="flex items-baseline text-[0.9375rem]">
            <span className="shrink-0 text-ink-mute">/journal/</span>
            <input
              id="post-slug"
              value={post.slug}
              onChange={(e) => {
                slugTouched();
                change({ slug: slugify(e.target.value) });
              }}
              placeholder="made-from-the-title"
              className={clsx(rowInput, "min-w-0 flex-1")}
            />
          </span>
        </DetailRow>
        <DetailRow label="In search" htmlFor="post-description" aside={<span className={clsx("tabular-nums", over && "text-bad")}>{post.description.length} of 160</span>}>
          <textarea
            id="post-description"
            rows={2}
            value={post.description}
            onChange={(e) => change({ description: e.target.value })}
            placeholder="A sentence or two shown under the title in Google"
            className={clsx(rowInput, "min-h-[2lh] resize-none leading-relaxed [field-sizing:content]")}
          />
        </DetailRow>
      </dl>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
        <Button type="button" onClick={onPublish}>
          {primaryLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onPreview}>
          Preview
        </Button>
        <MoreMenu
          items={[
            ...(post.status !== "draft" ? [{ label: "Move to drafts", run: onUnpublish }] : []),
            { label: "Delete post", run: onDelete, danger: true },
          ]}
        />
      </div>
    </aside>
  );
}

/** The rarer actions, kept out of the way behind "⋯" beside the main buttons. */
function MoreMenu({ items }: { items: { label: string; run: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={clsx("flex size-12 items-center justify-center border text-ink transition-colors duration-300", open ? "border-ink" : "border-ink/25 hover:border-ink")}
      >
        <Icon name="more" className="size-4" strokeWidth={1.5} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-[calc(100%+0.5rem)] right-0 z-40 min-w-44 border border-ink/10 bg-surface py-1.5 shadow-[0_24px_48px_-20px_rgb(22_20_18/0.22)]"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.run();
                }}
                className={clsx(
                  "flex h-10 w-full items-center px-4 text-left text-[0.875rem] transition-colors hover:bg-paper focus:bg-paper focus:outline-none",
                  item.danger ? "text-bad" : "text-ink-soft hover:text-ink",
                )}
              >
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const vendorOptions = vendors.map((v) => ({ value: v.slug, label: v.name, hint: v.discipline }));

// ── Preview ─────────────────────────────────────────────────────────────

/** The post as couples will see it on the public site. */
function Preview({ post }: { post: Post }) {
  const credited = post.vendors.map((slug) => getVendor(slug)).filter((v): v is NonNullable<typeof v> => !!v);
  return (
    <article className="mx-auto w-full max-w-[720px] min-w-0 pb-10">
      <p className="t-small">{post.category}</p>
      <h1 className="mt-3 font-display text-[clamp(2.5rem,5vw,4.25rem)] leading-[0.98] tracking-[-0.03em] text-balance">{post.title || "Untitled"}</h1>
      {post.standfirst && <p className="mt-5 max-w-[46ch] text-[1.25rem] leading-[1.5] text-ink-soft">{post.standfirst}</p>}
      <p className="t-small mt-6">
        {post.author} · {day(post.date)}
      </p>
      {post.cover.src && <Media src={post.cover.src} alt={post.cover.alt} brief="" sizes="720px" className="mt-10 aspect-[3/2] w-full" />}
      <div className="mt-10 space-y-5">
        {post.body.map((b) =>
          b.type === "img" ? (
            <figure key={b.id} className="py-4">
              <Media src={b.src} alt={b.alt} brief="" sizes="720px" className="aspect-[3/2] w-full" />
              {b.caption && <figcaption className="t-small mt-3">{b.caption}</figcaption>}
            </figure>
          ) : b.type === "h" ? (
            <h2 key={b.id} className="t-heading pt-6">
              {b.text}
            </h2>
          ) : (
            b.text && (
              <p key={b.id} className="t-body text-[1.0625rem]">
                {b.text}
              </p>
            )
          ),
        )}
      </div>
      {credited.length > 0 && (
        <div className="mt-14 border-t hairline pt-8">
          <p className="t-small mb-5">Vendors in this story</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
            {credited.map((v) => (
              <Link key={v.slug} href={`/vendors/${v.slug}`} target="_blank" className="group">
                <Media src={v.cover} alt={v.name} brief="" quiet sizes="240px" className="aspect-[4/5] w-full" />
                <p className="t-title mt-3 text-[1.0625rem] group-hover:opacity-70">{v.name}</p>
                <p className="t-small">{v.discipline}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

// ── Photos ──────────────────────────────────────────────────────────────

const library = vendors.flatMap((v) => [v.cover, ...(v.gallery ?? [])].filter((src): src is string => !!src).map((src) => ({ src, vendor: v.name })));

/** Every vendor photo in the library, credited, plus uploads (resized in the browser for the demo). */
function PhotoPicker({ open, onClose, onChoose, title }: { open: boolean; onClose: () => void; onChoose: (src: string, alt: string) => void; title: string }) {
  const [query, setQuery] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const shown = library.filter((p) => !query.trim() || p.vendor.toLowerCase().includes(query.trim().toLowerCase()));

  const upload = (f: File | undefined) => {
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      onChoose(canvas.toDataURL("image/jpeg", 0.82), f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
    };
    img.src = URL.createObjectURL(f);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      width="max-w-3xl"
      footer={
        <>
          <input ref={file} type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
          <span className="mr-auto text-[0.75rem] text-ink-mute">{shown.length} photos from the directory</span>
          <Btn icon="upload" onClick={() => file.current?.click()}>
            Upload
          </Btn>
        </>
      }
    >
      <div className="sticky top-0 z-10 border-b hairline bg-paper px-6 py-4">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-ink-mute" strokeWidth={1.5} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by vendor" aria-label="Filter by vendor" className={clsx(inputCls, "pl-7")} />
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-3">
          {shown.map((p) => (
            <li key={p.src}>
              <button type="button" onClick={() => onChoose(p.src, `Photo by ${p.vendor}`)} className="group block w-full text-left">
                <span className="block overflow-hidden">
                  <Media src={p.src} alt="" brief="" quiet sizes="240px" className="aspect-[4/5] w-full transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]" />
                </span>
                <span className="mt-1.5 block truncate text-[0.6875rem] text-ink-mute">{p.vendor}</span>
              </button>
            </li>
          ))}
      </ul>
    </Drawer>
  );
}
