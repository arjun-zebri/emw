import { redirect } from "next/navigation";

/* Not built yet, so greyed in the menu: Your listing is a vendor's home until it is. Enquiries (components/admin/vendor/Enquiries.tsx) opens with EMW-23, when couples can send them. */
export default function Page() {
  redirect("/account/listing");
}
