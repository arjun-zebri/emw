"use client";

import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StoryEditor } from "@/components/apply/StoryEditor";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { Skeleton, SkeletonLines } from "@/components/ui/Skeleton";
import { StickyColumn } from "@/components/vendor/StickyColumn";
import { Story } from "@/components/vendor/Story";
import { areaOptions as allAreas, languages as languageNames, serviceLabels } from "@/data/taxonomy";
import type { Language, Service } from "@/data/types";
import { editPhotos, LINE_MAX, saveListing, SaveError, useOwnListing, type EditPhoto, type ListingDetails, type OwnListing } from "@/lib/account/listing";
import { useSession, useVendorSlug } from "@/lib/admin/session";
import { toast } from "@/lib/admin/toast";
import { isEmail, isWebsite, LIMITS, socialUrl } from "@/lib/apply/application";
import { PhotoError, preparePhoto } from "@/lib/apply/photos";
import { inlineText, normaliseStory, parseBlock, serialiseBlock, splitStory, STORY_RULES, storyLength } from "@/lib/story";
import { DetailRow, bare } from "../shared/DetailRow";
import { Dropdown } from "../shared/Dropdown";
import { emptyVendor } from "../shared/VendorForm";
import { VendorPreview } from "../shared/VendorPreview";
import { Empty } from "../ui";
import { ListingPhotos } from "./ListingPhotos";

/**
 * The words and details as the editor holds them. The introduction and the story are one text, as
 * the story editor writes it: its first paragraph is the introduction (vendors.lede), the rest the
 * story, exactly as the page sets them.
 */
type Values = Omit<ListingDetails, "story" | "lede"> & { story: string };

/** Split the one text back into the introduction and the story. A long first paragraph stays in the story. */
function splitWords(text: string): { lede: string; story: string[] } {
  const blocks = normaliseStory(splitStory(text));
  const first = blocks[0] ? parseBlock(blocks[0]) : null;
  if (first?.type === "p") {
    const lede = inlineText(first.content).trim();
    if (lede.length <= 400) return { lede, story: blocks.slice(1) };
  }
  return { lede: "", story: blocks };
}

// Languages in the taxonomy's order (native scripts first, English last), wherever they were picked.
const languageOrder = Object.keys(languageNames) as Language[];
const ordered = (list: Language[]) => languageOrder.filter((l) => list.includes(l));

const valuesOf = (l: OwnListing): Values => ({
  name: l.name,
  person: l.person,
  discipline: l.discipline,
  story: normaliseStory([...(l.lede.trim() ? [serialiseBlock({ type: "p", content: [{ text: l.lede.trim() }] })] : []), ...l.story]).join("\n\n"),
  services: l.services,
  based: l.based,
  serviceArea: l.serviceArea,
  languages: ordered(l.languages),
  email: l.email,
  phone: l.phone,
  website: l.website,
  instagram: l.instagram,
  facebook: l.facebook,
});

const serviceOptions = (Object.keys(serviceLabels) as Service[]).map((s) => ({ value: s, label: serviceLabels[s] }));
// The states, then the overseas regions, by name.
const areaOptions = allAreas();
const languageOptions = (Object.keys(languageNames) as Language[]).map((l) => ({
  value: l,
  label: languageNames[l].native,
  hint: languageNames[l].native === l ? undefined : l,
  lang: languageNames[l].lang,
}));

// "MC" stays as it is; "Photography" becomes "photography" after the first.
const lower = (t: string) => (/^[A-Z]{2,}\b/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1));

/** The one text (introduction and story together): enough to say something, and no more than the page holds. */
const TEXT_MIN = 100;
const TEXT_MAX = STORY_RULES.maxChars;

