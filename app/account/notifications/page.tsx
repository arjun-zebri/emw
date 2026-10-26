import type { Metadata } from "next";
import { VendorNotifications } from "@/components/admin/vendor/Notifications";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return <VendorNotifications />;
}
