"use client";

import clsx from "clsx";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { PreviewFrame } from "@/components/admin/shared/PreviewFrame";
import { Monogram } from "@/components/brand/Logo";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { Portal } from "@/components/ui/Portal";
import { VendorSpread } from "@/components/vendor/VendorSpread";
import { areaLabel, australiaWide, crafts, languages as languageNames, overseas, serviceLabels, states } from "@/data/taxonomy";
import type { Language, OverseasCode, StateCode, Vendor } from "@/data/types";
import { finishApplication, submitApplication } from "@/lib/apply/actions";
import { type Application, disciplineSuggestions, emptyApplication, fullPhone, isEmail, isWebsite, LIMITS, otherLanguageList, socialUrl, storyChars, withScheme } from "@/lib/apply/application";
import { type ApplyPhoto, clearPhotos, loadPhotos, savePhotos } from "@/lib/apply/photos";
import { normaliseStory, splitStory } from "@/lib/story";
import { supabase } from "@/lib/supabase/browser";
import { type Account, AccountPanel, useAccount } from "./AccountPanel";
import { CardPreview, Check, Chip, Field, inputClass, StepHead, Tile } from "./parts";
import { PhoneField } from "./PhoneField";
import { PhotoStep } from "./PhotoStep";
import { StoryEditor } from "./StoryEditor";

/*
 * The application, one question a screen: a fixed bar on top (the way out), the question in the
 * middle, and at the foot a progress bar in three parts with Back and Next. The first screen is
 * the account (AccountPanel); nothing past it opens until they're signed in. Answers are kept in
 * this browser as they go (text in localStorage, photos in IndexedDB), so "Save and exit" means it.
 */

type StepId = "welcome" | "about" | "craft" | "languages" | "where" | "show" | "photos" | "name" | "line" | "story" | "finish" | "contact" | "review";

const flow: { id: StepId; section?: 0 | 1 | 2; intro?: boolean }[] = [
  { id: "welcome" },
  { id: "about", section: 0, intro: true },
  { id: "craft", section: 0 },
  { id: "languages", section: 0 },
  { id: "where", section: 0 },
  { id: "show", section: 1, intro: true },
  { id: "photos", section: 1 },
  { id: "name", section: 1 },
  { id: "line", section: 1 },
  { id: "story", section: 1 },
  { id: "finish", section: 2, intro: true },
  { id: "contact", section: 2 },
  { id: "review", section: 2 },
];

const SAVED = "emw-apply";
type Saved = { a: Application; step: StepId; startedAt: number };

export type FlowPhotos = { about: string; show: string; finish: string; welcome: string };

type Phase = { kind: "form" } | { kind: "sending"; done: number; total: number } | { kind: "sent"; duplicate?: boolean };

/** English first: most vendors work in it, so it's the one to tick before the rest. */
const languageOrder: Language[] = ["English", ...(Object.keys(languageNames) as Language[]).filter((l) => l !== "English")];
const allStates = Object.keys(states) as StateCode[];
const ease = [0.16, 1, 0.3, 1] as const;

