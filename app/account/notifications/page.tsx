import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Notifications" };

/* Not linked yet (soon in the vendor nav): a vendor's alerts are about enquiries, which aren't built. */
export default function Page() {
  return <PageHeader title="Notifications" description="You'll choose how you hear about enquiries here once enquiries open." />;
}
