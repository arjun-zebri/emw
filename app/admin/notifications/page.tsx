import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Notifications } from "@/components/admin/owner/Notifications";
import { PageHeader } from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/Skeleton";
import { loadNotifications } from "@/lib/admin/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return (
    <>
      <PageHeader title="Notifications" description="Every email East Meets Wed sends, as it arrives. One setting for the whole team." />
      <Suspense fallback={<EmailsSkeleton />}>
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

/** The mail-client layout while the previews render: the list of emails, and the open one beside it. */
function EmailsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]" aria-busy="true">
      <div className="space-y-6 self-start">
        {[2, 3].map((n, g) => (
          <div key={g}>
            <Skeleton className="mb-3 h-3 w-24" />
            <ul className="border border-ink/[0.09] bg-surface">
              {Array.from({ length: n }, (_, i) => (
                <li key={i} className="flex items-center gap-4 border-b border-ink/[0.06] px-5 py-4 last:border-b-0">
                  <Skeleton className="size-9 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="mt-2 h-3 w-4/5" />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border border-ink/[0.09] bg-surface p-6 sm:p-10">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="mt-8 h-[22rem] w-full" />
        <Skeleton className="mt-6 h-4 w-3/5" />
      </div>
    </div>
  );
}