export function ApplyFlow({ images }: { images: FlowPhotos }) {
  const [a, setA] = useState<Application>(emptyApplication);
  const [photos, setPhotosState] = useState<ApplyPhoto[]>([]);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [returning, setReturning] = useState(false);
  const [backToReview, setBackToReview] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const [problems, setProblems] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);
  const startedAt = useRef(0);
  const trap = useRef<HTMLInputElement>(null);
  const loaded = useRef(false);
  const resumeAt = useRef(0);
  const uid = useId();
  const headingId = `${uid}-q`;

  const step = flow[index];
  const { account, refresh } = useAccount();
  const signedIn = !!account?.confirmed;

  // Their account's address is the likely contact one.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a default from the account, once it's known
    if (account?.confirmed && account.email) setA((x) => (x.email ? x : { ...x, email: account.email }));
  }, [account]);

  // Pick up where they left off.
  useEffect(() => {
    let saved: Saved | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(SAVED) ?? "null");
    } catch {}
    const at = saved ? flow.findIndex((s) => s.id === saved.step) : -1;
    /* eslint-disable react-hooks/set-state-in-effect -- restoring from browser storage, once, after hydration */
    if (saved && at > 0) {
      setA({ ...emptyApplication, ...saved.a, rights: false });
      setReturning(true);
      startedAt.current = saved.startedAt;
    } else startedAt.current = Date.now();
    /* eslint-enable react-hooks/set-state-in-effect */
    loadPhotos().then((p) => {
      if (p.length) setPhotosState(p);
      loaded.current = true;
    });
    resumeAt.current = Math.max(0, at);
  }, []);

  useEffect(() => {
    if (!loaded.current || phase.kind === "sent") return;
    try {
      localStorage.setItem(SAVED, JSON.stringify({ a, step: step.id, startedAt: startedAt.current } satisfies Saved));
    } catch {}
  }, [a, step.id, phase.kind]);

  const setPhotos = useCallback((next: ApplyPhoto[] | ((p: ApplyPhoto[]) => ApplyPhoto[])) => {
    setPhotosState((p) => {
      const value = typeof next === "function" ? next(p) : next;
      savePhotos(value);
      return value;
    });
  }, []);

  const set: Setter = (key, value) => setA((x) => ({ ...x, [key]: value }));
  /** Add or remove one choice, from the latest state so quick taps never drop one. */
  const flip: Flip = (key, v) => setA((x) => ({ ...x, [key]: toggle(x[key] as string[], v) }));

  const chosen = useMemo(() => crafts.filter((c) => a.crafts.includes(c.id)), [a.crafts]);
  const other = a.otherCraft.trim();
  const otherOn = a.otherCraft !== "";

  const valid: Record<StepId, boolean> = {
    welcome: signedIn,
    about: true,
    // Every craft they chose has at least one service, and "something else" says what.
    craft: (chosen.length > 0 || !!other) && chosen.every((c) => c.services.some((s) => a.services.includes(s))) && (!otherOn || !!other),
    languages: a.languages.length > 0 || otherLanguageList(a.otherLanguages).length > 0,
    where: a.serviceArea.length > 0,
    show: true,
    photos: photos.length > 0,
    name: !!a.name.trim() && !!a.person.trim(),
    line: !!a.discipline.trim(),
    story: storyChars(a.story) > 0,
    finish: true,
    contact:
      isEmail(a.email) &&
      isWebsite(a.website) &&
      (!a.phone || a.phone.length >= 6) &&
      (!a.instagram.trim() || !!socialUrl(a.instagram, "instagram")) &&
      (!a.facebook.trim() || !!socialUrl(a.facebook, "facebook")),
    review: a.rights,
  };
  const firstGap = flow.findIndex((s) => !valid[s.id] && s.id !== "review");

  const go = (to: number) => {
    if (to > 0 && !signedIn) return;
    setDir(to > index ? 1 : -1);
    setIndex(Math.max(0, Math.min(flow.length - 1, to)));
    setProblems([]);
    scrollTo({ top: 0 });
  };
  const next = () => {
    if (!valid[step.id]) return;
    if (backToReview && step.id !== "review") {
      setBackToReview(false);
      return go(flow.length - 1);
    }
    go(index + 1);
  };
  const edit = (id: StepId) => {
    setBackToReview(true);
    go(flow.findIndex((s) => s.id === id));
  };

  // Move focus to each new question, for keyboards and screen readers.
  useEffect(() => {
    const t = setTimeout(() => document.getElementById(headingId)?.focus({ preventScroll: true }), 450);
    return () => clearTimeout(t);
  }, [index, headingId]);

  async function send() {
    if (firstGap >= 0) return go(firstGap);
    if (!a.rights) return;
    setProblems([]);
    setPhase({ kind: "sending", done: 0, total: photos.length });
    const res = await submitApplication(a, { photos: photos.length, startedAt: startedAt.current, trap: trap.current?.value ?? "" }).catch(() => ({ status: "error" as const }));
    if (res.status === "duplicate") return finished(true);
    if (res.status === "signed-out") {
      setPhase({ kind: "form" });
      await refresh();
      setDir(-1);
      setIndex(0);
      return;
    }
    if (res.status !== "ok") {
      setPhase({ kind: "form" });
      setProblems(
        res.status === "invalid"
          ? res.problems
          : res.status === "busy"
            ? ["We’re getting a lot of applications right now. Your answers are saved here; please try again in an hour."]
            : ["Something went wrong on our side. Your answers are saved here; please try again in a minute."],
      );
      return;
    }

    const bucket = supabase().storage.from("vendor-photos");
    const put = async (u: { path: string; token: string }, blob: Blob) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error } = await bucket.uploadToSignedUrl(u.path, u.token, blob, { contentType: "image/jpeg" });
        if (!error) return true;
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
      return false;
    };
    let done = 0;
    const sent: { width: number; height: number }[] = [];
    for (const [i, p] of photos.entries()) {
      const u = res.uploads[i];
      const ok = (await Promise.all([put(u.full, p.full), put(u.w1200, p.w1200), put(u.w480, p.w480)])).every(Boolean);
      sent.push(ok ? { width: p.width, height: p.height } : { width: 0, height: 0 });
      setPhase({ kind: "sending", done: ++done, total: photos.length });
    }
    // Photos that didn't make it are skipped by the server; the team sees what arrived.
    await finishApplication(res.id, sent).catch(() => undefined);
    finished(false);
  }

  function finished(duplicate: boolean) {
    try {
      localStorage.removeItem(SAVED);
    } catch {}
    clearPhotos();
    setPhase({ kind: "sent", duplicate });
    scrollTo({ top: 0 });
  }

  // Their listing as the public page will set it, for the preview.
  const previewVendor: Vendor = {
    slug: "preview",
    name: a.name.trim() || "Your business",
    discipline: a.discipline.trim() || "What you do",
    services: a.services,
    based: a.based.trim() || undefined,
    serviceArea: a.serviceArea,
    languages: languageOrder.filter((l) => a.languages.includes(l)),
    otherLanguages: otherLanguageList(a.otherLanguages),
    lede: "",
    story: normaliseStory(splitStory(a.story)),
    contact: { website: withScheme(a.website) || undefined },
    socials: { instagram: socialUrl(a.instagram, "instagram") || undefined, facebook: socialUrl(a.facebook, "facebook") || undefined },
    featured: false,
    cover: photos[0]?.url,
    gallery: photos.slice(1).map((p) => p.url),
    ratios: Object.fromEntries(photos.map((p) => [p.url, p.width / p.height])),
  };

  const section = step.section;
  const progress = [0, 1, 2].map((s) => {
    const steps = flow.filter((f) => f.section === s);
    if (section === undefined || s > section) return 0;
    if (s < section) return 1;
    return (steps.findIndex((f) => f.id === step.id) + 1) / steps.length;
  });

  if (phase.kind === "sent") return <Sent a={a} duplicate={phase.duplicate} cover={photos[0]?.url} />;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-svh bg-paper">
        {/* On the first screen the photo runs to the top: no bar, the way out sits on the photo. */}
        <header className={clsx("inset-x-0 top-0 z-30", index === 0 ? "absolute bg-paper/90 backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none" : "fixed bg-paper/90 backdrop-blur-xl")}>
          <div className="shell flex h-[var(--header-h)] items-center justify-between">
            <Link href="/list-your-business" aria-label="East Meets Wed, list your business">
              <Monogram className="w-[4.5rem] transition-opacity hover:opacity-60" />
            </Link>
            <Link href="/list-your-business" className={clsx("t-nav link-line", index === 0 && "lg:text-white")}>
              {index === 0 ? "Exit" : "Save and exit"}
            </Link>
          </div>
        </header>

        <form
          id="step"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (step.id === "review") send();
            else next();
          }}
        >
          {/* Bots fill every field they find; people never see this one. */}
          <input ref={trap} name="company_site" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" />
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.main
              key={step.id}
              custom={dir}
              initial={{ opacity: 0, y: dir * 24 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease } }}
              exit={{ opacity: 0, y: dir * -12, transition: { duration: 0.2, ease: [0.25, 1, 0.5, 1] } }}
              id="main"
              className={clsx(
                step.id !== "welcome" && "pt-[calc(var(--header-h)+clamp(1.5rem,6vh,4rem))] pb-[calc(6rem+clamp(2rem,6vh,4rem))]",
                step.id === "welcome" ? "" : step.intro ? "shell" : "mx-auto w-full px-[var(--gutter)]",
                wide(step.id) ? "max-w-[64rem]" : !step.intro && step.id !== "welcome" && "max-w-[46rem]",
              )}
            >
              {step.id === "welcome" && (
                <Welcome
                  image={images.welcome}
                  headingId={headingId}
                  returning={returning}
                  name={a.name}
                  account={account}
                  onAccount={refresh}
                  onStart={() => go(1)}
                  onResume={() => go(resumeAt.current)}
                  onRestart={() => {
                    setA(emptyApplication);
                    photos.forEach((p) => URL.revokeObjectURL(p.url));
                    setPhotos([]);
                    setReturning(false);
                    startedAt.current = Date.now();
                    go(1);
                  }}
                />
              )}
              {step.id === "about" && (
                <Intro headingId={headingId} image={images.about} alt="Invictus Quartet, four musicians with their instruments" title="Tell us about your work" time="About 3 minutes">
                  What you do, the languages you work in and where you’ll travel. Couples search the directory by all three.
                </Intro>
              )}
              {step.id === "craft" && <Crafts a={a} set={set} flip={flip} headingId={headingId} uid={uid} />}
              {step.id === "languages" && (
                <>
                  <StepHead id={headingId} title="Which languages do you work in?">
                    Choose every one you’re comfortable working in. Your listing shows each in its own script.
                  </StepHead>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                    {languageOrder.map((l) => (
                      <Tile key={l} on={a.languages.includes(l)} onClick={() => flip("languages", l)} className="min-h-[7rem] justify-between">
                        <span lang={languageNames[l].lang} className="font-display text-[clamp(1.375rem,2.2vw,1.75rem)] leading-tight">
                          {languageNames[l].native}
                        </span>
                        <span className="t-small">{l}</span>
                      </Tile>
                    ))}
                  </div>
                  <div className="mt-10 max-w-[28rem]">
                    <Field label="Another language?" htmlFor={`${uid}-other`} note="Shown on your listing as you write it. Separate several with commas.">
                      <input
                        id={`${uid}-other`}
                        value={a.otherLanguages}
                        maxLength={LIMITS.otherLanguages}
                        onChange={(e) => set("otherLanguages", e.target.value)}
                        placeholder="For example, Hindi or Khmer"
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </>
              )}
              {step.id === "where" && <Where a={a} set={set} flip={flip} headingId={headingId} uid={uid} />}
              {step.id === "show" && (
                <Intro headingId={headingId} image={images.show} alt="Live illustrations of wedding guests by Dillon Reyn" title="Show couples your work" time="About 5 minutes">
                  Your photos, your name and a few words in your own voice. On East Meets Wed your work is shown large, never cropped, with nothing competing for attention.
                </Intro>
              )}
              {step.id === "photos" && <PhotoStep photos={photos} onChange={setPhotos} headingId={headingId} />}
              {step.id === "name" && (
                <WithCard a={a} cover={photos[0]?.url}>
                  <StepHead id={headingId} title="What’s your business called?">
                    As couples will see it.
                  </StepHead>
                  <input
                    aria-label="Business name"
                    value={a.name}
                    maxLength={LIMITS.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Business name"
                    autoComplete="organization"
                    className="w-full border-b hairline bg-transparent pb-3 font-display text-[clamp(1.875rem,3.4vw,2.75rem)] leading-tight tracking-[-0.02em] placeholder:text-ink-mute/35 focus:border-ink focus:outline-none"
                  />
                  <p className="t-small mt-2 text-right tabular-nums">
                    {a.name.length} / {LIMITS.name}
                  </p>
                  <div className="mt-8">
                    <Field label="And your name" htmlFor={`${uid}-person`} note="So the team knows who they’re talking to. It isn’t shown on your listing.">
                      <input id={`${uid}-person`} value={a.person} maxLength={LIMITS.person} onChange={(e) => set("person", e.target.value)} autoComplete="name" className={inputClass} />
                    </Field>
                  </div>
                </WithCard>
              )}
              {step.id === "line" && (
                <WithCard a={a} cover={photos[0]?.url}>
                  <StepHead id={headingId} title="Describe what you do in a few words">
                    This line sits under your name across the site.
                  </StepHead>
                  <input
                    aria-label="What you do"
                    value={a.discipline}
                    maxLength={LIMITS.discipline}
                    onChange={(e) => set("discipline", e.target.value)}
                    placeholder="For example, documentary photography"
                    className={clsx(inputClass, "text-[1.25rem]")}
                  />
                  <p className="t-small mt-2 text-right tabular-nums">
                    {a.discipline.length} / {LIMITS.discipline}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {disciplineSuggestions(a.services, other).map((s) => (
                      <Chip key={s} on={a.discipline === s} onClick={() => set("discipline", s)}>
                        {s}
                      </Chip>
                    ))}
                  </div>
                </WithCard>
              )}
              {step.id === "story" && (
                <>
                  <StepHead id={headingId} title="Tell couples about your work">
                    In your own words: who you are, how you work and the traditions you know. A short subheading or a list helps it read at a glance.
                  </StepHead>
                  <StoryEditor value={a.story} onChange={(v) => set("story", v)} label="About your work" />
                </>
              )}
              {step.id === "finish" && (
                <Intro headingId={headingId} image={images.finish} alt="A couple laughing at their reception, photographed by At Last Film and Photography" title="Finish up" time="About 2 minutes">
                  How couples reach you, then a look at your listing exactly as it will appear before you send it.
                </Intro>
              )}
              {step.id === "contact" && <Contact a={a} set={set} headingId={headingId} uid={uid} />}
              {step.id === "review" && (
                <Review a={a} photos={photos} headingId={headingId} uid={uid} problems={problems} onEdit={edit} onPreview={() => setPreview(true)} onRights={(v) => set("rights", v)} />
              )}
            </motion.main>
          </AnimatePresence>
        </form>

        {step.id !== "welcome" && (
          <footer className="fixed inset-x-0 bottom-0 z-30 bg-paper">
            <div className="flex gap-1.5" aria-hidden>
              {progress.map((p, i) => (
                <span key={i} className="h-[3px] flex-1 bg-ink/10">
                  <span className="block h-full origin-left bg-ink transition-transform duration-700 ease-out-expo" style={{ transform: `scaleX(${p})` }} />
                </span>
              ))}
            </div>
            <div className="shell flex h-20 items-center justify-between">
              <button type="button" onClick={() => go(index - 1)} className="t-nav link-line -ml-1 px-1 py-2">
                Back
              </button>
              <Button type="submit" form="step" disabled={!valid[step.id]} className="min-w-[8.5rem] disabled:cursor-not-allowed disabled:opacity-25">
                {step.id === "review" ? "Send application" : backToReview ? "Save" : "Next"}
              </Button>
            </div>
          </footer>
        )}
      </div>

      <AnimatePresence>{phase.kind === "sending" && <Sending done={phase.done} total={phase.total} />}</AnimatePresence>
      <Portal>
        <AnimatePresence>
          {preview && (
            <PreviewFrame onClose={() => setPreview(false)}>
              {/* The real vendor page, with their answers. Nothing in it links anywhere. */}
              <div className="pointer-events-none select-none">
                <VendorSpread vendor={previewVendor} related={[]} still />
              </div>
            </PreviewFrame>
          )}
        </AnimatePresence>
      </Portal>
    </MotionConfig>
  );
}