const row = clsx(bare, "text-[0.9375rem] placeholder:text-ink-mute/50");
// Words set as on the page still read as editable: a fine outline just outside the text, faint on
// hover and firmer while typing. Outlines take no space, so nothing moves.
const inPlace = "cursor-text outline outline-1 outline-offset-[0.5rem] outline-transparent transition-[outline-color] duration-300 hover:outline-ink/15 focus:outline-ink/35";

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
        <Skeleton className="aspect-[4/5] w-full lg:col-span-7 lg:max-h-[calc(100svh-12rem)]" />
        <div className="lg:col-span-5">
          <Skeleton className="h-14 w-3/4" />
          <Skeleton className="mt-4 h-4 w-1/2" />
          <SkeletonLines lines={3} className="mt-10 text-[1.5rem]" />
          <div className="mt-12 space-y-4 border-t hairline pt-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-6">
                <Skeleton className="h-4 w-24 shrink-0" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
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
  const [uploads, setUploads] = useState<Record<string, "uploading" | "done">>({});
  const [stale, setStale] = useState(false);
  const [rights, setRights] = useState(false);
  const [tried, setTried] = useState(false);
  // "Click any words or photo…" shows until the first change they ever make, then never again.
  // The editor only renders in the browser (the listing loads there), so storage can be read here.
  const [hint] = useState(() => {
    try {
      return !readOnly && !localStorage.getItem("emw-listing-hint");
    } catch {
      return false;
    }
  });
  const storyReady = useRef(false);
  const reduce = useReducedMotion();

  const set = <K extends keyof Values>(key: K, value: Values[K]) => setV((s) => ({ ...s, [key]: value }));
  const photosChanged = photos.map((p) => p.key).join() !== listing.photos.map((p) => p.id).join();
  const dirty = !readOnly && (photosChanged || JSON.stringify(v) !== JSON.stringify(base));
  const missing = !v.name.trim() ? "Add your business name before saving." : !v.discipline.trim() ? "Choose at least one service before saving." : null;
  // Links are checked before they go on the page, so a typo never becomes a broken link.
  const bad = useMemo(
    () => ({
      website: !isWebsite(v.website) ? "Check the address, e.g. yourstudio.com.au" : undefined,
      instagram: v.instagram.trim() && !socialUrl(v.instagram, "instagram") ? "Use your @handle or the link to your profile" : undefined,
      facebook: v.facebook.trim() && !socialUrl(v.facebook, "facebook") ? "Use the link to your page, e.g. facebook.com/yourstudio" : undefined,
      email: v.email.trim() && !isEmail(v.email) ? "Check the email address" : undefined,
    }),
    [v.website, v.instagram, v.facebook, v.email],
  );
  const firstBad = (Object.keys(bad) as (keyof typeof bad)[]).find((k) => bad[k]);
  const newPhotos = photos.some((p) => p.upload);
  const tongues = v.languages.filter((l) => l !== "English");
  const words = useMemo(() => splitWords(v.story), [v.story]);
  // The text as written, untrimmed, so a limit is never enforced by quietly cutting words off.
  const [textLength, setTextLength] = useState(() => storyLength(splitStory(base.story).map(parseBlock)));
  const textProblem =
    textLength < TEXT_MIN
      ? `Write at least ${TEXT_MIN} characters about your work (${textLength} so far).`
      : textLength > TEXT_MAX
        ? `That’s ${(textLength - TEXT_MAX).toLocaleString("en-AU")} characters over the ${TEXT_MAX.toLocaleString("en-AU")} limit. Shorten it to save.`
        : null;
  // The line under the name lists every service chosen: "Photography", "Celebrant & MC",
  // "Celebrant, MC, photography & videography".
  const chooseServices = (services: Service[]) =>
    setV((s) => {
      const labels = services.map((x, i) => (i === 0 ? serviceLabels[x] : lower(serviceLabels[x])));
      // "and" before the last when a name has its own "&", so "videography and hair & makeup" still reads.
      const join = labels.some((l) => l.includes("&")) ? " and " : " & ";
      const all = labels.length > 1 ? `${labels.slice(0, -1).join(", ")}${join}${labels.at(-1)}` : (labels[0] ?? "");
      return { ...s, services, discipline: all.length <= LINE_MAX ? all : `${labels.slice(0, 3).join(", ")} and more` };
    });
  const live = listing.status === "published";
  useEffect(() => {
    if (!dirty || !hint) return;
    try {
      localStorage.setItem("emw-listing-hint", "1");
    } catch {}
  }, [dirty, hint]);
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
    if (saving || !dirty || preparing || stale) return;
    setTried(true);
    if (missing) {
      document.getElementById(!v.name.trim() ? "le-name" : "le-services")?.focus();
      toast(missing);
      return;
    }
    if (textProblem) {
      document.querySelector<HTMLElement>("[contenteditable=true]")?.focus();
      toast(textProblem);
      return;
    }
    if (firstBad) {
      document.getElementById(`le-${firstBad === "website" ? "web" : firstBad === "instagram" ? "ig" : firstBad === "facebook" ? "fb" : "email"}`)?.focus();
      toast(bad[firstBad]!);
      return;
    }
    if (newPhotos && !rights) {
      toast("Confirm the new photos are yours to share, then save.");
      return;
    }
    setSaving("Saving");
    try {
      await saveListing(slug, { ...v, ...splitWords(v.story) }, photos, setSaving, (key, state) => setUploads((u) => ({ ...u, [key]: state })));
      release();
      toast(live ? "Saved. Your page is up to date." : "Saved");
      onReset();
    } catch (e) {
      setSaving(null);
      setUploads({});
      if (e instanceof SaveError && e.stale) setStale(true);
      else if (e instanceof SaveError && e.partial) {
        toast(`Only some of your changes were saved (${e.message}). Check your listing and try again.`);
        onReset();
      } else toast(`Couldn’t save your listing: ${(e as Error).message}`);
    }
  }, [saving, dirty, preparing, stale, missing, textProblem, firstBad, bad, newPhotos, rights, slug, v, photos, release, live, onReset]);

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
          {hint && !dirty && <span className="hidden text-ink-soft xl:inline">Click any words or photo to change them.</span>}
          {!readOnly && <span className={dirty ? "text-ink" : "text-ink-soft"}>{dirty ? "Unsaved changes" : savedLabel(listing.updatedAt)}</span>}
          <button type="button" onClick={() => setPreviewing(true)} className="t-nav inline-flex h-9 items-center border border-ink/20 px-4 text-ink transition-colors hover:border-ink">
            Preview
          </button>
        </div>
      </div>

      {/* The page itself: photographs on the left, the vendor on the right, each held in view while the other scrolls. */}
      <div className={clsx("grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:gap-x-[clamp(2rem,4vw,4.5rem)]", (dirty || saving) && "pb-24")}>
        {/* On phones the photos column dissolves, so it reads cover, then the words, then the rest, like the vendor page. */}
        <StickyColumn className="min-w-0 max-lg:contents lg:sticky lg:top-6 lg:col-span-7 lg:self-start">
          <ListingPhotos photos={photos} preparing={preparing} uploads={uploads} readOnly={readOnly} onChange={setPhotos} onAdd={(files) => void addPhotos(files)} />
        </StickyColumn>

        <StickyColumn className="min-w-0 max-lg:order-2 lg:sticky lg:top-6 lg:col-span-5 lg:self-start lg:pt-1">
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
            {/* The line under the name comes from the services chosen below, so it always matches them. */}
            <p className={clsx("t-body mt-3", v.discipline ? "text-ink" : "text-ink-mute/50")}>{v.discipline || "Choose your services below and this line follows them"}</p>
            {tongues.length > 0 && (
              <p className="t-title mt-3 flex flex-wrap gap-x-4 text-ink-soft">
                {tongues.map((l) => (
                  <span key={l} lang={languageNames[l].lang} title={l}>
                    {languageNames[l].native}
                  </span>
                ))}
              </p>
            )}

            {/* One text, as the page sets it: the first paragraph large (the introduction), the rest below. */}
            <div className={clsx("mt-8", !readOnly && "cursor-text outline outline-1 outline-offset-[0.5rem] outline-transparent transition-[outline-color] duration-300 focus-within:outline-ink/35 hover:outline-ink/15")}>
              {readOnly ? (
                <>
                  {words.lede && <p className="t-title text-[1.5rem] leading-[1.3] text-pretty">{words.lede}</p>}
                  <Story blocks={words.story} className={words.lede ? "mt-5" : undefined} />
                </>
              ) : (
                <StoryEditor
                  inline
                  lead
                  label="About your work"
                  value={v.story}
                  onLength={setTextLength}
                  onChange={(story) => {
                    // The editor tidies the text once as it opens; that's the starting point, not a change.
                    if (!storyReady.current) {
                      storyReady.current = true;
                      setBase((b) => ({ ...b, story }));
                    }
                    set("story", story);
                  }}
                />
              )}
            </div>

            {!readOnly && (
              <div className="mt-4 flex items-baseline justify-between gap-4 text-[0.8125rem]">
                <p className={clsx(textProblem && (tried || textLength > TEXT_MAX) ? "text-bad" : "text-ink-soft")}>
                  {textProblem ?? "Start with a sentence or two, then tell couples how you work."}
                </p>
                <p className={clsx("shrink-0 tabular-nums", textLength > TEXT_MAX ? "text-bad" : "text-ink-soft")}>
                  {textLength.toLocaleString("en-AU")} / {TEXT_MAX.toLocaleString("en-AU")}
                </p>
              </div>
            )}

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
                <Dropdown id="le-area" quiet multiple options={areaOptions} value={v.serviceArea} onChange={(x) => set("serviceArea", x)} placeholder={ask("Choose where you'll work")} />
              </DetailRow>
              <DetailRow plain label="Website" htmlFor="le-web">
                <input id="le-web" type="url" value={v.website} onChange={(e) => set("website", e.target.value)} aria-invalid={!!bad.website} placeholder={ask("e.g. yourstudio.com.au")} className={row} />
                <Problem show={tried} text={bad.website} />
              </DetailRow>
              <DetailRow plain label="Instagram" htmlFor="le-ig">
                <input id="le-ig" value={v.instagram} onChange={(e) => set("instagram", e.target.value)} aria-invalid={!!bad.instagram} placeholder={ask("e.g. @yourstudio")} className={row} />
                <Problem show={tried} text={bad.instagram} />
              </DetailRow>
              <DetailRow plain label="Facebook" htmlFor="le-fb">
                <input id="le-fb" value={v.facebook} onChange={(e) => set("facebook", e.target.value)} aria-invalid={!!bad.facebook} placeholder={ask("e.g. facebook.com/yourstudio")} className={row} />
                <Problem show={tried} text={bad.facebook} />
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
                <input id="le-email" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!bad.email} placeholder={ask("e.g. hello@yourstudio.com.au")} className={row} />
                <Problem show={tried} text={bad.email} />
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
              {stale ? (
                <p className="min-w-0 text-[0.9375rem] text-ink">
                  Your listing was changed somewhere else after you opened it, so this wasn&rsquo;t saved.
                  <span className="hidden text-ink-soft sm:inline"> Load the latest, then make your change again.</span>
                </p>
              ) : (
                <div className="min-w-0">
                  <p className="text-[0.9375rem] text-ink">
                    {saving ?? (preparing ? "Preparing your photos" : "Unsaved changes")}
                    {!saving && !preparing && textProblem ? (
                      <span className="text-bad">. {textProblem}</span>
                    ) : (
                      !saving && !preparing && !newPhotos && <span className="hidden text-ink-soft sm:inline">. {live ? "They go live on your page when you save." : "Save to keep them."}</span>
                    )}
                  </p>
                  {newPhotos && !saving && (
                    <label className="mt-1 flex cursor-pointer items-start gap-2 text-[0.8125rem] text-ink-soft">
                      <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5 size-4 accent-ink" />
                      The new photos are mine to share, or I have the photographer&rsquo;s permission.
                    </label>
                  )}
                </div>
              )}
              <div className="flex shrink-0 items-center gap-1">
                {!stale && (
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
                )}
                {stale ? (
                  <Button
                    type="button"
                    onClick={() => {
                      release();
                      onReset();
                    }}
                  >
                    Load the latest
                  </Button>
                ) : (
                  <Button type="button" onClick={() => void save()} disabled={!!saving || preparing > 0 || (newPhotos && !rights) || !!textProblem}>
                    {saving ? "Saving" : "Save"}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewing && <VendorPreview values={{ ...emptyVendor, ...v, lede: words.lede, languages: ordered(v.languages) }} photos={photos.map((p) => p.src)} story={words.story} onClose={closePreview} />}
      </AnimatePresence>
    </>
  );
}

/** What's wrong with a field, under it, once they've tried to save. */
function Problem({ show, text }: { show: boolean; text?: string }) {
  return show && text ? <p className="mt-1 text-[0.8125rem] text-bad">{text}</p> : null;
}
