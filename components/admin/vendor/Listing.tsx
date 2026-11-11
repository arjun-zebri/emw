"use client";

import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { StoryEditor } from "@/components/apply/StoryEditor";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { StickyColumn } from "@/components/vendor/StickyColumn";
import { Story } from "@/components/vendor/Story";
import { languages as languageNames, serviceLabels, states } from "@/data/taxonomy";
import type { Language, Service, StateCode } from "@/data/types";
import { editPhotos, saveListing, SaveError, useOwnListing, type EditPhoto, type ListingDetails, type OwnListing } from "@/lib/account/listing";
import { useSession, useVendorSlug } from "@/lib/admin/session";
import { toast } from "@/lib/admin/toast";
import { disciplineSuggestions, LIMITS } from "@/lib/apply/application";
import { PhotoError, preparePhoto } from "@/lib/apply/photos";
import { normaliseStory, splitStory } from "@/lib/story";
import { DetailRow, bare } from "../shared/DetailRow";
import { Dropdown } from "../shared/Dropdown";
import { emptyVendor } from "../shared/VendorForm";
import { VendorPreview } from "../shared/VendorPreview";
import { Empty } from "../ui";
import { ListingPhotos } from "./ListingPhotos";

/** The words and details as the editor holds them; the story as the story editor writes it. */
type Values = Omit<ListingDetails, "story"> & { story: string };

