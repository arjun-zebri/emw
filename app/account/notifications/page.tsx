import { redirect } from "next/navigation";

/* Not built yet, so greyed in the menu: Your listing is a vendor's home until it is. Notifications open with enquiries. */
export default function Page() {
  redirect("/account/listing");
}
