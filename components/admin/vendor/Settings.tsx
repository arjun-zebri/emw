"use client";

import { signOut } from "@/lib/admin/session";
import { AccountSettings } from "../AccountSettings";
import { Btn, PageHeader, Section } from "../ui";

/**
 * Settings, from the account menu: the account itself (the email you sign in with, the ways in, a
 * new password), then plan and billing and notifications, which open here once they're built. The
 * listing's own email, where enquiries go, is set on Your listing.
 */
export function Settings() {
  return (
    <>
      <PageHeader title="Settings" />

      <AccountSettings vendor />

      <Section title="Plan & billing" description="Coming soon.">
        <p className="max-w-[44ch] text-[0.9375rem] text-ink-soft">You&rsquo;ll see your plan, change it and manage payments here.</p>
      </Section>

      <Section title="Notifications" description="Coming soon.">
        <p className="max-w-[44ch] text-[0.9375rem] text-ink-soft">You&rsquo;ll choose how you hear about new enquiries here, once couples can send them.</p>
      </Section>

      <Section title="Sign out" description="Signs you out on this device.">
        <Btn onClick={() => void signOut()} icon="logout">
          Sign out
        </Btn>
      </Section>
    </>
  );
}
