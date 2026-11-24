"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Icon } from "@/components/icons/Icon";
import { refreshDraft } from "@/lib/admin/drafts";
import { Listing } from "../vendor/Listing";

/**
 * Admin → Vendors → a vendor: their listing in the same editor they use, editable by the team. Opened
 * from Approvals (`from`), it's a draft being put right before it's approved, and goes back there.
 */
export function VendorListing() {
  const { slug } = useParams<{ slug: string }>();
  const from = useFrom();
  // Leaving, the queue reads the draft again so it shows what was just saved.
  useEffect(() => () => void refreshDraft(slug), [slug]);
  return (
    <>
      <BackToVendors from={from} />
      <Listing slug={slug} />
    </>
  );
}

/** Where the editor was opened from: Approvals, or (by default) Admin → Vendors. */
function useFrom() {
  const from = useSearchParams().get("from");
  return from?.startsWith("/admin/approvals") ? from : undefined;
}

export function BackToVendors({ from }: { from?: string }) {
  return (
    <Link href={from ?? "/admin/vendors"} className="t-small mb-5 inline-flex items-center gap-1.5 text-ink-mute transition-colors hover:text-ink">
      <Icon name="chevron-left" className="size-3.5" strokeWidth={1.5} />
      {from ? "Approvals" : "Vendors"}
    </Link>
  );
}
