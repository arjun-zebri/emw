"use client";

import { useVendorSlug } from "@/lib/admin/session";
import { toast } from "@/lib/admin/toast";
import { update, useAdmin } from "@/lib/admin/store";
import { findAdminVendor } from "@/lib/admin/vendors";
import { VendorForm, emptyVendor, type VendorFormValues } from "../shared/VendorForm";
import { Btn, PageHeader } from "../ui";

/** The vendor edits their own listing. In the demo, changes are kept in the browser and show in the admin. */
export function Listing() {
  const slug = useVendorSlug();
  const state = useAdmin();
  const vendor = findAdminVendor(state, slug);
  if (!vendor) return null;

  const initial: VendorFormValues = {
    ...emptyVendor,
    name: vendor.name,
    person: vendor.person ?? "",
    discipline: vendor.discipline,
    lede: vendor.lede,
    services: vendor.services,
    based: vendor.based ?? "",
    serviceArea: vendor.serviceArea,
    languages: vendor.languages,
    email: vendor.email ?? "",
    phone: vendor.phone ?? "",
    website: vendor.website ?? "",
    instagram: vendor.instagram ?? "",
    facebook: vendor.facebook ?? "",
    photos: vendor.photos,
  };

  const save = (v: VendorFormValues) => {
    update((s) => ({
      listingEdits: {
        ...s.listingEdits,
        [slug]: {
          name: v.name,
          person: v.person || undefined,
          discipline: v.discipline,
          lede: v.lede,
          based: v.based || undefined,
          services: v.services,
          serviceArea: v.serviceArea,
          languages: v.languages,
          email: v.email || undefined,
          phone: v.phone || undefined,
          website: v.website || undefined,
          instagram: v.instagram || undefined,
          facebook: v.facebook || undefined,
        },
      },
    }));
    toast("Listing updated");
  };

  return (
    <>
      <PageHeader
        title="Your listing"
        description="What couples see in the directory and on your page."
        actions={
          <Btn href={`/vendors/${slug}`} external icon="arrow-up-right">
            View your page
          </Btn>
        }
      />
      <VendorForm key={JSON.stringify(state.listingEdits[slug] ?? {})} mode="vendor" initial={initial} onSubmit={save} submitLabel="Save changes" lockedPhotos={vendor.isNew ? undefined : vendor.photos} />
    </>
  );
}
