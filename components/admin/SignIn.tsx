"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useState } from "react";
import { Monogram } from "@/components/brand/Logo";
import { Icon } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
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
 * Sign-in for the team and vendors, with email and password. Who you are (team or vendor) comes
 * from your account, so there's nothing to choose. Only accounts the team adds can sign in.
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
  return <SignInView next={safeNext(params.get("next"))} />;
}

/** Each line of the form rises in after the photo has started to open. */
const rise = (i: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 1.1, ease: expo, delay: 0.55 + i * 0.07 },
});

function SignInView({ next }: { next?: string }) {
  const router = useRouter();
  const id = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string>();

  // Warm both destinations so the hand-off is instant.
  useEffect(() => {
    router.prefetch("/admin/approvals");
    router.prefetch("/account");
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
          <motion.p
            className="absolute bottom-6 left-7 text-[0.75rem] text-paper/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.3 }}
          >
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
            Welcome back
          </motion.h1>
          <motion.p className="mt-4 text-[0.9375rem] text-ink-mute" {...rise(2)}>
            For the East Meets Wed team and listed vendors.
          </motion.p>

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
                <span className="text-[0.75rem] text-ink-mute">Forgotten it? Ask the East Meets Wed team</span>
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
          </form>
        </div>

        <motion.p className="text-[0.75rem] text-ink-mute" {...rise(6)}>
          © 2026 East Meets Wed
        </motion.p>
      </div>
    </motion.div>
  );
}
