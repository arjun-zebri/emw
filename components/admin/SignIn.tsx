"use client";

import clsx from "clsx";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useState } from "react";
import { Monogram } from "@/components/brand/Logo";
import { Icon } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import { signIn } from "@/lib/admin/session";
import { getVendor, vendors } from "@/lib/vendors";

type Role = "owner" | "vendor";

const expo = [0.16, 1, 0.3, 1] as const;
const inOut = [0.76, 0, 0.24, 1] as const;

const photo = {
  src: "/images/vendors/yaya-films/04.jpg",
  alt: "A bride in a cathedral-length veil on a garden terrace",
  credit: "Yaya Films",
};

const field =
  "w-full border-b border-ink/15 bg-transparent py-3 text-[0.9375rem] text-ink transition-colors duration-300 placeholder:text-ink-mute/60 hover:border-ink/35 focus:border-ink focus:outline-none";

/** Simulated sign-in: no password check, it just picks who you are for the demo. */
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
  return <SignInView initialRole={params.get("as") === "vendor" ? "vendor" : "owner"} next={params.get("next") ?? undefined} />;
}

/** Each line of the form rises in after the photo has started to open. */
const rise = (i: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 1.1, ease: expo, delay: 0.55 + i * 0.07 },
});

function SignInView({ initialRole = "owner", next }: { initialRole?: Role; next?: string }) {
  const router = useRouter();
  const id = useId();
  const [role, setRole] = useState<Role>(initialRole);
  const [slug, setSlug] = useState("katrina-lai");
  const [leaving, setLeaving] = useState(false);
  const vendor = getVendor(slug);
  const listed = vendors.filter((v) => v.cover).sort((a, b) => a.name.localeCompare(b.name));
  const home = role === "owner" ? "/admin" : "/account";

  // Warm both destinations so the hand-off is instant.
  useEffect(() => {
    router.prefetch("/admin");
    router.prefetch("/account");
  }, [router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (leaving) return;
    signIn(role === "owner" ? { role: "owner" } : { role: "vendor", slug });
    setLeaving(true);
    // Let the page dissolve before the dashboard arrives.
    setTimeout(() => router.push(next?.startsWith(home) ? next : home), 650);
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
          <motion.div className="mt-4 h-6 overflow-hidden" {...rise(2)}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={role}
                className="text-[0.9375rem] text-ink-mute"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: expo }}
              >
                {role === "owner" ? "Sign in to the East Meets Wed admin." : "Sign in to your listing, enquiries and stats."}
              </motion.p>
            </AnimatePresence>
          </motion.div>

          <motion.div role="radiogroup" aria-label="Sign in as" className="mt-10 flex gap-8 border-b hairline" {...rise(3)}>
            {(
              [
                ["owner", "East Meets Wed team"],
                ["vendor", "Vendor"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={role === value}
                onClick={() => setRole(value)}
                className={clsx("relative -mb-px pb-3 text-[0.875rem] transition-colors duration-300", role === value ? "text-ink" : "text-ink-mute hover:text-ink")}
              >
                {label}
                {role === value && <motion.span layoutId={`${id}-role`} className="absolute inset-x-0 bottom-0 h-px bg-ink" transition={{ duration: 0.5, ease: expo }} />}
              </button>
            ))}
          </motion.div>

          <form onSubmit={submit} className="mt-4">
            <AnimatePresence initial={false}>
              {role === "vendor" && (
                <motion.div
                  key="business"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ height: { duration: 0.55, ease: inOut }, opacity: { duration: 0.35, delay: 0.1 } }}
                  className="overflow-hidden"
                >
                  <div className="pt-5">
                    <label htmlFor={`${id}-vendor`} className="text-[0.75rem] text-ink-mute">
                      Business
                    </label>
                    <div className="relative flex items-center gap-3">
                      <span className="relative size-7 shrink-0 overflow-hidden rounded-full bg-paper-soft">
                        <AnimatePresence initial={false}>
                          <motion.span key={slug} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                            <Media src={vendor?.cover} alt="" brief="" quiet sizes="28px" className="size-full" />
                          </motion.span>
                        </AnimatePresence>
                      </span>
                      <select id={`${id}-vendor`} value={slug} onChange={(e) => setSlug(e.target.value)} className={clsx(field, "cursor-pointer appearance-none pr-8")}>
                        {listed.map((v) => (
                          <option key={v.slug} value={v.slug}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                      <Icon name="chevron-down" className="pointer-events-none absolute right-0 size-4 text-ink-mute" strokeWidth={1.25} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div className="pt-5" {...rise(4)}>
              <label htmlFor={`${id}-email`} className="text-[0.75rem] text-ink-mute">
                Email
              </label>
              <input
                id={`${id}-email`}
                key={role + slug}
                type="email"
                defaultValue={role === "owner" ? "hello@eastmeetswed.com" : (vendor?.contact?.email ?? "hello@example.com")}
                autoComplete="email"
                className={field}
              />
            </motion.div>
            <motion.div className="pt-5" {...rise(5)}>
              <div className="flex items-baseline justify-between">
                <label htmlFor={`${id}-password`} className="text-[0.75rem] text-ink-mute">
                  Password
                </label>
                <span className="text-[0.75rem] text-ink-mute">Any password works in the demo</span>
              </div>
              <input id={`${id}-password`} type="password" defaultValue="demo-password" autoComplete="current-password" className={field} />
            </motion.div>

            <motion.div {...rise(6)}>
              <button
                type="submit"
                className="group relative mt-10 flex h-14 w-full items-center justify-between overflow-hidden bg-ink px-6 text-paper transition-colors duration-300 hover:bg-ink/90"
              >
                <span className="t-nav">{leaving ? "Signing in" : "Sign in"}</span>
                <Icon name="arrow" className="size-5 transition-transform duration-500 ease-out-expo group-hover:translate-x-1" strokeWidth={1.25} />
                {/* A hairline runs along the foot of the button while the dashboard loads. */}
                <motion.span
                  className="absolute bottom-0 left-0 h-px w-full origin-left bg-paper/60"
                  initial={false}
                  animate={{ scaleX: leaving ? 1 : 0 }}
                  transition={{ duration: 0.7, ease: inOut }}
                />
              </button>
            </motion.div>
          </form>
        </div>

        <motion.p className="text-[0.75rem] text-ink-mute" {...rise(7)}>
          © 2026 East Meets Wed
        </motion.p>
      </div>
    </motion.div>
  );
}