const valuesOf = (l: OwnListing): Values => ({
  name: l.name,
  person: l.person,
  discipline: l.discipline,
  lede: l.lede,
  story: normaliseStory(l.story).join("\n\n"),
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

const serviceOptions = (Object.keys(serviceLabels) as Service[]).map((s) => ({ value: s, label: serviceLabels[s] }));
const stateOptions = (Object.keys(states) as StateCode[]).map((s) => ({ value: s, label: states[s] }));
const languageOptions = (Object.keys(languageNames) as Language[]).map((l) => ({
  value: l,
  label: languageNames[l].native,
  hint: languageNames[l].native === l ? undefined : l,
  lang: languageNames[l].lang,
}));

const row = clsx(bare, "text-[0.9375rem] placeholder:text-ink-mute/50");
// Words set as on the page still read as editable: a soft wash on hover, a hairline beneath while editing.
const inPlace = "-mx-3 px-3 py-1 cursor-text border-b border-transparent transition-colors duration-300 hover:bg-ink/[0.035] focus:border-ink focus:bg-ink/[0.035]";

/** "Saved just now", "Saved 12 minutes ago", "Saved at 3:40 pm", "Saved on 5 November". */
function savedLabel(iso: string) {
  const at = new Date(iso);
  const mins = Math.round((Date.now() - at.getTime()) / 60_000);
  if (mins < 1) return "Saved just now";
  if (mins < 60) return `Saved ${mins} minute${mins === 1 ? "" : "s"} ago`;
  if (at.toDateString() === new Date().toDateString()) return `Saved at ${at.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}`;
  return `Saved on ${at.toLocaleDateString("en-AU", { day: "numeric", month: "long" })}`;
}

/**
 * The vendor's own listing, edited on a copy of their page. Nothing goes live until they save: then
 * the photos, words and details are written together and the public page updates. The team can open
 * this page to see what a vendor sees, but only reads it, since the listing shown is a real one.
 */
export function Listing() {
  const session = useSession();
  const slug = useVendorSlug();
  const { status, error, listing } = useOwnListing(slug);
  // Starts the editor again from the database, after a save or a discard.
  const [version, setVersion] = useState(0);

  if (status === "error")
    return (
      <div className="border border-ink/[0.09] bg-surface">
        <Empty title="Couldn’t load your listing">{error}</Empty>
      </div>
    );
  if (!slug || !listing)
    return (
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12" aria-busy="true">
        <div className="aspect-[4/5] animate-pulse bg-paper-soft lg:col-span-7 lg:max-h-[calc(100svh-12rem)]" />
        <div className="space-y-4 lg:col-span-5">
          <div className="h-14 w-3/4 animate-pulse bg-paper-soft" />
          <div className="h-4 w-1/2 animate-pulse bg-paper-soft" />
        </div>
      </div>
    );
  return <Editor key={`${listing.id}-${version}`} slug={slug} listing={listing} readOnly={session?.role === "team"} onReset={() => setVersion((v) => v + 1)} />;
}

function Editor({ slug, listing, readOnly, onReset }: { slug: string; listing: OwnListing; readOnly: boolean; onReset: () => void }) {
  const [base, setBase] = useState(() => valuesOf(listing));
  const [v, setV] = useState(base);
  const [photos, setPhotos] = useState<EditPhoto[]>(() => editPhotos(listing));
  const [preparing, setPreparing] = useState(0);
  const [saving, setSaving] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const storyReady = useRef(false);
  const reduce = useReducedMotion();

  const set = <K extends keyof Values>(key: K, value: Values[K]) => setV((s) => ({ ...s, [key]: value }));
  const photosChanged = photos.map((p) => p.key).join() !== listing.photos.map((p) => p.id).join();
  const dirty = !readOnly && (photosChanged || JSON.stringify(v) !== JSON.stringify(base));
  const missing = !v.name.trim() ? "Add your business name before saving." : !v.discipline.trim() ? "Add what you do before saving, e.g. Wedding photography." : null;
  const tongues = v.languages.filter((l) => l !== "English");
  const lines = disciplineSuggestions(v.services);
  // A line that was empty or one of the suggestions follows the services; one they wrote themselves stays.
  const chooseServices = (services: Service[]) =>
    setV((s) => {
      const follows = !s.discipline.trim() || disciplineSuggestions(s.services).includes(s.discipline);
      return { ...s, services, discipline: follows ? (disciplineSuggestions(services)[0] ?? "") : s.discipline };
    });
  const live = listing.status === "published";
  // An empty row asks to be filled in, except for the team, who can only read it.
  const ask = (prompt: string) => (readOnly ? "Not given" : prompt);

  const addPhotos = async (files: File[]) => {
    const room = LIMITS.photosMax - photos.length - preparing;
    const take = files.slice(0, Math.max(0, room));
    const problems: string[] = [];
    if (files.length > take.length) problems.push(`A listing holds up to ${LIMITS.photosMax} photos.`);
    setPreparing((n) => n + take.length);
    for (const file of take) {
      try {
        const p = await preparePhoto(file);
        setPhotos((list) => [...list, { key: p.id, src: p.url, width: p.width, height: p.height, upload: p }]);
      } catch (e) {
        problems.push(`${file.name}: ${e instanceof PhotoError ? e.message : "we couldn’t open it."}`);
      } finally {
        setPreparing((n) => n - 1);
      }
    }
    if (problems.length) toast(problems.join(" "));
  };

  const release = useCallback(() => photos.forEach((p) => p.upload && URL.revokeObjectURL(p.src)), [photos]);

  const save = useCallback(async () => {
    if (saving || !dirty || preparing) return;
    if (missing) {
      document.getElementById(!v.name.trim() ? "le-name" : "le-discipline")?.focus();
      toast(missing);
      return;
    }
    setSaving("Saving");
    try {
      await saveListing(slug, { ...v, story: normaliseStory(splitStory(v.story)) }, photos, setSaving);
      release();
      toast(live ? "Saved. Your page is up to date." : "Saved");
      onReset();
    } catch (e) {
      setSaving(null);
      if (e instanceof SaveError && e.partial) {
        toast(`Only some of your changes were saved (${e.message}). Check your listing and try again.`);
        onReset();
      } else toast(`Couldn’t save your listing: ${(e as Error).message}`);
    }
  }, [saving, dirty, preparing, missing, slug, v, photos, release, live, onReset]);

  // Leaving with unsaved changes asks first; Cmd or Ctrl + S saves.
  useEffect(() => {
    if (!dirty) return;
    const leave = (e: BeforeUnloadEvent) => e.preventDefault();
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    addEventListener("beforeunload", leave);
    addEventListener("keydown", key);
    return () => {
      removeEventListener("beforeunload", leave);
      removeEventListener("keydown", key);
    };
  }, [dirty, save]);

  const closePreview = useCallback(() => setPreviewing(false), []);

  // Toasts rise above the save bar while it's showing.
  const barShown = dirty || !!saving;
  useEffect(() => {
    document.documentElement.style.setProperty("--toast-lift", barShown ? "4.5rem" : "0px");
    return () => {
      document.documentElement.style.removeProperty("--toast-lift");
    };
  }, [barShown]);

  return (
    <>
      {/* Where the listing stands, and when it was last saved. */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b hairline pb-5 text-[0.875rem]">
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-ink-soft">
          {readOnly ? (
            <span className="text-ink">{listing.name}&rsquo;s listing, as they see it. Only they can change it.</span>
          ) : (
            <>
              <span className={clsx("size-2 rounded-full", live ? "bg-good" : "bg-ink/25")} aria-hidden />
              <span className="text-ink">{live ? "Live on East Meets Wed" : listing.status === "draft" ? "Waiting for the team to approve" : "Hidden from the directory"}</span>
              {live && (
                <a
                  href={`/vendors/${listing.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline decoration-ink/25 underline-offset-[0.25em] transition-colors hover:text-ink hover:decoration-ink"
                >
                  View your page
                  <Icon name="arrow-up-right" className="size-3.5" strokeWidth={1.5} />
                </a>
              )}
            </>
          )}
        </p>
        <div className="flex items-center gap-5">
          {!readOnly && !dirty && <span className="hidden text-ink-soft xl:inline">Click any words or photo to change them.</span>}
          {!readOnly && <span className={dirty ? "text-ink" : "text-ink-soft"}>{dirty ? "Unsaved changes" : savedLabel(listing.updatedAt)}</span>}
          <button type="button" onClick={() => setPreviewing(true)} className="t-nav inline-flex h-9 items-center border border-ink/20 px-4 text-ink transition-colors hover:border-ink">
            Preview
          </button>
        </div>
      </div>

      {/* The page itself: photographs on the left, the vendor on the right, each held in view while the other scrolls. */}
      <div className={clsx("grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:gap-x-[clamp(2rem,4vw,4.5rem)]", (dirty || saving) && "pb-24")}>
        <StickyColumn className="min-w-0 lg:sticky lg:top-[5.5rem] lg:col-span-7 lg:self-start">
          <ListingPhotos photos={photos} preparing={preparing} readOnly={readOnly} onChange={setPhotos} onAdd={(files) => void addPhotos(files)} />
        </StickyColumn>

        <StickyColumn className="min-w-0 lg:sticky lg:top-[5.5rem] lg:col-span-5 lg:self-start lg:pt-1">
          <fieldset disabled={readOnly} className="min-w-0">
            <label htmlFor="le-name" className="sr-only">
              Business name
            </label>
            <textarea
              id="le-name"
              rows={1}
              value={v.name}
              maxLength={LIMITS.name}
              onChange={(e) => set("name", e.target.value.replace(/\n/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              placeholder="Your business name"
              autoComplete="off"
              className={clsx(bare, !readOnly && inPlace, "t-display resize-none text-[clamp(2.5rem,4.4vw,4.75rem)] text-balance [field-sizing:content] placeholder:text-ink-mute/40")}
            />
            <label htmlFor="le-discipline" className="sr-only">
              What you do
            </label>
            {/* The line under the name. Suggestions come from the services chosen below; their own words work too. */}
            <div className="group/line">
              <input
                id="le-discipline"
                value={v.discipline}
                maxLength={LIMITS.discipline}
                onChange={(e) => set("discipline", e.target.value)}
                placeholder="What you do, e.g. Wedding photography"
                autoComplete="off"
                className={clsx(bare, !readOnly && inPlace, "t-body mt-3 text-ink placeholder:text-ink-mute/50")}
              />
              {!readOnly && lines.length > 0 && (
                <div className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-500 ease-out-expo group-focus-within/line:grid-rows-[1fr] group-focus-within/line:opacity-100">
                  <div className="min-h-0 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-1.5 pt-2.5">
                      <span className="t-small mr-1">From your services:</span>
                      {lines.map((line) => (
                        <button
                          key={line}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => set("discipline", line)}
                          className={clsx(
                            "h-8 border px-3 text-[0.8125rem] transition-colors duration-300",
                            v.discipline === line ? "border-ink bg-ink text-paper" : "border-ink/15 bg-surface text-ink hover:border-ink",
                          )}
                        >
                          {line}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {tongues.length > 0 && (
              <p className="t-title mt-3 flex flex-wrap gap-x-4 text-ink-soft">
                {tongues.map((l) => (
                  <span key={l} lang={languageNames[l].lang} title={l}>
                    {languageNames[l].native}
                  </span>
                ))}
              </p>
            )}

            <label htmlFor="le-lede" className="sr-only">
              Introduction
            </label>
            <textarea
              id="le-lede"
              rows={1}
              value={v.lede}
              maxLength={400}
              onChange={(e) => set("lede", e.target.value.replace(/\n/g, " "))}
              placeholder="One or two sentences that sum up your work, e.g. Relaxed, documentary photography for weddings in two languages."
              className={clsx(bare, !readOnly && inPlace, "t-title mt-7 resize-none text-[1.5rem] leading-[1.3] text-pretty [field-sizing:content] placeholder:text-ink-mute/40")}
            />

            <div className={clsx("mt-4", !readOnly && "-mx-3 cursor-text px-3 py-2 transition-colors duration-300 hover:bg-ink/[0.035] focus-within:bg-ink/[0.035]")}>
              {readOnly ? (
                <Story blocks={splitStory(v.story)} />
              ) : (
                <StoryEditor
                  inline
                  label="About your work"
                  value={v.story}
                  onChange={(story) => {
                    // The editor tidies the story once as it opens; that's the starting point, not a change.
                    if (!storyReady.current) {
                      storyReady.current = true;
                      setBase((b) => ({ ...b, story }));
                    }
                    set("story", story);
                  }}
                />
              )}
            </div>

            {/* One rule between each section, none between rows. */}
            <dl className="mt-8 border-t hairline pt-4">
              <DetailRow plain label="Services" htmlFor="le-services">
                <Dropdown id="le-services" quiet multiple options={serviceOptions} value={v.services} onChange={chooseServices} placeholder={ask("Choose what couples can book you for")} />
              </DetailRow>
              <DetailRow plain label="Languages" htmlFor="le-languages">
                <Dropdown id="le-languages" quiet multiple options={languageOptions} value={v.languages} onChange={(x) => set("languages", x)} placeholder={ask("Choose the languages you work in")} />
              </DetailRow>
              <DetailRow plain label="Based in" htmlFor="le-based">
                <input id="le-based" value={v.based} maxLength={LIMITS.based} onChange={(e) => set("based", e.target.value)} placeholder={ask("Suburb or city, e.g. Footscray")} className={row} />
              </DetailRow>
              <DetailRow plain label="Service area" htmlFor="le-area">
                <Dropdown id="le-area" quiet multiple options={stateOptions} value={v.serviceArea} onChange={(x) => set("serviceArea", x)} placeholder={ask("Choose the states you work in")} />
              </DetailRow>
              <DetailRow plain label="Website" htmlFor="le-web">
                <input id="le-web" type="url" value={v.website} onChange={(e) => set("website", e.target.value)} placeholder={ask("e.g. yourstudio.com.au")} className={row} />
              </DetailRow>
              <DetailRow plain label="Instagram" htmlFor="le-ig">
                <input id="le-ig" value={v.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder={ask("e.g. @yourstudio")} className={row} />
              </DetailRow>
              <DetailRow plain label="Facebook" htmlFor="le-fb">
                <input id="le-fb" value={v.facebook} onChange={(e) => set("facebook", e.target.value)} placeholder={ask("e.g. facebook.com/yourstudio")} className={row} />
              </DetailRow>
            </dl>

            <div className="mt-6 border-t hairline pt-6 pb-2">
              <p className="text-[0.9375rem] text-ink">Your contact details</p>
              <p className="t-small mt-1">Private: not shown on your page. We send couples&rsquo; enquiries to this email.</p>
            </div>
            <dl>
              <DetailRow plain label="Your name" htmlFor="le-person">
                <input id="le-person" value={v.person} maxLength={LIMITS.person} onChange={(e) => set("person", e.target.value)} placeholder={ask("Who couples will hear from, e.g. Mai Nguyen")} className={row} />
              </DetailRow>
              <DetailRow plain label="Email" htmlFor="le-email">
                <input id="le-email" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} placeholder={ask("e.g. hello@yourstudio.com.au")} className={row} />
              </DetailRow>
              <DetailRow plain label="Phone" htmlFor="le-phone">
                <input id="le-phone" type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} placeholder={ask("e.g. 0412 345 678")} className={row} />
              </DetailRow>
            </dl>
          </fieldset>
        </StickyColumn>
      </div>

      {/* Appears once something has changed; nothing goes live until it's saved. */}
      <AnimatePresence>
        {(dirty || saving) && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 bottom-0 z-40 border-t hairline bg-surface shadow-[0_-24px_48px_-28px_rgb(22_20_18/0.25)] lg:left-[15rem]"
          >
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-8 lg:px-[clamp(2rem,4vw,4.5rem)]">
              <p className="min-w-0 text-[0.9375rem] text-ink">
                {saving ?? (preparing ? "Preparing your photos" : "Unsaved changes")}
                {!saving && !preparing && <span className="hidden text-ink-soft sm:inline">. {live ? "They go live on your page when you save." : "Save to keep them."}</span>}
              </p>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    release();
                    onReset();
                  }}
                  disabled={!!saving}
                  className="t-nav h-12 px-4 text-ink-soft transition-colors hover:text-ink disabled:opacity-40"
                >
                  Discard
                </button>
                <Button type="button" onClick={() => void save()} disabled={!!saving || preparing > 0}>
                  {saving ? "Saving" : "Save"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewing && <VendorPreview values={{ ...emptyVendor, ...v }} photos={photos.map((p) => p.src)} story={splitStory(v.story)} onClose={closePreview} />}
      </AnimatePresence>
    </>
  );
}
