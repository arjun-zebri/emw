import { redirect } from "next/navigation";

/* Plan & billing lives in Settings, and opens there once it's built. */
export default function Page() {
  redirect("/account/settings");
}
