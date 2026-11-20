"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { Listing } from "../vendor/Listing";

/** Admin → Vendors → a vendor: their listing in the same editor they use, editable by the team. */
export function VendorListing() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <>
      <BackToVendors />
      <Listing slug={slug} />
    </>
  );
}

export function BackToVendors() {
  return (
    <Link href="/admin/vendors" className="t-small mb-5 inline-flex items-center gap-1.5 text-ink-mute transition-colors hover:text-ink">
      <Icon name="chevron-left" className="size-3.5" strokeWidth={1.5} />
      Vendors
    </Link>
  );
}
