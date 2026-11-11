"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useState } from "react";
import { Monogram } from "@/components/brand/Logo";
import { Icon } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import { GoogleLogo, MicrosoftLogo, ProviderButton } from "@/components/apply/AccountPanel";
import { requestPasswordLink } from "@/lib/account/access";
import { decodeToken } from "@/lib/admin/session";
import { supabase } from "@/lib/supabase/browser";
import { canOpen, homeOf, readSession, safeNext } from "@/lib/supabase/session";

const expo = [0.16, 1, 0.3, 1] as const;
const inOut = [0.76, 0, 0.24, 1] as const;

const photo = {
  src: "/images/vendors/yaya-films/04.jpg",
  alt: "A bride in a cathedral-length veil on a garden terrace",
  credit: "Yaya Films",
};

const field =
  "w-full border-b border-ink/15 bg-transparent py-3 text-[0.9375rem] text-ink transition-colors duration-300 placeholder:text-ink-mute/60 hover:border-ink/35 focus:border-ink focus:outline-none";

/**
 * Sign-in for the team and vendors: email and password, or Google or Microsoft. Who you are (team
 * or vendor) comes from your account, so there's nothing to choose. Only accounts linked to the
 * team or a listing get in. "Set or reset your password" emails a link (lib/account/access.ts),
 * which is also how a vendor signs in for the first time.
 */
export function SignIn() {
  return (
    <MotionConfig reducedMotion="user">
      <Suspense fallback={<SignInView />}>
        <WithParams />
      </Suspense>
    </MotionConfig>
  );
}

function WithParams() {
  const params = useSearchParams();
  return <SignInView next={safeNext(params.get("next"))} startWithLink={params.get("password") === "1"} access={params.get("access")} />;
}

/** Each line of the form rises in after the photo has started to open. */
const rise = (i: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 1.1, ease: expo, delay: 0.55 + i * 0.07 },
});

const accessErrors: Record<string, string> = {
  none: "That account isn’t linked to a listing yet. If you’ve applied, we’ll email you when your listing is approved.",
  failed: "That sign-in didn’t finish. Try again, or use your email and password.",
};

