"use client";

import clsx from "clsx";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Skeleton, SkeletonLines } from "@/components/ui/Skeleton";
import { PhotoError, type PostContent, useCreditVendors } from "@/lib/admin/journal";
import { loadPages, preparePagePhoto, publishPage, type SitePage, StalePageError, uploadPagePhoto, useSitePages } from "@/lib/admin/pages";
import { toast } from "@/lib/admin/toast";
import { hasContent, isPageSlug, PAGES } from "@/lib/pages/pages";
import { Btn, Empty } from "../ui";
import { Canvas, type Focus } from "../journal/Canvas";
import { FormatBar } from "../journal/FormatBar";
import { type PhotoTarget, placePhotos, settlePhoto } from "../journal/ops";

/*
 * Writing About, Shared commitment or the Privacy policy, in the journal's editor: the page as
 * visitors will read it. Nothing saves by itself; "Publish" puts what's on screen on the site, and
 * leaving with changes unpublished asks first.
 */

export function PageEditor() {
  const { slug } = useParams<{ slug: string }>();
  const { status, pages, error } = useSitePages();
  const page = pages?.find((p) => p.slug === slug);

  if (!isPageSlug(slug)) return <Empty title="There’s no such page" action={<Btn href="/admin/pages">Back to the pages</Btn>} />;
  if (status === "loading" && !pages) return <EditorSkeleton />;
  if (!page) return <Empty title="The page didn’t load" action={<Btn href="/admin/pages">Back to the pages</Btn>}>{error}</Empty>;
  return <Editing key={page.slug} page={page} />;
}

function Editing({ page: initial }: { page: SitePage }) {
  const vendors = useCreditVendors();
  const [page, setPage] = useState(initial);
  const [content, setContent] = useState<PostContent>(initial.content);
  const [dirty, setDirty] = useState(false);
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<Set<string>>(() => new Set());
  const [drawn, setDrawn] = useState(0);
  const [focus, setFocus] = useState<Focus | null>(null);
  const meta = PAGES[page.slug];
  const live = hasContent(page.content.body);

  const update = useCallback((fn: (c: PostContent) => PostContent) => {
    setContent((c) => {
      const next = fn(c);
      if (next !== c) setDirty(true);
      return next;
    });
  }, []);

  // Don't let a tab close on unpublished words.
  useEffect(() => {
    if (!dirty && !uploading.size) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty, uploading]);

  const onFiles = async (files: File[], target: PhotoTarget) => {
    const prepared: { preview: string; p: Awaited<ReturnType<typeof preparePagePhoto>> }[] = [];
    for (const file of files) {
      try {
        const p = await preparePagePhoto(file);
        prepared.push({ preview: p.url, p });
      } catch (e) {
        toast(e instanceof PhotoError ? e.message : "We couldn’t open that photo");
      }
    }
    if (!prepared.length) return;
    setUploading((u) => new Set([...u, ...prepared.map((x) => x.preview)]));
    update((c) => placePhotos(c, target, prepared.map((x) => ({ src: x.preview, alt: "", w: x.p.width, h: x.p.height }))));
    await Promise.all(
      prepared.map(async (x) => {
        try {
          const photo = await uploadPagePhoto(page.slug, x.p);
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
          setTimeout(() => URL.revokeObjectURL(x.preview), 10_000);
        }
      }),
    );
  };

  const publish = async () => {
    if (busy) return;
    if (!content.title.trim()) {
      setFocus({ id: "title", at: "start", nonce: Date.now() });
      return toast("Give the page a title first");
    }
    if (uploading.size) return toast("Wait for the photos to finish uploading");
    setBusy(true);
    try {
      const saved = await publishPage(page, content);
      setPage(saved);
      setDirty(false);
      toast(hasContent(saved.content.body) ? (live ? "Changes published" : "Published on the site") : "Saved. It stays off the site until it has words.", hasContent(saved.content.body) ? { label: "View", run: () => window.open(meta.path, "_blank") } : undefined);
    } catch (e) {
      if (e instanceof StalePageError) setStale(true);
      else toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reload = async () => {
    const fresh = (await loadPages())?.find((p) => p.slug === page.slug);
    if (!fresh) return toast("The page didn’t load. Try again in a moment.");
    setPage(fresh);
    setContent(fresh.content);
    setDirty(false);
    setDrawn((d) => d + 1);
    setStale(false);
  };

  const stateLine = dirty ? "Changes not published yet" : live ? "Published" : "Not on the site yet";

  return (
    <>
      <div className="sticky top-16 z-10 -mt-8 mb-8 border-b hairline bg-paper/90 backdrop-blur-xl md:-mt-10">
        <div className="flex min-h-16 flex-wrap items-center gap-x-5 gap-y-2 py-3">
          <nav className="flex min-w-0 flex-1 items-center gap-2 text-[0.875rem] text-ink-soft">
            <Link href="/admin/pages" className="inline-flex shrink-0 items-center gap-1.5 transition-colors hover:text-ink">
              <Icon name="chevron-left" className="size-3.5" strokeWidth={1.5} />
              Pages
            </Link>
            <span aria-hidden>/</span>
            <span className="min-w-0 truncate text-ink">{meta.name}</span>
          </nav>
          <p aria-live="polite" className="flex items-center gap-2 text-[0.8125rem] text-ink-soft">
            <span aria-hidden className={clsx("size-1.5 rounded-full", dirty ? "bg-warn" : live ? "bg-good" : "bg-ink/25")} />
            {stateLine}
          </p>
          <div className="flex items-center gap-2">
            {live && (
              <Btn icon="arrow-up-right" href={meta.path} external>
                View
              </Btn>
            )}
            <Btn variant="primary" onClick={() => void publish()} disabled={busy || (!dirty && live)}>
              {busy ? "Publishing" : live ? "Publish changes" : "Publish"}
            </Btn>
          </div>
        </div>
        {stale && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t hairline py-3 text-[0.875rem]">
            <span className="text-bad">Someone changed this page in another tab or on another computer after you opened it. Your changes aren&rsquo;t published.</span>
            <Btn size="sm" onClick={() => void reload()}>
              Load the latest version
            </Btn>
          </div>
        )}
        {!live && !dirty && <p className="border-t hairline py-3 text-[0.875rem] text-ink-soft">{meta.empty}</p>}
      </div>

      <div className="mx-auto max-w-[64rem]">
        <Canvas
          content={content}
          update={update}
          version={drawn}
          uploading={uploading}
          onFiles={onFiles}
          minutes={0}
          focus={focus}
          setFocus={setFocus}
          plain
        />
      </div>

      <FormatBar vendors={vendors.data ?? []} />
    </>
  );
}

function EditorSkeleton() {
  return (
    <div aria-busy="true">
      <div className="mb-8 flex h-16 items-center justify-between border-b hairline">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="mx-auto max-w-[42rem]">
        <Skeleton className="h-[clamp(2.5rem,4.4vw,4.25rem)] w-3/5" />
        <SkeletonLines lines={2} className="mt-7 max-w-[40ch] text-[1.25rem]" />
      </div>
      <Skeleton className="mx-auto mt-10 aspect-[3/2] w-full max-w-[64rem]" />
      <SkeletonLines lines={4} className="mx-auto mt-12 max-w-[42rem] text-[1.0625rem] leading-[1.8]" />
    </div>
  );
}