const wide = (id: StepId) => id === "craft" || id === "languages" || id === "name" || id === "line" || id === "review";


type Setter = <K extends keyof Application>(key: K, value: Application[K]) => void;
type Flip = (key: "services" | "languages" | "serviceArea" | "crafts", value: string) => void;

const toggle = <T extends string>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

// ── Screens ─────────────────────────────────────────────────────────────

/** The first screen: one photo of a vendor at work, and beside it the account and the way in. */
function Welcome({
  image,
  headingId,
  returning,
  name,
  account,
  onAccount,
  onStart,
  onResume,
  onRestart,
}: {
  image: string;
  headingId: string;
  returning: boolean;
  name: string;
  account: Account | undefined;
  onAccount: () => Promise<void>;
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="grid grid-cols-1 pt-[var(--header-h)] lg:min-h-svh lg:grid-cols-2 lg:pt-0">
      <div className="relative aspect-[4/3] overflow-hidden lg:order-2 lg:aspect-auto">
        <motion.div
          initial={{ scale: 1.04, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease }}
          className="absolute inset-0 lg:sticky lg:inset-auto lg:top-0 lg:h-svh"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a site photo */}
          <img src={image} alt="Kindred Visuals filming at a wedding reception" className="absolute inset-0 size-full object-cover object-[50%_30%]" />
          {/* Just enough shade behind Exit to read on a bright sky. */}
          <div aria-hidden className="absolute inset-x-0 top-0 hidden h-40 bg-gradient-to-b from-ink/40 to-transparent lg:block" />
        </motion.div>
      </div>
      <div className="flex items-center px-[var(--gutter)] pt-10 pb-16 lg:order-1 lg:pt-[calc(var(--header-h)+3rem)] lg:pb-16 lg:pr-[clamp(2rem,6vw,7rem)] min-[1760px]:pl-[calc((100vw-1760px)/2+var(--gutter))]">
        <div className="w-full max-w-[34rem]">
          <h1 id={headingId} tabIndex={-1} className="t-display text-[clamp(2.75rem,4.6vw,5rem)] text-balance outline-none">
            {returning ? "Welcome back" : "List your business on East Meets Wed"}
          </h1>
          <p className="t-body mt-6 max-w-[40ch]">
            {returning
              ? `Your answers${name ? ` for ${name}` : ""} are saved in this browser. Pick up where you left off.`
              : "Tell us about your work and show us your photos. It takes about ten minutes, saves as you go, and our team reads every one."}
          </p>
          <div className="mt-10">
            <AccountPanel account={account} onChange={onAccount} />
            {account?.confirmed && (
              <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Button type="button" onClick={returning ? onResume : onStart} className="min-w-[10rem]">
                  {returning ? "Continue" : "Get started"}
                </Button>
                {returning && (
                  <button type="button" onClick={onRestart} className="t-nav link-line">
                    Start again
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Opens each part: the heading beside a photo, and how long the part takes. */
function Intro({ headingId, image, alt, title, time, children }: { headingId: string; image: string; alt: string; title: string; time: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100svh-var(--header-h)-11rem)] grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="order-2 lg:order-1 lg:col-span-5">
        <h1 id={headingId} tabIndex={-1} className="t-display text-[clamp(2.75rem,5.4vw,5.5rem)] text-balance outline-none">
          {title}
        </h1>
        <p className="t-body mt-6 max-w-[38ch]">{children}</p>
        <p className="t-small mt-6 flex items-center gap-2 text-ink">
          <Icon name="clock" className="size-4 text-ink-soft" />
          {time}
        </p>
      </div>
      <div className="order-1 lg:order-2 lg:col-span-6 lg:col-start-7">
        <motion.div
          initial={{ scale: 1.06, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease }}
          className="relative aspect-[4/3] overflow-hidden lg:aspect-[5/6] lg:max-h-[calc(100svh-var(--header-h)-12rem)] lg:w-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a site photo */}
          <img src={image} alt={alt} className="absolute inset-0 size-full object-cover" />
        </motion.div>
      </div>
    </div>
  );
}

/**
 * What they do, and what they offer, on one screen. Choose any number of crafts; each one chosen
 * opens its services underneath, so a single choice still fills the page with the next decision.
 * "Something else" asks in their words, for the team to place.
 */
function Crafts({ a, set, flip, headingId, uid }: { a: Application; set: Setter; flip: Flip; headingId: string; uid: string }) {
  const chosen = crafts.filter((c) => a.crafts.includes(c.id));
  const otherOn = a.otherCraft !== "";
  const otherRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <StepHead id={headingId} title="What do you do?">
        Choose as many as you like, then the services you offer under each.
      </StepHead>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {crafts.map((c) => (
          <Tile
            key={c.id}
            on={a.crafts.includes(c.id)}
            onClick={() => {
              const on = a.crafts.includes(c.id);
              flip("crafts", c.id);
              // Taking a craft away takes its services with it.
              if (on) set("services", a.services.filter((s) => !c.services.includes(s)));
            }}
            className="min-h-[8rem] justify-between"
          >
            <Icon name={c.id} className="size-8" />
            <span className="text-[1.0625rem] leading-snug">{c.name}</span>
          </Tile>
        ))}
        <Tile
          on={otherOn}
          onClick={() => {
            set("otherCraft", otherOn ? "" : " ");
            if (!otherOn) setTimeout(() => otherRef.current?.focus(), 60);
          }}
          className="col-span-2 min-h-[8rem] justify-between sm:col-span-1"
        >
          <Icon name="plus" className="size-8" />
          <span className="text-[1.0625rem] leading-snug">Something else</span>
        </Tile>
      </div>

      <AnimatePresence initial={false}>
        {(chosen.length > 0 || otherOn) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease }}
            className="overflow-hidden"
          >
            <div className="mt-12 border-t hairline">
              <AnimatePresence initial={false}>
                {chosen.map((c) => {
                  const none = !c.services.some((s) => a.services.includes(s));
                  return (
                    <motion.div
                      key={c.id}
                      role="group"
                      aria-label={c.name}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.45, ease }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 gap-4 border-b hairline py-6 sm:grid-cols-[12rem_1fr] sm:gap-8">
                        <span className="flex items-start gap-3">
                          <Icon name={c.id} className="mt-0.5 size-5 shrink-0 text-ink-soft" />
                          <span>
                            <span className="block text-ink">{c.name}</span>
                            <span className={clsx("t-small mt-1 block", none && "text-warn")}>{none ? "Choose at least one" : "Choose all that apply"}</span>
                          </span>
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {c.services.map((s) => (
                            <Chip key={s} on={a.services.includes(s)} onClick={() => flip("services", s)}>
                              {serviceLabels[s]}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {otherOn && (
                <div className="grid grid-cols-1 gap-4 border-b hairline py-6 sm:grid-cols-[12rem_1fr] sm:gap-8">
                  <label htmlFor={`${uid}-craft`} className="flex items-start gap-3">
                    <Icon name="plus" className="mt-0.5 size-5 shrink-0 text-ink-soft" />
                    <span>
                      <span className="block text-ink">Something else</span>
                      <span className="t-small mt-1 block">The team will place you</span>
                    </span>
                  </label>
                  <input
                    ref={otherRef}
                    id={`${uid}-craft`}
                    value={a.otherCraft.trimStart()}
                    maxLength={LIMITS.otherCraft}
                    onChange={(e) => set("otherCraft", e.target.value || " ")}
                    placeholder="For example, tea ceremony sets or henna"
                    className={clsx(inputClass, "-mt-3")}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** A step with their card growing beside it. */
function WithCard({ a, cover, children }: { a: Application; cover?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
      <div className="md:col-span-7">{children}</div>
      <div className="md:col-span-4 md:col-start-9">
        <p className="t-small mb-3">How couples will see you</p>
        <CardPreview cover={cover} name={a.name} line={a.discipline} languages={languageOrder.filter((l) => a.languages.includes(l))} className="mx-auto max-w-[18rem] md:max-w-none" />
      </div>
    </div>
  );
}

function Where({ a, set, flip, headingId, uid }: { a: Application; set: Setter; flip: Flip; headingId: string; uid: string }) {
  const everywhere = australiaWide(a.serviceArea);
  const abroad = a.serviceArea.filter((s) => s in overseas);
  return (
    <>
      <StepHead id={headingId} title="Where do you work?" />
      <div className="max-w-[28rem]">
        <Field label="Where you’re based" htmlFor={`${uid}-based`} note="A suburb or town is plenty.">
          <input id={`${uid}-based`} value={a.based} maxLength={LIMITS.based} onChange={(e) => set("based", e.target.value)} placeholder="For example, Footscray" autoComplete="address-level2" className={inputClass} />
        </Field>
      </div>
      <fieldset className="mt-12">
        <legend className="t-small mb-3 text-ink">Where you’ll travel for a wedding</legend>
        <div className="flex flex-wrap gap-2">
          <Chip on={everywhere} onClick={() => set("serviceArea", everywhere ? abroad : [...allStates, ...abroad])}>
            Anywhere in Australia
          </Chip>
          {allStates.map((s) => (
            <Chip key={s} on={a.serviceArea.includes(s)} onClick={() => flip("serviceArea", s)}>
              {states[s]}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-10">
        <legend className="t-small mb-3 text-ink">Overseas</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(overseas) as OverseasCode[]).map((s) => (
            <Chip key={s} on={a.serviceArea.includes(s)} onClick={() => flip("serviceArea", s)}>
              {overseas[s]}
            </Chip>
          ))}
        </div>
      </fieldset>
    </>
  );
}

function Contact({ a, set, headingId, uid }: { a: Application; set: Setter; headingId: string; uid: string }) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const bad = {
    email: touched.email && !isEmail(a.email),
    website: touched.website && !isWebsite(a.website),
    instagram: touched.instagram && !!a.instagram.trim() && !socialUrl(a.instagram, "instagram"),
    facebook: touched.facebook && !!a.facebook.trim() && !socialUrl(a.facebook, "facebook"),
  };
  const err = (on: boolean | undefined, text: string, fallback?: string) => (on ? <span className="text-bad">{text}</span> : fallback);
  return (
    <>
      <StepHead id={headingId} title="How do couples reach you?">
        Enquiries come to you directly. Your email and phone stay private; your website and socials sit on your listing.
      </StepHead>
      <div className="space-y-8">
        <Field label="Email for enquiries" htmlFor={`${uid}-email`} note={err(bad.email, "That doesn’t look like an email address.")}>
          <input id={`${uid}-email`} type="email" value={a.email} onChange={(e) => set("email", e.target.value)} onBlur={blur("email")} autoComplete="email" inputMode="email" placeholder="hello@yourstudio.com.au" className={inputClass} />
        </Field>
        <Field label="Phone (optional)" htmlFor={`${uid}-phone`}>
          <PhoneField id={`${uid}-phone`} country={a.phoneCountry} value={a.phone} onCountry={(c) => set("phoneCountry", c)} onChange={(v) => set("phone", v)} />
        </Field>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-x-6">
          <div className="sm:col-span-2">
            <Field label="Website (optional)" htmlFor={`${uid}-web`} note={err(bad.website, "Check the address.")}>
              <input id={`${uid}-web`} value={a.website} maxLength={200} onChange={(e) => set("website", e.target.value)} onBlur={blur("website")} placeholder="yourstudio.com.au" inputMode="url" autoComplete="url" className={inputClass} />
            </Field>
          </div>
          <Field label="Instagram (optional)" htmlFor={`${uid}-ig`} note={err(bad.instagram, "Your handle, or a link to your profile.")}>
            <input id={`${uid}-ig`} value={a.instagram} maxLength={200} onChange={(e) => set("instagram", e.target.value)} onBlur={blur("instagram")} placeholder="@yourstudio" className={inputClass} />
          </Field>
          <Field label="Facebook (optional)" htmlFor={`${uid}-fb`} note={err(bad.facebook, "Your page name, or a link to it.")}>
            <input id={`${uid}-fb`} value={a.facebook} maxLength={200} onChange={(e) => set("facebook", e.target.value)} onBlur={blur("facebook")} placeholder="yourstudio" className={inputClass} />
          </Field>
        </div>
      </div>
    </>
  );
}

function Review({
  a,
  photos,
  headingId,
  uid,
  problems,
  onEdit,
  onPreview,
  onRights,
}: {
  a: Application;
  photos: ApplyPhoto[];
  headingId: string;
  uid: string;
  problems: string[];
  onEdit: (id: StepId) => void;
  onPreview: () => void;
  onRights: (v: boolean) => void;
}) {
  const area = areaLabel(a.serviceArea, "").replace("Australia-wide", "anywhere in Australia");
  const blocks = normaliseStory(splitStory(a.story));
  const rows: { label: string; value: React.ReactNode; step: StepId }[] = [
    { label: "Business", value: [a.name, a.person].filter(Boolean).join(", "), step: "name" },
    { label: "In a few words", value: a.discipline, step: "line" },
    { label: "Services", value: [...a.services.map((s) => serviceLabels[s]), a.otherCraft.trim()].filter(Boolean).join(", "), step: "craft" },
    {
      label: "Languages",
      value: (
        <span className="flex flex-wrap gap-x-3">
          {languageOrder
            .filter((l) => a.languages.includes(l))
            .map((l) => (
              <span key={l} lang={languageNames[l].lang}>
                {languageNames[l].native}
              </span>
            ))}
          {a.otherLanguages.trim() && <span>{a.otherLanguages.trim()}</span>}
        </span>
      ),
      step: "languages",
    },
    { label: "Where", value: [a.based, area && `Travels to ${area}`].filter(Boolean).join(". "), step: "where" },
    {
      label: "Photos",
      value: (
        <span className="flex gap-1.5">
          {photos.slice(0, 6).map((p) => (
            // eslint-disable-next-line @next/next/no-img-element -- a local blob of their own photo
            <img key={p.id} src={p.url} alt="" className="size-10 object-cover" />
          ))}
          {photos.length > 6 && <span className="t-small grid size-10 place-items-center bg-paper-soft">+{photos.length - 6}</span>}
        </span>
      ),
      step: "photos",
    },
    { label: "About", value: <span className="line-clamp-3">{blocks.map((b) => b.replace(/^## |^- |^\d+\. |\*\*/gm, "")).join(" ")}</span>, step: "story" },
    { label: "Contact", value: [a.email, fullPhone(a), a.website, a.instagram, a.facebook].filter((s) => s.trim()).join(" · "), step: "contact" },
  ];
  return (
    <>
      <StepHead id={headingId} title="Check your listing">
        This is what the team will review. Change anything before you send it.
      </StepHead>
      <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-4">
          <CardPreview cover={photos[0]?.url} name={a.name} line={a.discipline} languages={languageOrder.filter((l) => a.languages.includes(l))} className="mx-auto max-w-[20rem] md:max-w-none" />
          <Button type="button" variant="outline" onClick={onPreview} className="mt-6 w-full gap-2.5">
            <Icon name="eye" className="size-4" />
            Preview your page
          </Button>
        </div>
        <div className="md:col-span-7 md:col-start-6">
          <dl className="border-t hairline">
            {rows.map((r) => (
              <div key={r.label} className="grid grid-cols-[7.5rem_1fr_auto] items-baseline gap-4 border-b hairline py-4 sm:grid-cols-[9rem_1fr_auto]">
                <dt className="t-small">{r.label}</dt>
                <dd className="min-w-0 break-words text-ink">{r.value || <span className="text-ink-mute">Not added</span>}</dd>
                <dd>
                  <button type="button" onClick={() => onEdit(r.step)} className="t-small link-line text-ink" aria-label={`Edit ${r.label.toLowerCase()}`}>
                    Edit
                  </button>
                </dd>
              </div>
            ))}
          </dl>
          <label htmlFor={`${uid}-rights`} className="mt-8 flex cursor-pointer items-start gap-3.5">
            <input id={`${uid}-rights`} type="checkbox" checked={a.rights} onChange={(e) => onRights(e.target.checked)} className="peer sr-only" />
            <Check on={a.rights} className="mt-[0.1875rem] peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ink" />
            <span className="text-ink">These photos are mine to share, or I have the photographer’s permission to use them.</span>
          </label>
          {problems.length > 0 && (
            <div role="alert" className="mt-6 space-y-1.5">
              {problems.map((p) => (
                <p key={p} className="t-small text-bad">
                  {p}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Sending({ done, total }: { done: number; total: number }) {
  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 grid place-items-center bg-paper px-[var(--gutter)]"
    >
      <div className="w-full max-w-[24rem] text-center">
        <p className="t-heading">Sending your application</p>
        <div className="mt-8 h-[3px] bg-ink/10">
          <span className="block h-full origin-left bg-ink transition-transform duration-700 ease-out-expo" style={{ transform: `scaleX(${total ? Math.max(0.04, done / total) : 0.04})` }} />
        </div>
        <p className="t-small mt-4">{done < total ? `Uploading photo ${done + 1} of ${total}` : "Almost done"}</p>
      </div>
    </motion.div>
  );
}

/**
 * After sending: their own work, not a stock photo. Their card sits on the right as it will in the
 * directory, marked as in review, and the left says plainly what happens next.
 */
function Sent({ a, duplicate, cover }: { a: Application; duplicate?: boolean; cover?: string }) {
  const first = a.person.trim().split(/\s+/)[0];
  const steps = [
    { title: "Application received", body: duplicate ? `We already had one from ${a.email}.` : `A confirmation is on its way to ${a.email}.`, done: true },
    { title: "Reviewed by the team", body: "Every listing is looked at by hand, so the directory stays worth browsing.", done: false },
    { title: "Your listing goes live", body: "We’ll email you as soon as couples can find you.", done: false },
  ];
  const rise = (d: number) => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 1, ease, delay: d } });
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-svh bg-paper">
        <header className="shell flex h-[var(--header-h)] items-center">
          <Link href="/" aria-label="East Meets Wed, home">
            <Monogram className="w-[4.5rem] transition-opacity hover:opacity-60" />
          </Link>
        </header>
        <main id="main" className="shell grid grid-cols-1 gap-12 pb-[clamp(2rem,5vw,4rem)] lg:min-h-[calc(100svh-var(--header-h))] lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col justify-center lg:col-span-6 lg:pr-8">
            <motion.h1 {...rise(0.1)} className="t-display text-[clamp(2.75rem,5.4vw,5.5rem)] text-balance">
              {duplicate ? "We have your application" : first ? `Thank you, ${first}` : "Thank you"}
            </motion.h1>
            <motion.p {...rise(0.2)} className="t-body mt-6 max-w-[40ch]">
              {duplicate ? "There’s nothing more to do. The team will be in touch at the same address." : `${a.name} is with the East Meets Wed team.`}
            </motion.p>

            <motion.ol {...rise(0.3)} className="mt-12 max-w-[32rem]">
              {steps.map((s, i) => (
                <li key={s.title} className="relative flex gap-5 pb-8 last:pb-0">
                  {i < steps.length - 1 && <span aria-hidden className="absolute top-8 bottom-0 left-[0.9375rem] w-px bg-line" />}
                  <span className={clsx("grid size-[1.875rem] shrink-0 place-items-center rounded-full border", s.done ? "border-ink bg-ink text-paper" : "hairline bg-surface")}>
                    {s.done ? <Icon name="check" className="size-3.5" /> : <span className="size-1.5 rounded-full bg-ink/25" />}
                  </span>
                  <span className="pt-1">
                    <span className="block text-ink">{s.title}</span>
                    <span className="t-small mt-1 block">{s.body}</span>
                  </span>
                </li>
              ))}
            </motion.ol>

            <motion.div {...rise(0.4)} className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Button href="/">Back to East Meets Wed</Button>
              <Link href="/vendors" className="t-nav link-line">
                Browse the directory
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, ease }}
            className="relative flex items-center justify-center bg-paper-soft px-[clamp(1.5rem,6vw,6rem)] py-[clamp(2.5rem,6vw,5rem)] lg:col-span-6"
          >
            <div className="w-full max-w-[28rem]">
              <div className="relative">
                <CardPreview cover={cover} name={a.name} line={a.discipline} languages={languageOrder.filter((l) => a.languages.includes(l))} />
                <span className="absolute top-3 left-3 flex items-center gap-2 bg-paper px-3 py-1.5 text-[0.75rem] text-ink">
                  <span className="size-1.5 rounded-full bg-warn" />
                  In review
                </span>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </MotionConfig>
  );
}
