"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Monogram } from "@/components/brand/Logo";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { choosePassword, openPasswordLink } from "@/lib/account/access";

const field =
  "w-full border-b border-ink/15 bg-transparent py-3 text-[0.9375rem] text-ink transition-colors duration-300 placeholder:text-ink-mute/50 hover:border-ink/35 focus:border-ink focus:outline-none";

/** From the email: the link signs them in, they choose a password, and they go straight to their listing. */
export function ChoosePassword() {
  const token = useSearchParams().get("token") ?? "";
  const id = useId();
  const [state, setState] = useState<"opening" | "ready" | "expired">("opening");
  const [email, setEmail] = useState<string>();
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    openPasswordLink(token)
      .catch(() => ({ status: "expired" as const, email: undefined }))
      .then((r) => {
        setEmail(r.email);
        setState(r.status === "ok" ? "ready" : "expired");
      });
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(undefined);
    const r = await choosePassword({ password }).catch(() => ({ status: "error" as const }));
    if (r.status === "ok") {
      // A full load, so the portal starts with the new session.
      location.assign(r.next);
      return;
    }
    setBusy(false);
    setError(r.status === "invalid" ? r.message : r.status === "signed-out" ? "This link has run out. Ask for a new one from the sign-in page." : "Something went wrong. Try again in a minute.");
  };

  return (
    <div className="flex min-h-svh flex-col bg-paper">
      <header className="shell flex h-[var(--header-h)] items-center">
        <Link href="/" aria-label="East Meets Wed, home">
          <Monogram className="w-[4.5rem] transition-opacity hover:opacity-60" />
        </Link>
      </header>
      <main className="shell flex flex-1 items-center pb-[var(--header-h)]">
        <div className="w-full max-w-[25rem]" aria-live="polite">
          <h1 className="t-display text-[clamp(2.75rem,4.4vw,3.75rem)] text-balance">{state === "expired" ? "This link has run out" : "Choose your password"}</h1>
          {state === "expired" ? (
            <>
              <p className="t-body mt-5">Links work once, for an hour. Ask for a new one and it will arrive in a minute or two.</p>
              <Button href="/login?password=1" className="mt-10 min-w-[12rem]">
                Get a new link
              </Button>
            </>
          ) : (
            <form onSubmit={submit} className="mt-5">
              <p className="t-body">{email ? <>For {email}. </> : null}At least 8 characters. You&rsquo;ll use it with this email to sign in.</p>
              <div className="mt-10">
                <div className="flex items-baseline justify-between">
                  <label htmlFor={`${id}-pw`} className="text-[0.75rem] text-ink-mute">
                    New password
                  </label>
                  <button type="button" onClick={() => setShown((s) => !s)} className="text-[0.75rem] text-ink-mute transition-colors hover:text-ink">
                    {shown ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  id={`${id}-pw`}
                  type={shown ? "text" : "password"}
                  required
                  minLength={8}
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={state !== "ready"}
                  className={field}
                />
              </div>
              {error && (
                <p role="alert" className="mt-4 text-[0.8125rem] text-bad">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy || state !== "ready"}
                className="group mt-10 flex h-14 w-full items-center justify-between bg-ink px-6 text-paper transition-colors duration-300 hover:bg-ink/90 disabled:opacity-60"
              >
                <span className="t-nav">{state === "opening" ? "Opening your link" : busy ? "Saving" : "Save and sign in"}</span>
                <Icon name="arrow" className="size-5 transition-transform duration-500 ease-out-expo group-hover:translate-x-1" strokeWidth={1.25} />
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
