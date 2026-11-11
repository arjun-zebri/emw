"use client";

import { useEffect, useId, useState } from "react";
import { choosePassword } from "@/lib/account/access";
import { signOut, useSession } from "@/lib/admin/session";
import { toast } from "@/lib/admin/toast";
import { supabase } from "@/lib/supabase/browser";
import { Btn, PageHeader, Section } from "../ui";

const providerNames: Record<string, string> = { email: "Email and password", google: "Google", azure: "Microsoft" };

/**
 * The account itself, apart from the listing: the email you sign in with, the ways you can sign in,
 * and a new password. The listing's own email (where enquiries go) is set on Your listing.
 */
export function Account() {
  const session = useSession();
  const id = useId();
  const [methods, setMethods] = useState<string[] | null>(null);
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void supabase()
      .auth.getUser()
      .then(({ data }) => setMethods([...new Set((data.user?.identities ?? []).map((i) => i.provider))]));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(undefined);
    const r = await choosePassword({ password }).catch(() => ({ status: "error" as const }));
    setBusy(false);
    if (r.status === "ok") {
      setPassword("");
      toast("Password changed");
    } else setError(r.status === "invalid" ? r.message : r.status === "signed-out" ? "You’ve been signed out. Sign in again to change it." : "Something went wrong. Try again in a minute.");
  };

  return (
    <>
      <PageHeader title="Your account" />

      <Section title="Signing in" description="Your listing’s email, where enquiries go, can be a different address. You set that on Your listing.">
        <dl className="space-y-5 text-[0.9375rem]">
          <div>
            <dt className="t-small">Email</dt>
            <dd className="mt-1 text-ink">{session?.email || "…"}</dd>
            <dd className="t-small mt-1">To sign in with a different email, ask the East Meets Wed team.</dd>
          </div>
          <div>
            <dt className="t-small">Ways to sign in</dt>
            <dd className="mt-1 text-ink">{methods === null ? "…" : methods.map((m) => providerNames[m] ?? m).join(", ") || "Email and password"}</dd>
          </div>
        </dl>
      </Section>

      <Section title="Password" description="At least 8 characters.">
        <form onSubmit={save} className="max-w-[24rem]">
          <div className="flex items-baseline justify-between">
            <label htmlFor={`${id}-pw`} className="t-small">
              New password
            </label>
            <button type="button" onClick={() => setShown((s) => !s)} className="t-small transition-colors hover:text-ink">
              {shown ? "Hide" : "Show"}
            </button>
          </div>
          <input
            id={`${id}-pw`}
            type={shown ? "text" : "password"}
            minLength={8}
            maxLength={72}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="mt-1 w-full border-b border-ink/15 bg-transparent py-2.5 text-[0.9375rem] text-ink transition-colors hover:border-ink/35 focus:border-ink focus:outline-none"
          />
          {error && (
            <p role="alert" className="mt-3 text-[0.8125rem] text-bad">
              {error}
            </p>
          )}
          <Btn variant="primary" type="submit" className="mt-6" disabled={busy || password.length < 8}>
            {busy ? "Saving" : "Change password"}
          </Btn>
        </form>
      </Section>

      <Section title="Sign out" description="Signs you out on this device.">
        <Btn onClick={() => void signOut()} icon="logout">
          Sign out
        </Btn>
      </Section>
    </>
  );
}
