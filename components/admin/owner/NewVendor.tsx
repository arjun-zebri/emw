"use client";

import { useRouter } from "next/navigation";
import { toast } from "@/lib/admin/toast";
import { addVendor, nowIso, slugify, useAdmin } from "@/lib/admin/store";
import { adminVendors } from "@/lib/admin/vendors";
import { VendorForm, emptyVendor, type VendorFormValues } from "../shared/VendorForm";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";

export function NewVendor() {
  const router = useRouter();
  const state = useAdmin();

  const save = (v: VendorFormValues) => {
    const taken = new Set(adminVendors(state).map((x) => x.slug));
    const base = slugify(v.name) || "vendor";
    let slug = base;
    for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
    addVendor({
      slug,
      name: v.name,
      person: v.person || undefined,
      discipline: v.discipline,
      services: v.services,
      based: v.based || undefined,
      serviceArea: v.serviceArea,
      languages: v.languages,
      lede: v.lede,
      email: v.email || undefined,
      phone: v.phone || undefined,
      website: v.website || undefined,
      instagram: v.instagram || undefined,
      facebook: v.facebook || undefined,
      tier: v.tier,
      billing: v.billing,
      photos: v.photos,
      added: nowIso(),
      via: "admin",
    });
    toast(`${v.name} added`);
    router.push(`/admin/vendors/${slug}`);
  };

  return (
    <>
      <nav className="t-small mb-8 flex items-center gap-2">
        <Link href="/admin/vendors" className="inline-flex items-center gap-1.5 transition-colors hover:text-ink">
          <Icon name="chevron-left" className="size-3.5" strokeWidth={1.5} />
          Vendors
        </Link>
        <span aria-hidden>/</span>
        <h1 className="text-ink">Add a vendor</h1>
      </nav>
      <VendorForm mode="admin" initial={emptyVendor} onSubmit={save} submitLabel="Add vendor" />
    </>
  );
}
