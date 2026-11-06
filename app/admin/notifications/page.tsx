import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Notifications } from "@/components/admin/owner/Notifications";
import { PageHeader } from "@/components/admin/ui";
import { loadNotifications } from "@/lib/admin/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return (
    <>
      <PageHeader title="Notifications" description="Every email East Meets Wed sends, as it arrives. One setting for the whole team." />
      <Suspense fallback={<div className="h-[40rem] border border-ink/[0.09] bg-surface" />}>
        <Emails />
      </Suspense>
    </>
  );
}

async function Emails() {
  // Per request: the previews and switches are read live, as the signed-in team member.
  await connection();
  const data = await loadNotifications();
  if (!data) return null;
  return <Notifications data={data} />;
}
