import { redirect } from "next/navigation";

/** The admin opens on Approvals. */
export default function AdminHome() {
  redirect("/admin/approvals");
}
