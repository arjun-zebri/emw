import { SITE } from "@/lib/config";

/*
 * Which emails go out, and from where. Each switch is checked by its send function, so an email
 * that's off is fully built and simply not sent.
 */
export const EMAILS = {
  /** To the team and the applicant when someone applies. */
  application: true,
  /** "Confirm your email", when someone makes an account to apply. */
  confirm: true,
  /** "Your listing is live", when the team approves. Off until the client signs off its copy. */
  approved: false,
};

export const emailFrom = () => process.env.EMAIL_FROM || "East Meets Wed <hello@eastmeetswed.com>";
export const emailAdmin = () => process.env.EMAIL_ADMIN || "admin@eastmeetswed.com";

/** Where links and images in an email point: the site that sent it. */
export function emailOrigin() {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.NODE_ENV === "development" ? "http://localhost:3000" : SITE.url);
  return url.replace(/\/$/, "");
}
