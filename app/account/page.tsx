import { redirect } from "next/navigation";

/* Not built yet, so greyed in the menu: Your listing is a vendor's home until it is. The dashboard (components/admin/vendor/Dashboard.tsx) opens once there are numbers and enquiries to show. */
export default function Page() {
  redirect("/account/listing");
}
