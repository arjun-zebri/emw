"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useId, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { type AccountResult, createAccount, signInToApply, signOutOfApply } from "@/lib/apply/account";
import { supabase } from "@/lib/supabase/browser";

/*
 * The first screen's account: Google, Microsoft, or an email and password (confirmed by a link we
 * email). The application is saved to the account's browser as it goes; the server only takes an
 * application from a confirmed account.
 */

export type Account = { email: string; confirmed: boolean } | null;

/** Who's signed in, kept current. `undefined` while it's being checked. */
export function useAccount() {
  const [account, setAccount] = useState<Account | undefined>(undefined);
  const refresh = useCallback(async () => {
    const { data } = await supabase().auth.getUser();
    const u = data.user;
    setAccount(u ? { email: u.email ?? "", confirmed: !!u.email_confirmed_at } : null);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the session once it's in the browser
    refresh();
    const { data } = supabase().auth.onAuthStateChange(() => void refresh());
    return () => data.subscription.unsubscribe();
  }, [refresh]);
  return { account, refresh };
}

type Mode = "create" | "signin";

const fieldClass =
  "h-12 w-full border hairline bg-surface px-4 text-[1rem] text-ink transition-colors placeholder:text-ink-mute/60 focus:border-ink focus:outline-none [--autofill:var(--color-surface)]";

export function AccountPanel({ account, onChange }: { account: Account | undefined; onChange: () => Promise<void> }) {
  const uid = useId();
  const [mode, setMode] = useState<Mode>("create");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<"email" | "google" | "azure" | null>(null);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [resent, setResent] = useState(false);

  // Back from Google or Microsoft without a session.
  useEffect(() => {
    if (new URLSearchParams(location.search).get("signin") === "failed") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the address once, after hydration
      setError("We couldn’t sign you in with that account. Try again, or use your email.");
      history.replaceState(null, "", location.pathname);
    }
  }, []);

  async function oauth(provider: "google" | "azure") {
    setBusy(provider);
    setError("");
    const { error } = await supabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback?next=/list-your-business/apply`, scopes: provider === "azure" ? "email" : undefined },
    });
    if (error) {
      setBusy(null);
      setError("That sign-in isn’t available right now. Use your email instead.");
    }
  }

  async function submit(again = false) {
    if (busy) return;
    setBusy("email");
    setError("");
    const run = mode === "create" && !again ? createAccount : signInToApply;
    const res: AccountResult = await run({ email, password }).catch(() => ({ status: "error" as const }));
    setBusy(null);
    if (res.status === "sent") {
      setSent(true);
      setResent(again);
      return;
    }
    if (res.status === "signed-in") {
      setPassword("");
      return onChange();
    }
    setError(
      res.status === "invalid"
        ? res.message
        : res.status === "exists"
          ? "You already have an account with this email. Check your password, or sign in with Google or Microsoft if that’s how you made it."
          : res.status === "wrong"
            ? "That email and password don’t match."
            : "Something went wrong on our side. Please try again in a minute.",
    );
    if (res.status === "exists") setMode("signin");
  }

  if (account === undefined) return <div className="h-[22rem]" aria-hidden />;

  if (account?.confirmed) {
    return (
      <p className="t-small flex flex-wrap items-center gap-x-2 gap-y-1">
        <Icon name="check" className="size-4 text-ink" />
        <span>
          Signed in as <span className="text-ink">{account.email}</span>
        </span>
        <button
          type="button"
          className="link-line ml-2 text-ink"
          onClick={async () => {
            await signOutOfApply();
            await supabase().auth.signOut({ scope: "local" });
            await onChange();
          }}
        >
          Sign out
        </button>
      </p>
    );
  }

  if (sent) {
    return (
      <div className="max-w-[26rem] border hairline bg-surface p-6 sm:p-7" aria-live="polite">
        <h2 className="t-title flex items-center gap-3 text-[1.5rem]">
          <Icon name="mail" className="size-5 shrink-0 text-ink" />
          Check your inbox
        </h2>
        <p className="t-body mt-3">
          {resent ? "We’ve sent a new link to" : "We’ve sent a link to"} <span className="text-ink">{email}</span>. Open it and your application starts straight away.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
          <button type="button" className="t-nav link-line" disabled={!!busy} onClick={() => submit(true)}>
            {busy ? "Sending" : "Send it again"}
          </button>
          <button
            type="button"
            className="t-nav link-line text-ink-soft"
            onClick={() => {
              setSent(false);
              setPassword("");
            }}
          >
            Use a different email
          </button>
        </div>
        {error && <p className="t-small mt-4 text-bad">{error}</p>}
      </div>
    );
  }

  const enter = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    // The panel sits inside the step form: Enter signs in here rather than moving the flow on.
    e.preventDefault();
    e.stopPropagation();
    submit();
  };

  return (
    <div className="max-w-[26rem]">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ProviderButton label="Continue with Google" busy={busy === "google"} disabled={!!busy} onClick={() => oauth("google")} logo={<GoogleLogo />} />
        <ProviderButton label="Continue with Microsoft" busy={busy === "azure"} disabled={!!busy} onClick={() => oauth("azure")} logo={<MicrosoftLogo />} />
      </div>

      <div className="t-small my-6 flex items-center gap-4" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        or with your email
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="space-y-2">
        <label htmlFor={`${uid}-email`} className="sr-only">
          Email
        </label>
        <input
          id={`${uid}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={enter}
          className={fieldClass}
        />
        <div className="relative">
          <label htmlFor={`${uid}-password`} className="sr-only">
            Password
          </label>
          <input
            id={`${uid}-password`}
            type={show ? "text" : "password"}
            autoComplete={mode === "create" ? "new-password" : "current-password"}
            placeholder={mode === "create" ? "Choose a password" : "Password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={enter}
            className={clsx(fieldClass, "pr-20")}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="t-small absolute inset-y-0 right-0 px-4 text-ink-soft transition-colors hover:text-ink"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="t-small overflow-hidden pt-3 text-bad"
            role="alert"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <Button type="button" onClick={() => submit()} disabled={!!busy} className="mt-5 w-full">
        {busy === "email" ? (mode === "create" ? "Creating your account" : "Signing in") : mode === "create" ? "Create account" : "Sign in"}
      </Button>

      <p className="t-small mt-4">
        {mode === "create" ? "Already have an account?" : "New to East Meets Wed?"}{" "}
        <button
          type="button"
          className="link-line text-ink"
          onClick={() => {
            setMode(mode === "create" ? "signin" : "create");
            setError("");
          }}
        >
          {mode === "create" ? "Sign in" : "Create an account"}
        </button>
      </p>
    </div>
  );
}

function ProviderButton({ label, logo, busy, disabled, onClick }: { label: string; logo: React.ReactNode; busy: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 items-center justify-center gap-3 border hairline bg-surface px-4 text-[0.9375rem] text-ink transition-colors hover:border-ink disabled:opacity-60"
    >
      {logo}
      {busy ? "Opening" : label.replace("Continue with ", "")}
      <span className="sr-only">{busy ? "" : `, ${label.toLowerCase()}`}</span>
    </button>
  );
}

// The providers' own marks, as their sign-in guidelines ask.
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-[18px]" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 21 21" className="size-[16px]" aria-hidden>
      <path fill="#F25022" d="M1 1h9v9H1z" />
      <path fill="#7FBA00" d="M11 1h9v9h-9z" />
      <path fill="#00A4EF" d="M1 11h9v9H1z" />
      <path fill="#FFB900" d="M11 11h9v9h-9z" />
    </svg>
  );
}
