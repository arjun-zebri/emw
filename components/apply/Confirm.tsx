"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Monogram } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { confirmAccount } from "@/lib/apply/account";

/** Confirms the address from the email's link, then carries straight on to the application. */
export function Confirm() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const [state, setState] = useState<"working" | "ok" | "expired">("working");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    confirmAccount(token)
      .catch(() => ({ status: "expired" as const }))
      .then((r) => {
        setState(r.status);
        if (r.status === "ok") router.replace("/list-your-business/apply?confirmed=1");
      });
  }, [token, router]);

  return (
    <div className="flex min-h-svh flex-col bg-paper">
      <header className="shell flex h-[var(--header-h)] items-center">
        <Link href="/list-your-business" aria-label="East Meets Wed, list your business">
          <Monogram className="w-[4.5rem] transition-opacity hover:opacity-60" />
        </Link>
      </header>
      <main className="shell flex flex-1 items-center pb-[var(--header-h)]">
        <div className="max-w-[36rem]" aria-live="polite">
          <h1 className="t-display text-[clamp(2.75rem,5.4vw,5rem)] text-balance">{state === "expired" ? "This link has expired" : "Confirming your email"}</h1>
          <p className="t-body mt-6 max-w-[40ch]">
            {state === "expired"
              ? "Links work once, for 24 hours. Sign in with your email and password and we’ll send you a new one."
              : "One moment while we open your application."}
          </p>
          {state === "expired" && (
            <Button href="/list-your-business/apply" className="mt-10 min-w-[10rem]">
              Sign in
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
