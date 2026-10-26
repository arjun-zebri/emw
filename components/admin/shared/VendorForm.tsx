"use client";

import clsx from "clsx";
import { useCallback, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import { Button } from "@/components/ui/Button";
import { languages as languageNames, serviceLabels, states } from "@/data/taxonomy";
import type { Language, Service, StateCode } from "@/data/types";
import { tierOrder, tiers, type TierId } from "@/lib/admin/billing";
import { aud } from "@/lib/admin/format";
import { AnimatePresence } from "motion/react";
import { DetailRow, bare, rowInput } from "./DetailRow";
import { Dropdown } from "./Dropdown";
import { VendorPreview } from "./VendorPreview";

export type VendorFormValues = {
  name: string;
  person: string;
  discipline: string;
  lede: string;
  services: Service[];
  based: string;
  serviceArea: StateCode[];
  languages: Language[];
  email: string;
  phone: string;
  website: string;
  instagram: string;
  facebook: string;
  photos: string[];
  tier: TierId;
  billing: "monthly" | "annual";
};

export const emptyVendor: VendorFormValues = {
  name: "",
  person: "",
  discipline: "",
  lede: "",
  services: [],
  based: "",
  serviceArea: [],
  languages: [],
  email: "",
  phone: "",
  website: "",
  instagram: "",
  facebook: "",
  photos: [],
  tier: "essential",
  billing: "annual",
};

const serviceOptions = (Object.keys(serviceLabels) as Service[]).map((s) => ({ value: s, label: serviceLabels[s] }));
const stateOptions = (Object.keys(states) as StateCode[]).map((s) => ({ value: s, label: s }));
const languageOptions = (Object.keys(languageNames) as Language[]).map((l) => ({
  value: l,
  label: languageNames[l].native,
  hint: languageNames[l].native === l ? undefined : l,
  lang: languageNames[l].lang,
}));

/** Shrink an upload to at most 1400px on its long side, as a JPEG data URL, so the demo can keep it in the browser. */
async function resize(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

/**
 * A vendor's listing, edited in place on a copy of their page: photos on the left, the name, line,
 * languages and details on the right, set as couples will see them. Below, the details only the team
 * sees. The admin uses it to add a business (with a plan); vendors use it to edit their own listing.
 */
export function VendorForm({
  mode,
  initial,
  onSubmit,
  submitLabel,
  lockedPhotos,
}: {
  mode: "admin" | "vendor";
  initial: VendorFormValues;
  onSubmit: (values: VendorFormValues) => void;
  submitLabel: string;
  /** Photos shown read-only (listed vendors in the demo); uploads are disabled when set. */
  lockedPhotos?: string[];
}) {
  const [v, setV] = useState(initial);
  const [tried, setTried] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const set = <K extends keyof VendorFormValues>(key: K, value: VendorFormValues[K]) => setV((s) => ({ ...s, [key]: value }));
  const errors = {
    name: !v.name.trim() ? "Add the business name" : undefined,
    discipline: !v.discipline.trim() ? "Add what they do, e.g. Wedding photography" : undefined,
  };
  const photos = lockedPhotos ?? v.photos;

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const images = [...files].filter((f) => f.type.startsWith("image/")).slice(0, 12 - v.photos.length);
    const urls = await Promise.all(images.map(resize));
    setV((s) => ({ ...s, photos: [...s.photos, ...urls] }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (errors.name || errors.discipline) {
      document.querySelector<HTMLInputElement>(`[name="${errors.name ? "vf-name" : "vf-discipline"}"]`)?.focus();
      return;
    }
    onSubmit({ ...v, name: v.name.trim(), discipline: v.discipline.trim() });
  };

  const drop = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
  };
  const choose = () => fileInput.current?.click();
  const closePreview = useCallback(() => setPreviewing(false), []);
  const tongues = v.languages.filter((l) => l !== "English");
  const canAdd = !lockedPhotos && v.photos.length < 12;

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:gap-x-[clamp(2rem,4vw,4.5rem)]">
      {/* The photographs, where they sit on the vendor's page: the cover, then the rest. */}
      <div className="min-w-0 lg:sticky lg:top-24 lg:col-span-7 lg:self-start" {...(lockedPhotos ? {} : drop)}>
        <input ref={fileInput} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} tabIndex={-1} />
        <div
          className={clsx(
            "relative aspect-[4/5] w-full overflow-hidden bg-paper-soft lg:aspect-auto",
            // Leave room for the strip of other photos so the column still fits the screen while it sticks.
            photos.length > 1 ? "lg:h-[min(48rem,calc(100svh-17rem))]" : "lg:h-[min(56rem,calc(100svh-8rem))]",
          )}
        >
          {photos[0] ? (
            <>
              <Thumb src={photos[0]} sizes="(min-width: 1024px) 50vw, 100vw" />
              {canAdd && (
                <button type="button" onClick={choose} className="t-nav absolute right-4 bottom-4 flex h-10 items-center gap-2 bg-paper/90 px-4 text-ink backdrop-blur transition-colors hover:bg-paper">
                  <Icon name="plus" className="size-3.5" strokeWidth={1.5} />
                  Add photos
                </button>
              )}
            </>
          ) : lockedPhotos ? null : (
            <button
              type="button"
              onClick={choose}
              className={clsx("group absolute inset-0 flex flex-col items-center justify-center transition-colors duration-500", dragging && "bg-ink/[0.06]")}
            >
              <span className="t-nav inline-flex h-12 items-center gap-2.5 border border-ink/25 px-7 text-ink transition-colors duration-300 group-hover:border-ink">
                <Icon name="plus" className="size-3.5" strokeWidth={1.5} />
                Add photos
              </span>
              <span className="t-small mt-4">Or drop them here. The first one is the cover.</span>
            </button>
          )}
          {dragging && photos[0] && <span className="absolute inset-0 bg-paper/50" aria-hidden />}
        </div>

        {photos.length > 1 && (
          <ul className="mt-[clamp(0.5rem,1vw,1rem)] grid grid-cols-4 gap-[clamp(0.5rem,1vw,1rem)] sm:grid-cols-8">
            {photos.slice(1).map((src, k) => {
              const i = k + 1;
              return (
                <li key={src.slice(-40) + i} className="group relative aspect-[4/5] overflow-hidden bg-paper-soft">
                  <Thumb src={src} />
                  {!lockedPhotos && (
                    <span className="absolute inset-0 flex flex-col items-stretch justify-end gap-px bg-night/0 p-1.5 opacity-0 transition duration-300 group-focus-within:bg-night/25 group-focus-within:opacity-100 group-hover:bg-night/25 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => set("photos", [src, ...v.photos.filter((_, j) => j !== i)])}
                        className="bg-paper/95 py-1 text-[0.6875rem] text-ink hover:bg-paper"
                      >
                        Make cover
                      </button>
                      <button type="button" onClick={() => set("photos", v.photos.filter((_, j) => j !== i))} className="bg-paper/95 py-1 text-[0.6875rem] text-ink hover:bg-paper">
                        Remove
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {photos.length === 1 && !lockedPhotos && (
          <button type="button" onClick={() => set("photos", [])} className="t-small mt-3 transition-colors hover:text-ink">
            Remove cover
          </button>
        )}
        {lockedPhotos && <p className="t-small mt-3">Photo changes go through the East Meets Wed team for now.</p>}
      </div>

      {/* The vendor, set as on their page, every line editable in place. */}
      <div className="min-w-0 lg:col-span-5 lg:pt-1">
        <label htmlFor="vf-name" className="sr-only">
          Business name
        </label>
        <textarea
          id="vf-name"
          name="vf-name"
          rows={1}
          value={v.name}
          onChange={(e) => set("name", e.target.value.replace(/\n/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          aria-invalid={tried && !!errors.name}
          placeholder="Business name"
          autoComplete="off"
          className={clsx(bare, "resize-none font-display text-[clamp(2.5rem,3.6vw,4rem)] leading-[1] tracking-[-0.03em] text-balance [field-sizing:content] placeholder:text-ink-mute/35")}
        />
        {tried && errors.name && <p className="mt-1 text-[0.75rem] text-bad">{errors.name}</p>}

        <label htmlFor="vf-discipline" className="sr-only">
          What they do
        </label>
        <input
          id="vf-discipline"
          name="vf-discipline"
          value={v.discipline}
          onChange={(e) => set("discipline", e.target.value)}
          aria-invalid={tried && !!errors.discipline}
          placeholder="What they do, in one line"
          autoComplete="off"
          className={clsx(bare, "t-body mt-4 text-ink placeholder:text-ink-mute/55")}
        />
        {tried && errors.discipline && <p className="mt-1 text-[0.75rem] text-bad">{errors.discipline}</p>}

        {tongues.length > 0 && (
          <p className="t-title mt-3 flex flex-wrap gap-x-4 text-ink-soft">
            {tongues.map((l) => (
              <span key={l} lang={languageNames[l].lang} title={l}>
                {languageNames[l].native}
              </span>
            ))}
          </p>
        )}

        <label htmlFor="vf-lede" className="sr-only">
          Introduction
        </label>
        <textarea
          id="vf-lede"
          rows={2}
          value={v.lede}
          onChange={(e) => set("lede", e.target.value)}
          placeholder="A sentence or two, in their own words."
          className={clsx(bare, "t-title mt-8 min-h-[2lh] resize-none text-[1.5rem] leading-[1.3] text-pretty [field-sizing:content] placeholder:text-ink-mute/35")}
        />

        <dl className="mt-8 border-t hairline">
          <DetailRow label="Services" htmlFor="vf-services">
            <Dropdown id="vf-services" multiple options={serviceOptions} value={v.services} onChange={(x) => set("services", x)} placeholder="What couples can book them for" />
          </DetailRow>
          <DetailRow label="Languages" htmlFor="vf-languages">
            <Dropdown id="vf-languages" multiple options={languageOptions} value={v.languages} onChange={(x) => set("languages", x)} placeholder="The languages they work in" />
          </DetailRow>
          <DetailRow label="Based in" htmlFor="vf-based">
            <input id="vf-based" value={v.based} onChange={(e) => set("based", e.target.value)} placeholder="Suburb or city" className={rowInput} />
          </DetailRow>
          <DetailRow label="Travels to" htmlFor="vf-area">
            <Dropdown id="vf-area" multiple options={stateOptions} value={v.serviceArea} onChange={(x) => set("serviceArea", x)} placeholder="States they'll work in" />
          </DetailRow>
          <DetailRow label="Website" htmlFor="vf-web">
            <input id="vf-web" type="url" value={v.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" className={rowInput} />
          </DetailRow>
          <DetailRow label="Instagram" htmlFor="vf-ig">
            <input id="vf-ig" value={v.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="instagram.com/…" className={rowInput} />
          </DetailRow>
          <DetailRow label="Facebook" htmlFor="vf-fb">
            <input id="vf-fb" value={v.facebook} onChange={(e) => set("facebook", e.target.value)} placeholder="facebook.com/…" className={rowInput} />
          </DetailRow>
        </dl>

        <p className="t-small mt-10 mb-3">Only the team sees these</p>
        <dl className="border-t hairline">
          <DetailRow label="Contact" htmlFor="vf-person">
            <input id="vf-person" value={v.person} onChange={(e) => set("person", e.target.value)} placeholder="Who couples will hear from" className={rowInput} />
          </DetailRow>
          <DetailRow label="Email" htmlFor="vf-email">
            <input id="vf-email" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} placeholder="Where enquiries go" className={rowInput} />
          </DetailRow>
          <DetailRow label="Phone" htmlFor="vf-phone">
            <input id="vf-phone" type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} placeholder="04xx xxx xxx" className={rowInput} />
          </DetailRow>
          {mode === "admin" && (
            <DetailRow label="Plan" htmlFor="vf-plan">
              <Dropdown
                id="vf-plan"
                options={tierOrder.map((t) => ({ value: t, label: tiers[t].name, hint: aud(tiers[t][v.billing]), detail: tiers[t].perks.join(". ") }))}
                value={v.tier}
                onChange={(t) => set("tier", t)}
                placeholder="Choose a plan"
              />
            </DetailRow>
          )}
          {mode === "admin" && (
            <DetailRow label="Billing" htmlFor="vf-billing">
              <Dropdown
                id="vf-billing"
                options={[
                  { value: "annual" as const, label: `${aud(tiers[v.tier].annual)} a year`, hint: "Yearly" },
                  { value: "monthly" as const, label: `${aud(tiers[v.tier].monthly)} a month`, hint: "Monthly" },
                ]}
                value={v.billing}
                onChange={(b) => set("billing", b)}
                placeholder="Choose billing"
              />
            </DetailRow>
          )}
        </dl>

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <Button type="submit">{submitLabel}</Button>
          <Button type="button" variant="outline" onClick={() => setPreviewing(true)}>
            Preview
          </Button>
        </div>
      </div>

      <AnimatePresence>{previewing && <VendorPreview values={v} photos={photos} onClose={closePreview} />}</AnimatePresence>
    </form>
  );
}

function Thumb({ src, sizes = "200px" }: { src: string; sizes?: string }) {
  if (src.startsWith("data:")) {
    // eslint-disable-next-line @next/next/no-img-element -- uploads are data URLs, which next/image can't optimise
    return <img src={src} alt="" className="absolute inset-0 size-full object-cover" />;
  }
  return (
    <span className="absolute inset-0">
      <Media src={src} alt="" brief="" sizes={sizes} className="size-full" />
    </span>
  );
}