function SignInView({ next, startWithLink, access }: { next?: string; startWithLink?: boolean; access?: string | null }) {
  const router = useRouter();
  const id = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | undefined>(access ? accessErrors[access] : undefined);
  // Signing in; asking for a password link; or the link is on its way.
  const [mode, setMode] = useState<"signin" | "link" | "sent">(startWithLink ? "link" : "signin");
  const [provider, setProvider] = useState<"google" | "azure" | null>(null);

  const askForLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(undefined);
    const r = await requestPasswordLink({ email }).catch(() => ({ status: "sent" as const }));
    setBusy(false);
    if (r.status === "invalid") setError("Check your email address.");
    else setMode("sent");
  };

  const oauth = async (p: "google" | "azure") => {
    setProvider(p);
    setError(undefined);
    const back = `/auth/callback?next=${encodeURIComponent(next ?? "/portal")}`;
    const { error } = await supabase().auth.signInWithOAuth({ provider: p, options: { redirectTo: `${location.origin}${back}`, scopes: p === "azure" ? "email" : undefined } });
    if (error) {
      setProvider(null);
      setError("That sign-in isn’t available right now. Use your email and password instead.");
    }
  };

  // Warm both destinations so the hand-off is instant.
  useEffect(() => {
    router.prefetch("/admin/approvals");
    router.prefetch("/account/listing");
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || leaving) return;
    setBusy(true);
    setError(undefined);
    const { data, error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
    const session = readSession(decodeToken(data.session?.access_token));
    if (error || !session) {
      if (!error) await supabase().auth.signOut();
      setBusy(false);
      setError(
        error?.status === 429
          ? "Too many tries. Wait a minute and try again."
          : error
            ? "That email and password don't match."
            : "This account doesn't have access yet. Ask the East Meets Wed team.",
      );
      return;
    }
    setLeaving(true);
    // Let the page dissolve before the dashboard arrives.
    setTimeout(() => router.push(next && canOpen(session, next) ? next : homeOf(session)), 650);
  };

  return (
    <motion.div
      className="grid min-h-svh grid-cols-1 bg-paper lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
      animate={leaving ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.6, ease: inOut, delay: leaving ? 0.15 : 0 }}
    >
      {/* The photo sits in its column with a paper margin, and opens like the home page's hero. */}
      <div className="relative hidden p-3 lg:block">
        <motion.div
          className="relative h-full overflow-hidden"
          initial={{ clipPath: "inset(100% 0 0 0)" }}
          animate={{ clipPath: "inset(0% 0 0 0)" }}
          transition={{ duration: 1.4, ease: inOut, delay: 0.1 }}
        >
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 1.14 }}
            animate={{ scale: leaving ? 1.04 : 1 }}
            transition={{ duration: leaving ? 0.8 : 2.4, ease: expo, delay: leaving ? 0 : 0.1 }}
          >
            <Media src={photo.src} alt={photo.alt} brief="" priority sizes="50vw" position="55% 50%" className="size-full" />
          </motion.div>
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-night/35 to-transparent" />
          <motion.p className="absolute bottom-6 left-7 text-[0.75rem] text-paper/80" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1.3 }}>
            Photograph by {photo.credit}
          </motion.p>
        </motion.div>
      </div>

      <div className="flex min-h-svh flex-col px-6 py-7 sm:px-12 lg:px-[clamp(3rem,6vw,6.5rem)]">
        <motion.div className="flex items-center justify-between" {...rise(0)}>
          <Link href="/" aria-label="East Meets Wed, home" className="transition-opacity duration-500 hover:opacity-60">
            <Monogram className="w-[4.5rem]" />
          </Link>
          <Link href="/" className="group flex items-center gap-2 text-[0.8125rem] text-ink-mute transition-colors hover:text-ink">
            <Icon name="arrow-left" className="size-4 transition-transform duration-500 ease-out-expo group-hover:-translate-x-0.5" strokeWidth={1.25} />
            Back to the site
          </Link>
        </motion.div>

        <div className="my-auto w-full max-w-[25rem] py-16">
          <motion.h1 className="font-display text-[clamp(2.75rem,4.4vw,3.75rem)] leading-[0.98] tracking-[-0.03em]" {...rise(1)}>
            {mode === "signin" ? "Welcome back" : mode === "link" ? "Choose a password" : "Check your inbox"}
          </motion.h1>
          <motion.p className="mt-4 text-[0.9375rem] text-ink-mute" {...rise(2)}>
            {mode === "signin"
              ? "For vendors listed on East Meets Wed, and the team. Applied but not approved yet? We’ll email you when your listing is live."
              : mode === "link"
                ? "Signing in for the first time, or forgotten your password? We’ll email you a link to choose one."
                : `If ${email.trim()} has an account, a link to choose your password is on its way. It works once, for an hour.`}
          </motion.p>

          {mode === "sent" && (
            <button type="button" onClick={() => setMode("signin")} className="link-line mt-10 text-[0.9375rem] text-ink">
              Back to sign in
            </button>
          )}

          {mode === "link" && (
            <form onSubmit={askForLink} className="mt-10">
              <label htmlFor={`${id}-link-email`} className="text-[0.75rem] text-ink-mute">
                Email
              </label>
              <input id={`${id}-link-email`} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" className={field} />
              {error && (
                <p role="alert" className="mt-4 text-[0.8125rem] text-bad">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="group mt-10 flex h-14 w-full items-center justify-between bg-ink px-6 text-paper transition-colors duration-300 hover:bg-ink/90 disabled:cursor-wait"
              >
                <span className="t-nav">{busy ? "Sending" : "Email me a link"}</span>
                <Icon name="arrow" className="size-5 transition-transform duration-500 ease-out-expo group-hover:translate-x-1" strokeWidth={1.25} />
              </button>
              <button type="button" onClick={() => setMode("signin")} className="link-line mt-6 text-[0.875rem] text-ink-soft">
                Back to sign in
              </button>
            </form>
          )}

          {mode === "signin" && (
            <form onSubmit={submit} className="mt-10">
              <motion.div {...rise(3)}>
                <label htmlFor={`${id}-email`} className="text-[0.75rem] text-ink-mute">
                  Email
                </label>
                <input
                  id={`${id}-email`}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  aria-describedby={error ? `${id}-error` : undefined}
                  className={field}
                />
              </motion.div>
              <motion.div className="pt-5" {...rise(4)}>
                <div className="flex items-baseline justify-between">
                  <label htmlFor={`${id}-password`} className="text-[0.75rem] text-ink-mute">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("link");
                      setError(undefined);
                    }}
                    className="text-[0.75rem] text-ink-mute transition-colors hover:text-ink"
                  >
                    Set or reset your password
                  </button>
                </div>
                <input
                  id={`${id}-password`}
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  aria-describedby={error ? `${id}-error` : undefined}
                  className={field}
                />
              </motion.div>

              <AnimatePresence initial={false}>
                {error && (
                  <motion.p
                    key={error}
                    id={`${id}-error`}
                    role="alert"
                    className="mt-4 text-[0.8125rem] leading-relaxed text-bad"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: expo }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.div {...rise(5)}>
                <button
                  type="submit"
                  disabled={busy}
                  className="group relative mt-10 flex h-14 w-full items-center justify-between overflow-hidden bg-ink px-6 text-paper transition-colors duration-300 hover:bg-ink/90 disabled:cursor-wait"
                >
                  <span className="t-nav">{busy || leaving ? "Signing in" : "Sign in"}</span>
                  <Icon name="arrow" className="size-5 transition-transform duration-500 ease-out-expo group-hover:translate-x-1" strokeWidth={1.25} />
                  {/* A hairline runs along the foot of the button while the dashboard loads. */}
                  <motion.span
                    className="absolute bottom-0 left-0 h-px w-full origin-left bg-paper/60"
                    initial={false}
                    animate={{ scaleX: busy || leaving ? 1 : 0 }}
                    transition={{ duration: 0.7, ease: inOut }}
                  />
                </button>
              </motion.div>

              <motion.div {...rise(6)}>
                <div className="t-small my-6 flex items-center gap-4" aria-hidden>
                  <span className="h-px flex-1 bg-line" />
                  or
                  <span className="h-px flex-1 bg-line" />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <ProviderButton
                    label="Continue with Google"
                    busy={provider === "google"}
                    disabled={!!provider || busy}
                    onClick={() => void oauth("google")}
                    logo={<GoogleLogo />}
                  />
                  <ProviderButton
                    label="Continue with Microsoft"
                    busy={provider === "azure"}
                    disabled={!!provider || busy}
                    onClick={() => void oauth("azure")}
                    logo={<MicrosoftLogo />}
                  />
                </div>
              </motion.div>
            </form>
          )}
        </div>

        <motion.p className="text-[0.75rem] text-ink-mute" {...rise(7)}>
          © 2026 East Meets Wed
        </motion.p>
      </div>
    </motion.div>
  );
}
