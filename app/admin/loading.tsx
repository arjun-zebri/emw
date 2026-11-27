import { PageSkeleton } from "@/components/admin/PageSkeleton";

// Shows the moment a link in the sidebar is clicked, so the click lands at once even when the
// server takes a moment; the page then draws its own skeleton until its data arrives.
export default function Loading() {
  return <PageSkeleton />;
}
