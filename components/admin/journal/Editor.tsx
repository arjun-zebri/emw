"use client";

import clsx from "clsx";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons/Icon";
import { Article } from "@/components/journal/Article";
import { Skeleton, SkeletonLines } from "@/components/ui/Skeleton";
import { time as clock, day } from "@/lib/admin/format";
import {
  blankContent,
  createPost,
  deletePost,
  discardEdits,
  fetchVendorPhoto,
  type JournalPost,
  peekPost,
  PhotoError,
  type PostContent,
  prepareJournalPhoto,
  publishPost,
  reloadPost,
  saveContent,
  SlugTakenError,
  StaleError,
  statusOf,
  unpublishPost,
  uploadPrepared,
  useCreditVendors,
  usePost,
} from "@/lib/admin/journal";
import { bodyText, photoUrl, readingMinutes, SLUG, slugify, wordCount } from "@/lib/journal/blocks";
import { toast } from "@/lib/admin/toast";
import { Drawer } from "../Drawer";
import { PreviewFrame } from "../shared/PreviewFrame";
import { Btn, Empty } from "../ui";
import { Canvas } from "./Canvas";
import { FormatBar } from "./FormatBar";
import { type PhotoTarget, placePhotos, settlePhoto } from "./ops";
import { PhotoLibrary, type Picked } from "./PhotoLibrary";
import { melbourneIso, melbourneParts, Settings, type When } from "./Settings";
import type { Focus } from "./TextBlock";

/*
 * Writing a post. The page is the article as couples will read it; its details sit beside it. A
 * draft saves itself a moment after each change. Once a post is live, changes save as unpublished
 * edits and couples keep reading what's published until "Publish changes"; the bar at the top says
 * which is which, and when it last saved.
 */

export function JournalEditor() {
  const { id: routeId } = useParams<{ id: string }>();
  const isNew = routeId === "new";
  const { status, data, error } = usePost(isNew ? null : routeId);

  if (isNew) return <Editing key="new" post={null} />;
  if (status === "loading" && !data) return <EditorSkeleton />;
  if (!data) {
    return (
      <Empty title={error ? "The post didn’t load" : "This post doesn’t exist"} action={<Btn href="/admin/journal">Back to the journal</Btn>}>
        {error}
      </Empty>
    );
  }
  return <Editing key={data.id} post={data} />;
}

// The time, to the quarter minute: enough to know whether a chosen date is still ahead.
const nowish = () => Math.floor(Date.now() / 15_000) * 15_000;
const useNow = () =>
  useSyncExternalStore(
    (l) => {
      const t = setInterval(l, 15_000);
      return () => clearInterval(t);
    },
    nowish,
    () => 0,
  );

type SaveState = "idle" | "pending" | "saving" | "saved" | "error" | "stale";

