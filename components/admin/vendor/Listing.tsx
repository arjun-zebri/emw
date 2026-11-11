"use client";

import { useState } from "react";
import { addPhotos, movePhoto, readListing, removePhoto, saveDetails, useOwnListing, type OwnListing } from "@/lib/account/listing";
import { useSession, useVendorSlug } from "@/lib/admin/session";
import { toast } from "@/lib/admin/toast";
import { normaliseStory, splitStory } from "@/lib/story";
import { VendorForm, emptyVendor, type VendorFormValues } from "../shared/VendorForm";
import { Btn, Empty, PageHeader } from "../ui";

const valuesOf = (l: OwnListing): VendorFormValues => ({
  ...emptyVendor,
  name: l.name,
  person: l.person,
  discipline: l.discipline,
  lede: l.lede,
  story: l.story.join("\n\n"),
  services: l.services,
  based: l.based,
  serviceArea: l.serviceArea,
  languages: l.languages,
  email: l.email,
  phone: l.phone,
  website: l.website,
  instagram: l.instagram,
  facebook: l.facebook,
});

/**
 * The vendor edits their own listing, saved to the database. Words and details save together with
 * the button; photos save as each one is added, moved or removed. The team can open this page to
 * see what a vendor sees, but only reads it: the listing shown is a real one.
 */
export function Listing() {
  const session = useSession();
  const slug = useVendorSlug();
  const { status, error, listing, uploading } = useOwnListing(slug);
  const [saving, setSaving] = useState(false);
  const team = session?.role === "team";

  const save = async (v: VendorFormValues) => {
    if (!slug) return;
    setSaving(true);
    try {
      await saveDetails(slug, { ...v, story: normaliseStory(splitStory(v.story)) });
      toast(listing?.status === "published" ? "Saved. Your page is up to date." : "Saved");
    } catch (e) {
      toast(`Couldn’t save your listing: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const photoEditor = slug &&
    listing && {
      photos: listing.photos.map((p) => p.src),
      pending: uploading,
      onAdd: async (files: File[]) => {
        const before = listing.photos.length;
        const problems = await addPhotos(slug, files);
        const added = (readListing(slug)?.photos.length ?? before) - before;
        const done = added === 1 ? "Photo added." : added > 1 ? `${added} photos added.` : "";
        toast([done, ...problems].filter(Boolean).join(" "));
      },
      onMove: (from: number, to: number) => {
        movePhoto(slug, from, to)
          .then(() => to === 0 && toast("New cover saved"))
          .catch((e: Error) => toast(`Couldn’t move that photo: ${e.message}`));
      },
      onRemove: (i: number) => {
        const photo = listing.photos[i];
        if (photo) removePhoto(slug, photo.id).then(() => toast("Photo removed"), (e: Error) => toast(`Couldn’t remove that photo: ${e.message}`));
      },
    };

  return (
    <>
      <PageHeader
        title="Your listing"
        description={team ? `${listing?.name ?? "A vendor"}'s listing as they see it. Only the vendor can change it here.` : "What couples see in the directory and on your page."}
        actions={
          listing?.status === "published" && (
            <Btn href={`/vendors/${listing.slug}`} external icon="arrow-up-right">
              {team ? "View their page" : "View your page"}
            </Btn>
          )
        }
      />
      {status === "error" ? (
        <div className="border border-ink/[0.09] bg-surface">
          <Empty title="Couldn’t load your listing">{error}</Empty>
        </div>
      ) : !listing || !photoEditor ? (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12" aria-busy="true">
          <div className="aspect-[4/5] animate-pulse bg-paper-soft lg:col-span-7 lg:aspect-auto lg:h-[min(48rem,calc(100svh-17rem))]" />
          <div className="space-y-4 lg:col-span-5">
            <div className="h-12 w-3/4 animate-pulse bg-paper-soft" />
            <div className="h-4 w-1/2 animate-pulse bg-paper-soft" />
          </div>
        </div>
      ) : (
        <VendorForm key={listing.id} mode="vendor" initial={valuesOf(listing)} onSubmit={(v) => void save(v)} submitLabel="Save changes" photoEditor={photoEditor} readOnly={team} saving={saving} />
      )}
    </>
  );
}
