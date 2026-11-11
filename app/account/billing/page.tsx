import { redirect } from "next/navigation";

/* Not built yet, so greyed in the menu: Your listing is a vendor's home until it is. Plan & billing (components/admin/vendor/Billing.tsx) opens with Stripe. */
export default function Page() {
  redirect("/account/listing");
}
