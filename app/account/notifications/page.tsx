import { redirect } from "next/navigation";

/* Notifications lives in Settings, and opens there once it's built. */
export default function Page() {
  redirect("/account/settings");
}
