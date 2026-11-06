import type { Metadata } from "next";
import { ApplyFlow, type FlowPhotos } from "@/components/apply/ApplyFlow";

export const metadata: Metadata = {
  title: "Apply to list your business",
  robots: { index: false },
};

// Vendors at work and the things they make, from their own listings.
const images: FlowPhotos = {
  welcome: "/images/vendors/kindred-visuals/01.jpg",
  about: "/images/vendors/invictus-quartet/01.jpg",
  show: "/images/vendors/dillon-reyn-live-event-illustration/00.jpg",
  finish: "/images/vendors/at-last-film-and-photography/03.jpg",
};

/** The application itself: full screen, outside the site's header and footer, one question at a time. */
export default function ApplyPage() {
  return <ApplyFlow images={images} />;
}