function Editing({ post: initial }: { post: JournalPost | null }) {
  const router = useRouter();
  const [id, setId] = useState(initial?.id ?? null);
  const live = usePost(id).data ?? initial;
  const vendors = useCreditVendors();
  const now = useNow();

  const [content, setContent] = useState<PostContent>(() => initial?.edits?.content ?? initial?.saved ?? blankContent());
  const [save, setSave] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [slugTaken, setSlugTaken] = useState(false);
  const [uploading, setUploading] = useState<Set<string>>(() => new Set());
  const [library, setLibrary] = useState<PhotoTarget | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [view, setView] = useState<"desktop" | "phone">("desktop");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [focus, setFocus] = useState<Focus | null>(initial ? null : { id: "title", at: "start", nonce: 0 });
  const effective = live ? statusOf(live, now || undefined) : "draft";
  const scheduled = effective === "scheduled";
  const [when, setWhen] = useState<When>(() => (initial && statusOf(initial) === "scheduled" && initial.publishedAt ? melbourneParts(initial.publishedAt) : null));
  // The address follows the title until someone sets it, or the post has been out in the world.
  const [slugTouched, setSlugTouched] = useState(() => !!initial && (initial.status !== "draft" || (!!initial.saved.slug && !initial.saved.slug.startsWith("draft-") && initial.saved.slug !== slugify(initial.saved.title))));

  const latest = useRef(content);
  const version = useRef(0);
  const savedVersion = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const idRef = useRef(id);

  // ── Saving ────────────────────────────────────────────────────────────

  const persist = useCallback(async () => {
    const v = version.current;
    const c = latest.current;
    setSave("saving");
    try {
      if (!idRef.current) {
        const newId = await createPost(c);
        idRef.current = newId;
        setId(newId);
        // Swap the address without a navigation, so the caret stays where it is.
        window.history.replaceState(null, "", `/admin/journal/${newId}`);
      } else {
        const current = peekPost(idRef.current);
        if (!current) throw new Error("The post went missing");
        const { slugTaken } = await saveContent(current, c);
        setSlugTaken(slugTaken);
      }
      savedVersion.current = Math.max(savedVersion.current, v);
      setSavedAt(new Date().toISOString());
      setSave(version.current === v ? "saved" : "pending");
    } catch (e) {
      setSave(e instanceof StaleError ? "stale" : "error");
      throw e;
    }
  }, []);

  /** Save now, after whatever save is already going. */
  const flush = useCallback(async () => {
    while (inFlight.current) await inFlight.current.catch(() => undefined);
    if (savedVersion.current === version.current && idRef.current) return;
    const run = persist();
    inFlight.current = run;
    try {
      await run;
    } finally {
      inFlight.current = null;
    }
  }, [persist]);

  const update = useCallback((fn: (c: PostContent) => PostContent) => {
    setContent((c) => {
      const next = fn(c);
      if (next === c) return c;
      latest.current = next;
      version.current++;
      return next;
    });
    setSave((s) => (s === "stale" ? s : "pending"));
  }, []);

  // A pause in the typing saves.
  useEffect(() => {
    if (save !== "pending") return;
    const t = setTimeout(() => void flush().catch(() => undefined), 900);
    return () => clearTimeout(t);
  }, [content, save, flush]);

  // Don't let a tab close on unsaved words.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (version.current !== savedVersion.current || uploading.size) e.preventDefault();
    };
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [uploading]);

  // ⌘S saves at once.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void flush().catch(() => undefined);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [flush]);

  // The address follows the title until it's been set by hand.
  const setTitleSlug = useCallback(
    (fn: (c: PostContent) => PostContent) =>
      update((c) => {
        const next = fn(c);
        return !slugTouched && next.title !== c.title ? { ...next, slug: slugify(next.title) } : next;
      }),
    [update, slugTouched],
  );

  // ── Photos ────────────────────────────────────────────────────────────

  const ensureId = async () => {
    if (!idRef.current) await flush();
    return idRef.current!;
  };

  const addPrepared = async (items: { file: Blob; alt: string }[], target: PhotoTarget) => {
    const prepared: { preview: string; p: Awaited<ReturnType<typeof prepareJournalPhoto>>; alt: string }[] = [];
    for (const it of items) {
      try {
        const p = await prepareJournalPhoto(it.file);
        prepared.push({ preview: p.url, p, alt: it.alt });
      } catch (e) {
        toast(e instanceof PhotoError ? e.message : "We couldn’t open that photo");
      }
    }
    if (!prepared.length) return;
    setUploading((u) => new Set([...u, ...prepared.map((x) => x.preview)]));
    update((c) => placePhotos(c, target, prepared.map((x) => ({ src: x.preview, alt: x.alt, w: x.p.width, h: x.p.height }))));
    let postId: string;
    try {
      postId = await ensureId();
    } catch {
      toast("The post couldn’t be saved, so the photos weren’t added");
      prepared.forEach((x) => update((c) => settlePhoto(c, x.preview, null)));
      return;
    }
    await Promise.all(
      prepared.map(async (x) => {
        try {
          const photo = await uploadPrepared(postId, x.p, x.alt);
          update((c) => settlePhoto(c, x.preview, photo));
        } catch (e) {
          toast(`A photo didn’t upload: ${(e as Error).message}`);
          update((c) => settlePhoto(c, x.preview, null));
        } finally {
          setUploading((u) => {
            const next = new Set(u);
            next.delete(x.preview);
            return next;
          });
          // The preview stays on screen until the stored photo has loaded in its place.
          setTimeout(() => URL.revokeObjectURL(x.preview), 10_000);
        }
      }),
    );
  };

  const onFiles = (files: File[], target: PhotoTarget) =>
    void addPrepared(
      files.map((f) => ({ file: f, alt: "" })),
      target,
    );

  const onPicked = async (picked: Picked[], target: PhotoTarget) => {
    // Credit the vendors whose photos are used.
    update((c) => ({ ...c, vendors: [...c.vendors, ...picked.map((p) => p.vendor.id).filter((v, i, all) => !c.vendors.includes(v) && all.indexOf(v) === i)] }));
    const items: { file: Blob; alt: string }[] = [];
    for (const p of picked) {
      try {
        const prepared = await fetchVendorPhoto(p.url);
        URL.revokeObjectURL(prepared.url);
        items.push({ file: prepared.full, alt: `Photo by ${p.vendor.name}` });
      } catch {
        toast(`Couldn’t copy a photo from ${p.vendor.name}`);
      }
    }
    await addPrepared(items, target);
  };

  // ── Publishing ────────────────────────────────────────────────────────

  const at = when ? melbourneIso(when.date, when.time) : undefined;
  const future = !!at && Date.parse(at) > now;
  const unsaved = save === "pending" || save === "saving" || save === "error" || save === "stale";
  const unpublished = effective !== "draft" && (!!live?.edits || unsaved || (!!at && at !== live?.publishedAt));

  const run = async (label: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      if (e instanceof StaleError) setSave("stale");
      else toast(e instanceof SlugTakenError ? `${e.message}. Change the address and try again.` : (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const publish = (now = false) =>
    run("publish", async () => {
      if (!content.title.trim()) {
        setFocus({ id: "title", at: "start", nonce: Date.now() });
        throw new Error("Give the post a title first");
      }
      if (uploading.size) throw new Error("Wait for the photos to finish uploading");
      if (!SLUG.test(content.slug || slugify(content.title))) throw new Error("The address can only use letters, numbers and dashes");
      await flush();
      const current = peekPost(idRef.current!);
      if (!current) throw new Error("The post went missing");
      const result = await publishPost(current, latest.current, now ? new Date().toISOString() : at);
      setWhen(result.future ? melbourneParts(at!) : null);
      setSlugTaken(false);
      setSlugTouched(true);
      setSave("saved");
      setSavedAt(new Date().toISOString());
      const url = `/blog/${result.slug}`;
      toast(
        result.future ? `Scheduled for ${day(at!)} at ${clock(at!)}` : effective === "published" ? "Changes published" : "Published on the blog",
        result.future ? undefined : { label: "View", run: () => window.open(url, "_blank") },
      );
    });

  const unpublish = () =>
    run("unpublish", async () => {
      await flush();
      await unpublishPost(peekPost(idRef.current!)!);
      setWhen(null);
      toast("Taken off the blog. It’s a draft again.");
    });

  const discard = () =>
    run("discard", async () => {
      await flush();
      const current = peekPost(idRef.current!)!;
      await discardEdits(current);
      const fresh = peekPost(current.id)!;
      latest.current = fresh.saved;
      version.current++;
      savedVersion.current = version.current;
      setContent(fresh.saved);
      setWhen(statusOf(fresh) === "scheduled" && fresh.publishedAt ? melbourneParts(fresh.publishedAt) : null);
      setSave("saved");
      toast("Changes discarded. It’s back to what’s published.");
    });

  const remove = () =>
    run("delete", async () => {
      if (idRef.current) {
        while (inFlight.current) await inFlight.current.catch(() => undefined);
        await deletePost(peekPost(idRef.current)!);
      }
      version.current = savedVersion.current;
      setConfirmDelete(false);
      router.push("/admin/journal");
      toast("Post deleted");
    });

  const reloadLatest = async () => {
    if (!idRef.current) return;
    await reloadPost(idRef.current);
    const fresh = peekPost(idRef.current);
    if (!fresh) return router.push("/admin/journal");
    const c = fresh.edits?.content ?? fresh.saved;
    latest.current = c;
    version.current++;
    savedVersion.current = version.current;
    setContent(c);
    setSave("saved");
  };

  const primary =
    effective === "draft"
      ? { label: future ? "Schedule" : "Publish", run: () => publish() }
      : scheduled
        ? { label: future ? (unpublished ? "Update schedule" : "Scheduled") : "Publish now", run: () => publish(!future), disabled: future && !unpublished }
        : { label: "Publish changes", run: () => publish(), disabled: !unpublished };

  const menu = [
    ...(effective === "published" && live ? [{ label: "View on the blog", run: () => window.open(`/blog/${live.saved.slug}`, "_blank") }] : []),
    ...(scheduled ? [{ label: "Publish now", run: () => publish(true) }] : []),
    ...(effective !== "draft" && (live?.edits || unpublished) ? [{ label: "Discard changes", run: discard }] : []),
    ...(effective !== "draft" ? [{ label: effective === "published" ? "Take off the blog" : "Cancel the schedule", run: unpublish }] : []),
    { label: "Delete post", run: () => setConfirmDelete(true), danger: true },
  ];

  // ── What it adds up to ────────────────────────────────────────────────

  const words = useMemo(() => wordCount([content.title, content.standfirst, bodyText(content.body)].join(" ")), [content]);
  const minutes = readingMinutes(words);
  const shownDate = at ?? live?.publishedAt ?? undefined;
  const credited = (vendors.data ?? []).filter((v) => content.vendors.includes(v.id)).sort((a, b) => content.vendors.indexOf(a.id) - content.vendors.indexOf(b.id));
  const closePreview = useCallback(() => setPreviewing(false), []);

  const stateLine =
    save === "stale"
      ? null
      : save === "error"
        ? "Couldn’t save. Retrying when you next type."
        : save === "saving" || save === "pending"
          ? "Saving"
          : effective === "draft"
            ? savedAt
              ? `Draft, saved ${clock(savedAt)}`
              : live
                ? `Draft, saved ${day(live.updatedAt)}`
                : "Draft. Saves as you write."
            : unpublished
              ? savedAt
                ? `Unpublished changes, saved ${clock(savedAt)}`
                : "Unpublished changes"
              : scheduled
                ? `Scheduled for ${day(live!.publishedAt!)} at ${clock(live!.publishedAt!)}`
                : "Live on the blog";

  return (
    <>
      <div className="sticky top-16 z-10 -mx-[var(--gutter)] -mt-8 mb-8 border-b hairline bg-paper/90 px-[var(--gutter)] backdrop-blur-xl md:-mt-10">
        <div className="flex min-h-16 flex-wrap items-center gap-x-5 gap-y-2 py-3">
          <nav className="flex min-w-0 flex-1 items-center gap-2 text-[0.875rem] text-ink-soft">
            <Link href="/admin/journal" className="inline-flex shrink-0 items-center gap-1.5 transition-colors hover:text-ink">
              <Icon name="chevron-left" className="size-3.5" strokeWidth={1.5} />
              Journal
            </Link>
            <span aria-hidden>/</span>
            <span className="min-w-0 truncate text-ink">{content.title || "New post"}</span>
          </nav>
          <p aria-live="polite" className="flex items-center gap-2 text-[0.8125rem] text-ink-soft">
            {stateLine && (
              <>
                <span
                  aria-hidden
                  className={clsx(
                    "size-1.5 rounded-full",
                    save === "error" ? "bg-bad" : save === "saving" || save === "pending" ? "animate-pulse bg-ink/40" : effective === "published" && !unpublished ? "bg-good" : scheduled || unpublished ? "bg-warn" : "bg-ink/25",
                  )}
                />
                {stateLine}
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Btn onClick={() => setPreviewing(true)} icon="eye">
              Preview
            </Btn>
            <Btn variant="primary" onClick={primary.run} disabled={!!busy || primary.disabled}>
              {busy === "publish" ? "Publishing" : primary.label}
            </Btn>
            <More items={menu} disabled={!!busy || (!id && !unsaved)} />
          </div>
        </div>
        {save === "stale" && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t hairline py-3 text-[0.875rem]">
            <span className="text-bad">Someone changed this post in another tab or on another computer after you opened it. Your latest changes aren&rsquo;t saved.</span>
            <Btn size="sm" onClick={() => void reloadLatest()}>
              Load the latest version
            </Btn>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-y-10 xl:grid-cols-12 xl:gap-x-[clamp(2rem,3vw,3.5rem)]">
        <div className="min-w-0 xl:col-span-8 lg:pl-12">
          <Canvas
            content={content}
            update={setTitleSlug}
            uploading={uploading}
            onFiles={onFiles}
            onLibrary={setLibrary}
            date={shownDate}
            minutes={minutes}
            focus={focus}
            setFocus={setFocus}
          />
        </div>
        <aside className="min-w-0 xl:sticky xl:top-36 xl:col-span-4 xl:max-h-[calc(100vh-10rem)] xl:self-start xl:overflow-y-auto">
          <Settings
            content={content}
            update={update}
            onSlugTouched={() => setSlugTouched(true)}
            slugTaken={slugTaken}
            live={effective === "published"}
            liveSlug={live && effective === "published" ? live.saved.slug : ""}
            when={when}
            onWhen={setWhen}
            publishedAt={live?.publishedAt ?? null}
            vendors={vendors.data ?? []}
            words={words}
            minutes={minutes}
          />
        </aside>
      </div>

      <FormatBar vendors={vendors.data ?? []} />

      <PhotoLibrary
        open={!!library}
        title={library?.kind === "cover" ? "Choose a cover" : library?.kind === "replace" ? "Replace the photo" : "Add photos"}
        max={library?.kind === "insert" ? 3 : library?.kind === "add" ? Math.max(1, 3 - ((content.body.find((b) => b.id === library.blockId) as { images?: unknown[] } | undefined)?.images?.length ?? 0)) : 1}
        vendors={vendors.data ?? []}
        loading={vendors.status === "loading"}
        credited={content.vendors}
        onClose={() => setLibrary(null)}
        onPick={(picked) => {
          const target = library!;
          setLibrary(null);
          void onPicked(picked, target);
        }}
        onUpload={(files) => {
          const target = library!;
          setLibrary(null);
          onFiles(files, target);
        }}
      />

      <AnimatePresence>
        {previewing && (
          <PreviewFrame
            views={[
              { id: "desktop", label: "Computer" },
              { id: "phone", label: "Phone" },
            ]}
            view={view}
            onView={setView}
            onClose={closePreview}
          >
            <div className={clsx("mx-auto pb-24 transition-[max-width] duration-500 ease-out-expo", view === "phone" ? "max-w-[390px] border-x hairline" : "max-w-none")}>
              <Article
                post={{
                  title: content.title,
                  standfirst: content.standfirst,
                  category: content.category,
                  cover: content.cover ? { ...content.cover, src: photoUrl(content.cover.src) } : undefined,
                  body: content.body,
                  author: content.author,
                  date: shownDate,
                  minutes,
                }}
                vendors={credited.map((v) => ({ slug: v.slug, name: v.name, discipline: v.discipline, cover: v.photo }))}
              />
            </div>
          </PreviewFrame>
        )}
      </AnimatePresence>

      <Drawer
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this post?"
        width="max-w-md"
        footer={
          <>
            <Btn onClick={() => setConfirmDelete(false)} className="mr-auto">
              Keep it
            </Btn>
            <Btn variant="danger" icon="trash" onClick={remove} disabled={busy === "delete"}>
              {busy === "delete" ? "Deleting" : "Delete for good"}
            </Btn>
          </>
        }
      >
        <div className="p-6">
          {content.cover && (
            // eslint-disable-next-line @next/next/no-img-element -- the cover straight from Storage
            <img src={photoUrl(content.cover.src)} alt="" className="mb-5 aspect-[3/2] w-full bg-paper-soft object-cover" />
          )}
          <p className="font-display text-[1.5rem] leading-tight text-ink">{content.title || "Untitled"}</p>
          <p className="mt-3 text-[0.9375rem] text-ink-soft">
            {effective === "published"
              ? "It comes off the blog straight away, with its photos. Links to it will stop working."
              : "The post and its photos are removed. This can’t be undone."}
          </p>
        </div>
      </Drawer>
    </>
  );
}

function More({ items, disabled }: { items: { label: string; run: () => void; danger?: boolean }[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div ref={root} className="relative">
      <Btn icon="more" aria-label="More" aria-haspopup="menu" aria-expanded={open} disabled={disabled} onClick={() => setOpen((o) => !o)} />
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-[calc(100%+0.5rem)] right-0 z-40 min-w-52 border border-ink/10 bg-surface py-1.5 shadow-[0_24px_48px_-20px_rgb(22_20_18/0.22)]"
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

function EditorSkeleton() {
  return (
    <div aria-busy="true">
      <div className="mb-8 flex h-16 items-center justify-between border-b hairline">
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-y-10 xl:grid-cols-12 xl:gap-x-[clamp(2rem,3vw,3.5rem)]">
        <div className="xl:col-span-8 lg:pl-12">
          <div className="mx-auto max-w-[42rem]">
            <Skeleton className="h-[clamp(2.5rem,4.4vw,4.25rem)] w-full" />
            <Skeleton className="mt-3 h-[clamp(2.5rem,4.4vw,4.25rem)] w-2/3" />
            <SkeletonLines lines={2} className="mt-7 max-w-[40ch] text-[1.25rem]" />
            <Skeleton className="mt-6 h-3.5 w-48" />
          </div>
          <Skeleton className="mt-10 aspect-[3/2] w-full" />
          <SkeletonLines lines={4} className="mx-auto mt-12 max-w-[42rem] text-[1.0625rem] leading-[1.8]" />
        </div>
        <div className="space-y-6 xl:col-span-4">
          {[4, 2, 3].map((rows, i) => (
            <div key={i} className="bg-surface px-6 py-5">
              <Skeleton className="h-5 w-32" />
              <div className="mt-5 space-y-4">
                {Array.from({ length: rows }, (_, j) => (
                  <div key={j} className="flex gap-4">
                    <Skeleton className="h-4 w-24 shrink-0" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
