/*
 * Every alert the platform sends, as quoted. The admin's Notifications page lists these with their
 * channels; settings are saved in the demo store. In the full build each maps to a queued job
 * (Resend for email, Twilio for SMS).
 */

export type Channel = "email" | "sms" | "app";
export type Audience = "owner" | "vendor" | "couple";

export type AlertDef = {
  id: string;
  audience: Audience;
  title: string;
  when: string;
  channels: Channel[];
  defaults: Channel[];
};

export const alertDefs: AlertDef[] = [
  { id: "vendor-signup", audience: "owner", title: "New vendor waiting for approval", when: "As soon as a business applies", channels: ["email", "app"], defaults: ["email", "app"] },
  { id: "submission", audience: "owner", title: "Real Wedding or review waiting for approval", when: "When a couple submits one", channels: ["email", "app"], defaults: ["app"] },
  { id: "paid-change", audience: "owner", title: "New paid signup, upgrade or cancellation", when: "When a plan starts, changes or ends", channels: ["email", "app"], defaults: ["email", "app"] },
  { id: "payment-risk", audience: "owner", title: "Failed payment or card about to expire", when: "On a failed charge, and 30 days before a card expires", channels: ["email", "sms", "app"], defaults: ["email", "sms", "app"] },
  { id: "listing-expiring", audience: "owner", title: "Listing expiring in the next 30 days", when: "30 days and 7 days before", channels: ["email", "app"], defaults: ["app"] },
  { id: "site-health", audience: "owner", title: "Site down or running slow", when: "Within a minute of the check failing", channels: ["email", "sms", "app"], defaults: ["email", "sms", "app"] },
  { id: "weekly-summary", audience: "owner", title: "Weekly summary", when: "Mondays at 8am: visits, enquiries, revenue, new vendors", channels: ["email"], defaults: ["email"] },
  { id: "monthly-report", audience: "owner", title: "Monthly report", when: "The 1st of each month", channels: ["email"], defaults: ["email"] },

  { id: "vendor-enquiry", audience: "vendor", title: "New enquiry", when: "Instantly", channels: ["email", "sms"], defaults: ["email"] },
  { id: "vendor-reply-reminder", audience: "vendor", title: "Enquiry not replied to", when: "48 hours after an enquiry arrives", channels: ["email", "sms"], defaults: ["email"] },
  { id: "vendor-review", audience: "vendor", title: "New review", when: "When a review is approved", channels: ["email"], defaults: ["email"] },
  { id: "vendor-renewal", audience: "vendor", title: "Listing renewal reminder", when: "30 days and 7 days before renewal", channels: ["email"], defaults: ["email"] },

  { id: "couple-confirmation", audience: "couple", title: "Enquiry confirmation", when: "When they send an enquiry", channels: ["email"], defaults: ["email"] },
  { id: "couple-matches", audience: "couple", title: "New vendors matching what they saved", when: "Weekly, when there's a match", channels: ["email"], defaults: ["email"] },
];

export const audiences: Record<Audience, { title: string; blurb: string }> = {
  owner: { title: "To you", blurb: "Sent to the East Meets Wed team." },
  vendor: { title: "To vendors", blurb: "Vendors can turn these off in their own settings." },
  couple: { title: "To couples", blurb: "Plain, short, and never more than one a week unless they've enquired." },
};

export const channelLabels: Record<Channel, string> = { email: "Email", sms: "SMS", app: "In the portal" };
