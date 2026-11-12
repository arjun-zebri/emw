"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import type { CreditVendor } from "@/lib/admin/journal";
import { thumbUrl } from "@/lib/supabase/storage";
import { Drawer } from "../Drawer";
import { Btn, inputCls } from "../ui";

/*
 * Every photo on the directory, by vendor, with the vendors in this story first, and an upload.
 * A cover or a replacement is one click; a new row takes up to `max`, chosen in order, so the row
 * comes out as picked. The photo is copied into the post, credited to the vendor in its description.
 */

export type Picked = { url: string; vendor: CreditVendor };

export function PhotoLibrary({
  open,
  title,
  max,
  vendors,
  loading,
  credited,
  onClose,
  onPick,
  onUpload,
}: {
  open: boolean;
  title: string;
  max: number;
  vendors: CreditVendor[];
  loading: boolean;
  credited: string[];
  onClose: () => void;
  onPick: (photos: Picked[]) => void;
  onUpload: (files: File[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<Picked[]>([]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const shown = vendors.filter((v) => v.photos.length && (!q || v.name.toLowerCase().includes(q) || v.discipline.toLowerCase().includes(q)));
    const first = shown.filter((v) => credited.includes(v.id)).sort((a, b) => credited.indexOf(a.id) - credited.indexOf(b.id));
    return [...first, ...shown.filter((v) => !credited.includes(v.id))];
  }, [vendors, query, credited]);

  const close = () => {
    setChosen([]);
    setQuery("");
    onClose();
  };

  const toggle = (p: Picked) => {
    if (max === 1) {
      onPick([p]);
      setChosen([]);
      setQuery("");
      return;
    }
    setChosen((c) => (c.some((x) => x.url === p.url) ? c.filter((x) => x.url !== p.url) : c.length < max ? [...c, p] : c));
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      title={title}
      width="max-w-4xl"
      footer={
        <>
          <span className="mr-auto text-[0.8125rem] text-ink-soft">
            {max > 1 ? (chosen.length ? `${chosen.length} of up to ${max} chosen, in this order` : `Choose up to ${max} for one row`) : "Copied into the post, so it stays if the listing changes"}
          </span>
          <Btn
            icon="upload"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.multiple = max > 1;
              input.onchange = () => {
                const files = [...(input.files ?? [])];
                if (files.length) {
                  onUpload(files);
                  close();
                }
              };
              input.click();
            }}
          >
            Upload
          </Btn>
          {max > 1 && (
            <Btn
              variant="primary"
              disabled={!chosen.length}
              onClick={() => {
                onPick(chosen);
                close();
              }}
            >
              {chosen.length > 1 ? `Add ${chosen.length} photos` : "Add photo"}
            </Btn>
          )}
        </>
      }
    >
      <div className="sticky top-0 z-10 border-b hairline bg-paper px-6 py-4">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-ink-mute" strokeWidth={1.5} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a vendor" aria-label="Find a vendor" className={clsx(inputCls, "pl-7")} />
        </div>
      </div>

      <div className="space-y-10 p-6">
        {loading
          ? [0, 1].map((g) => (
              <div key={g}>
                <Skeleton className="h-5 w-48" />
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="aspect-[4/5] w-full" />
                  ))}
                </div>
              </div>
            ))
          : groups.map((v) => (
              <section key={v.id}>
                <h3 className="flex items-baseline gap-3">
                  <span className="font-display text-[1.1875rem] text-ink">{v.name}</span>
                  <span className="truncate text-[0.8125rem] text-ink-soft">{credited.includes(v.id) ? "In this story" : v.discipline}</span>
                </h3>
                <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {v.photos.map((url) => {
                    const n = chosen.findIndex((c) => c.url === url);
                    return (
                      <li key={url}>
                        <button type="button" onClick={() => toggle({ url, vendor: v })} aria-pressed={n >= 0} className="group relative block w-full overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails straight from Storage */}
                          <img
                            src={thumbUrl(url)}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="aspect-[4/5] w-full bg-paper-soft object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
                          />
                          <span className={clsx("absolute inset-0 ring-2 ring-inset transition-colors", n >= 0 ? "ring-ink" : "ring-transparent")} />
                          {n >= 0 && <span className="absolute top-2 right-2 flex size-6 items-center justify-center bg-ink text-[0.75rem] text-paper tabular-nums">{n + 1}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
        {!loading && !groups.length && <p className="text-[0.9375rem] text-ink-soft">No vendor matches &ldquo;{query}&rdquo;.</p>}
      </div>
    </Drawer>
  );
}
