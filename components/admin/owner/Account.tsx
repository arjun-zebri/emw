"use client";

import { signOut } from "@/lib/admin/session";
import { AccountSettings } from "../AccountSettings";
import { Btn, PageHeader, Section } from "../ui";

/** Admin → Account: your own sign-in, a new password, and signing out. */
export function Account() {
  return (
    <>
      <PageHeader title="Account" />
      <AccountSettings />
      <Section title="Sign out" description="Signs you out on this device.">
        <Btn onClick={() => void signOut()} icon="logout">
          Sign out
        </Btn>
      </Section>
    </>
  );
}
