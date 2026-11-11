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
import { LIMITS } from "@/lib/apply/application";
import { splitStory } from "@/lib/story";
import { AnimatePresence } from "motion/react";
import { StoryEditor } from "@/components/apply/StoryEditor";
import { Story } from "@/components/vendor/Story";
import { DetailRow, bare, rowInput } from "./DetailRow";
import { Dropdown } from "./Dropdown";
import { VendorPreview } from "./VendorPreview";

export type VendorFormValues = {
  name: string;
  person: string;
  discipline: string;
  lede: string;
  /** The story as the editor writes it: blocks separated by a blank line (lib/story.ts). */
  story: string;
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
  story: "",
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
 * Photos the form edits through someone else: the vendor's own listing saves each change to the
 * database as it's made, rather than with the rest of the form.
 */
export type PhotoEditor = {
  photos: string[];
  /** Photos on their way up, shown as placeholders at the end. */
  pending: number;
  onAdd: (files: File[]) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
};

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
  photoEditor,
  readOnly,
  saving,
}: {
  mode: "admin" | "vendor";
  initial: VendorFormValues;
  onSubmit: (values: VendorFormValues) => void;
  submitLabel: string;
  /** Photos saved as they change (the vendor's own listing). Without it, photos are part of the form's values. */
  photoEditor?: PhotoEditor;
  /** Shown but not editable (the team looking at a vendor's portal). */
  readOnly?: boolean;
  saving?: boolean;
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

  // Without an outside editor, photos live in the form's own values (kept in the browser).
  const ed: PhotoEditor = photoEditor ?? {
    photos: v.photos,
    pending: 0,
    onAdd: async (files) => {
      const urls = await Promise.all(files.slice(0, LIMITS.photosMax - v.photos.length).map(resize));
      setV((s) => ({ ...s, photos: [...s.photos, ...urls] }));
    },
    onMove: (from, to) =>
      setV((s) => {
        const next = [...s.photos];
        const [p] = next.splice(from, 1);
        next.splice(to, 0, p);
        return { ...s, photos: next };
      }),
    onRemove: (i) => setV((s) => ({ ...s, photos: s.photos.filter((_, j) => j !== i) })),
  };
  const photos = ed.photos;
  const editable = !readOnly;

  const addFiles = (files: FileList | null) => {
    const images = [...(files ?? [])].filter((f) => f.type.startsWith("image/"));
    if (images.length && editable) ed.onAdd(images);
    if (fileInput.current) fileInput.current.value = "";
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || saving) return;
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
  const you = mode === "vendor";
  const canAdd = editable && photos.length + ed.pending < LIMITS.photosMax;
  // The photo waiting for a second click to be removed.
  const [confirm, setConfirm] = useState<number | null>(null);
  // On a phone there's no hover: the first tap on a tile shows its buttons, the next one uses them.
  const [active, setActive] = useState<number | null>(null);
  const remove = (i: number) => {
    if (confirm !== i) return setConfirm(i);
    setConfirm(null);
    setActive(null);
    ed.onRemove(i);
  };
  const move = (from: number, to: number) => {
    setActive(null);
    ed.onMove(from, to);
  };
  const strip = [...photos.slice(1).map((src, k) => ({ src, i: k + 1 })), ...Array.from({ length: photos.length ? ed.pending : Math.max(0, ed.pending - 1) }, () => null)];

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:gap-x-[clamp(2rem,4vw,4.5rem)]">
      {/* The photographs, where they sit on the vendor's page: the cover, then the rest. */}
      <div className="min-w-0 lg:sticky lg:top-24 lg:col-span-7 lg:row-span-2 lg:self-start" {...(editable ? drop : {})}>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} tabIndex={-1} />
        <div
          className={clsx(
            "relative aspect-[4/5] w-full overflow-hidden bg-paper-soft lg:aspect-auto",
            // Leave room for the strip of other photos so the column still fits the screen while it sticks.
            strip.length > 6 ? "lg:h-[min(40rem,calc(100svh-26rem))]" : strip.length > 0 ? "lg:h-[min(48rem,calc(100svh-19rem))]" : "lg:h-[min(56rem,calc(100svh-8rem))]",
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
          ) : ed.pending > 0 ? (
            <span className="t-small absolute inset-0 flex animate-pulse items-center justify-center">Adding your photos</span>
          ) : !editable ? (
            <span className="t-small absolute inset-0 flex items-center justify-center">No photos yet</span>
          ) : (
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

        {strip.length > 0 && (
          <ul className="mt-[clamp(0.5rem,1vw,1rem)] grid grid-cols-4 gap-[clamp(0.5rem,1vw,1rem)] sm:grid-cols-6">
            {strip.map((t, k) =>
              t ? (
                <li
                  key={t.src}
                  className="group relative aspect-[4/5] overflow-hidden bg-paper-soft"
                  onClick={() => setActive(t.i)}
                  onMouseLeave={() => {
                    if (confirm === t.i) setConfirm(null);
                    if (active === t.i) setActive(null);
                  }}
                >
                  <Thumb src={t.src} />
                  {editable && (
                    <span
                      className={clsx(
                        "absolute inset-0 flex flex-col items-stretch justify-end gap-px p-1.5 transition duration-300",
                        confirm === t.i
                          ? "bg-night/40 opacity-100"
                          : active === t.i
                            ? "bg-night/25 opacity-100"
                            : "pointer-events-none bg-night/0 opacity-0 group-focus-within:bg-night/25 group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:bg-night/25 group-hover:opacity-100",
                      )}
                    >
                      {confirm !== t.i && (
                        <>
                          <TileButton onClick={() => move(t.i, 0)}>Make cover</TileButton>
                          <span className="grid grid-cols-2 gap-px">
                            <TileButton onClick={() => move(t.i, t.i - 1)} label="Move earlier" disabled={t.i === 1}>
                              <Icon name="arrow-left" className="mx-auto size-3" strokeWidth={1.5} />
                            </TileButton>
                            <TileButton onClick={() => move(t.i, t.i + 1)} label="Move later" disabled={t.i === photos.length - 1}>
                              <Icon name="arrow" className="mx-auto size-3" strokeWidth={1.5} />
                            </TileButton>
                          </span>
                        </>
                      )}
                      <TileButton onClick={() => remove(t.i)} danger={confirm === t.i}>
                        {confirm === t.i ? "Remove for good" : "Remove"}
                      </TileButton>
                    </span>
                  )}
                </li>
              ) : (
                <li key={`pending-${k}`} className="aspect-[4/5] animate-pulse bg-ink/[0.07]" aria-label="Adding a photo" />
              ),
            )}
          </ul>
        )}
        {(photos.length > 0 || editable) && (
          <div className="t-small mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <span>
              {photos.length === 0
                ? `Up to ${LIMITS.photosMax} photos, at least ${LIMITS.photoMin}px on the long side.`
                : `${photos.length} of ${LIMITS.photosMax} photos. The first is the cover${photoEditor && editable ? "; changes are saved as you make them" : ""}.`}
            </span>
            {editable && photos.length > 0 && (
              <button type="button" onClick={() => remove(0)} onBlur={() => confirm === 0 && setConfirm(null)} className={clsx("transition-colors hover:text-ink", confirm === 0 && "text-bad hover:text-bad")}>
                {confirm === 0 ? "Remove the cover for good" : "Remove cover"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* The vendor, set as on their page, every line editable in place. */}
      <fieldset disabled={readOnly} className="min-w-0 lg:col-span-5 lg:pt-1">
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
          maxLength={LIMITS.name}
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
          maxLength={LIMITS.discipline}
          aria-invalid={tried && !!errors.discipline}
          placeholder={you ? "What you do, in one line" : "What they do, in one line"}
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
          maxLength={400}
          placeholder={you ? "A sentence or two that sums up your work." : "A sentence or two, in their own words."}
          className={clsx(bare, "t-title mt-8 min-h-[2lh] resize-none text-[1.5rem] leading-[1.3] text-pretty [field-sizing:content] placeholder:text-ink-mute/35")}
        />

        {/* The story under the introduction on their page. The editor is only for a vendor's own listing. */}
        {mode === "vendor" &&
          (readOnly ? (
            v.story && <Story blocks={splitStory(v.story)} className="mt-5" />
          ) : (
            <div className="mt-6">
              <StoryEditor value={v.story} onChange={(story) => set("story", story)} label="About your work" compact />
            </div>
          ))}

        <dl className="mt-8 border-t hairline">
          <DetailRow label="Services" htmlFor="vf-services">
            <Dropdown id="vf-services" multiple options={serviceOptions} value={v.services} onChange={(x) => set("services", x)} placeholder={you ? "What couples can book you for" : "What couples can book them for"} />
          </DetailRow>
          <DetailRow label="Languages" htmlFor="vf-languages">
            <Dropdown id="vf-languages" multiple options={languageOptions} value={v.languages} onChange={(x) => set("languages", x)} placeholder={you ? "The languages you work in" : "The languages they work in"} />
          </DetailRow>
          <DetailRow label="Based in" htmlFor="vf-based">
            <input id="vf-based" value={v.based} onChange={(e) => set("based", e.target.value)} maxLength={LIMITS.based} placeholder="Suburb or city" className={rowInput} />
          </DetailRow>
          <DetailRow label="Travels to" htmlFor="vf-area">
            <Dropdown id="vf-area" multiple options={stateOptions} value={v.serviceArea} onChange={(x) => set("serviceArea", x)} placeholder={you ? "States you'll work in" : "States they'll work in"} />
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
            <input id="vf-person" value={v.person} onChange={(e) => set("person", e.target.value)} maxLength={LIMITS.person} placeholder="Who couples will hear from" className={rowInput} />
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

      </fieldset>

      {/* Outside the fieldset, so the preview still opens when the form is read-only. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 lg:col-span-5 lg:col-start-8 lg:-mt-2 lg:self-start">
        <Button type="submit" disabled={readOnly || saving}>
          {saving ? "Saving" : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={() => setPreviewing(true)}>
          Preview
        </Button>
      </div>

      <AnimatePresence>{previewing && <VendorPreview values={v} photos={photos} story={splitStory(v.story)} onClose={closePreview} />}</AnimatePresence>
    </form>
  );
}

function TileButton({ onClick, label, disabled, danger, children }: { onClick: () => void; label?: string; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        // Not the tile's own click, which would open its buttons again.
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={clsx("py-1 text-[0.6875rem] transition-colors disabled:opacity-40", danger ? "bg-bad text-paper hover:bg-bad/90" : "bg-paper/95 text-ink hover:bg-paper")}
    >
      {children}
    </button>
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
