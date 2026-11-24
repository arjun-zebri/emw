"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";
import { Icon } from "@/components/icons/Icon";
import { refreshDraft } from "@/lib/admin/drafts";
import { editHref } from "../nav";
import { Listing, ListingSkeleton } from "../vendor/Listing";

/**
 * Admin → Vendors → a vendor: their listing in the same editor they use, editable by the team. Opened
 * from Approvals (`from`), it's a draft being put right before it's approved, and goes back there.
 */
export function VendorListing() {
  const params = useSearchParams();
  const slug = params.get("slug") ?? "";
  const from = useFrom();
  const router = useRouter();
  // No vendor in the address: nothing to edit, so back to the list.
  useEffect(() => {
    if (!slug) router.replace("/admin/vendors");
  }, [slug, router]);
  // Leaving, the queue reads the draft again so it shows what was just saved.
  useEffect(() => () => void refreshDraft(slug), [slug]);
  return (
    <>
      <BackToVendors from={from} />
      {/* Approved here, it's back to the queue, without the business that's now gone from it. */}
      {slug ? <Listing slug={slug} approvedTo={withoutItem(from ?? "/admin/approvals")} /> : <ListingSkeleton />}
    </>
  );
}

/** Where the editor was opened from: Approvals, or (by default) Admin → Vendors. */
function useFrom() {
  const from = useSearchParams().get("from");
  return from?.startsWith("/admin/approvals") ? from : undefined;
}

function withoutItem(path: string) {
  const [base, query = ""] = path.split("?");
  const q = new URLSearchParams(query);
  q.delete("item");
  return q.size ? `${base}?${q}` : base;
}

/** The editor's old address (/admin/vendors/<slug>), sent on to the new one. */
export function OldVendorLink() {
  const { slug } = useParams<{ slug: string }>();
  const from = useFrom();
  const router = useRouter();
  useEffect(() => router.replace(editHref(slug, from)), [slug, from, router]);
  return null;
}

/**
 * The editor always opens at its top. Coming from far down the vendor grid, the browser otherwise
 * keeps whatever of the old scroll fits the shorter loading outline, leaving the top under the bar.
 */
function OpenAtTop() {
  useLayoutEffect(() => scrollTo(0, 0), []);
  return null;
}

export function BackToVendors({ from }: { from?: string }) {
  return (
    <>
      <OpenAtTop />
      <Link href={from ?? "/admin/vendors"} className="t-small mb-5 inline-flex items-center gap-1.5 text-ink-mute transition-colors hover:text-ink">
        <Icon name="chevron-left" className="size-3.5" strokeWidth={1.5} />
        {from ? "Approvals" : "Vendors"}
      </Link>
    </>
  );
}
