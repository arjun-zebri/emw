"use client";

import { Logo } from "@/components/brand/Logo";
import { getVendor } from "@/lib/vendors";

/*
 * What each alert looks like when it lands in an inbox. Short, plain and on-brand: the monogram,
 * one Boska heading, a few lines of body type and at most one button. Anything that changes from
 * one email to the next (a couple's names, a date, a figure) shows as a grey field, never an
 * invented example; vendor emails use the real vendor.
 */

const OWNER = "hello@eastmeetswed.com";
export const FROM = "East Meets Wed <hello@eastmeetswed.com>";

export type Email = { to: string; subject: string; body: React.ReactNode };

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-[1.75rem] leading-[1.1] tracking-[-0.02em] text-ink">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-[0.875rem] leading-relaxed text-ink-soft">{children}</p>;
}

function Button({ children }: { children: React.ReactNode }) {
  return <span className="t-nav mt-7 inline-flex h-11 items-center bg-ink px-6 text-paper">{children}</span>;
}

function Figures({ rows }: { rows: [string, string, string?][] }) {
  return (
    <dl className="mt-6 border-t hairline">
      {rows.map(([label, value, note]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 border-b border-ink/[0.07] py-3 text-[0.875rem]">
          <dt className="text-ink-soft">{label}</dt>
          <dd className="text-right">
            <span className="font-medium text-ink tabular-nums">{value}</span>
            {note && <span className="ml-2 text-[0.75rem] text-ink-mute">{note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Details({ rows }: { rows: [string, string | undefined][] }) {
  return (
    <dl className="mt-6 space-y-2 bg-paper px-5 py-4 text-[0.8125rem]">
      {rows
        .filter(([, v]) => v)
        .map(([label, value]) => (
          <div key={label} className="flex gap-4">
            <dt className="w-28 shrink-0 text-ink-mute">{label}</dt>
            <dd className="text-ink">{value}</dd>
          </div>
        ))}
    </dl>
  );
}

/** A part of the email that's filled in when it's sent. */
function F({ children }: { children: React.ReactNode }) {
  return <span className="bg-ink/[0.06] px-1 text-ink">{children}</span>;
}

// The same fields in plain text, for subject lines.
const f = (label: string) => `[${label}]`;

export function build(id: string, vendorSlug: string): Email {
  const vendor = getVendor(vendorSlug);
  const vendorName = vendor?.name ?? "your business";
  const vendorEmail = vendor?.contact?.email ?? f("vendor's email");
  const firstName = (vendor?.person ?? vendor?.signoff ?? vendorName).split(" ")[0];
  const couple = <F>Couple&apos;s names</F>;

  switch (id) {
    case "weekly-summary":
      return {
        to: OWNER,
        subject: `Your week: ${f("visits")} visits, ${f("enquiries")} enquiries`,
        body: (
          <>
            <Heading>Your week</Heading>
            <P>The last seven days on East Meets Wed, compared with the week before.</P>
            <Figures
              rows={[
                ["Visits", f("number"), f("change")],
                ["Enquiries sent to vendors", f("number"), f("change")],
                ["Revenue collected this month", f("amount")],
                ["New vendors this month", f("number")],
                ["New couples", f("number")],
              ]}
            />
            <P>
              <F>Vendor</F> had the most enquiries over the last 30 days. Couples searched for <F>search</F> and found no one.
            </P>
            <Button>Open the admin</Button>
          </>
        ),
      };
    case "monthly-report":
      return {
        to: OWNER,
        subject: `${f("Month")} on East Meets Wed`,
        body: (
          <>
            <Heading>
              <F>Month</F> in review
            </Heading>
            <P>A full month of figures, against the month before.</P>
            <Figures
              rows={[
                ["Visits", f("number"), f("change")],
                ["Enquiries", f("number"), f("change")],
                ["Revenue", f("amount"), f("change")],
                ["Paying vendors", f("number")],
                ["Cancellations, last 90 days", f("number")],
              ]}
            />
            <Button>See the full report</Button>
          </>
        ),
      };
    case "vendor-signup":
      return {
        to: OWNER,
        subject: `${f("Business name")} wants to join the directory`,
        body: (
          <>
            <Heading>
              <F>Business name</F> applied to join
            </Heading>
            <P>
              <F>Their introduction</F>
            </P>
            <Details
              rows={[
                ["Contact", f("name")],
                ["Offers", f("category")],
                ["Based in", f("suburb")],
                ["Languages", f("languages")],
              ]}
            />
            <Button>Review the application</Button>
          </>
        ),
      };
    case "submission":
      return {
        to: OWNER,
        subject: `New review for ${f("vendor")}`,
        body: (
          <>
            <Heading>A review is waiting</Heading>
            <P>
              {couple} reviewed <F>vendor</F>, <F>rating</F> of 5. It goes live once you approve it.
            </P>
            <blockquote className="mt-6 border-l-2 border-ink/15 pl-4 text-[0.875rem] leading-relaxed text-ink">
              <F>Their review</F>
            </blockquote>
            <Button>Review it</Button>
          </>
        ),
      };
    case "paid-change":
      return {
        to: OWNER,
        subject: `${f("Vendor")} upgraded to ${f("plan")}`,
        body: (
          <>
            <Heading>
              <F>Vendor</F> upgraded
            </Heading>
            <P>
              They moved to <F>plan</F>, now <F>price</F>. The difference has been charged.
            </P>
            <Button>View the vendor</Button>
          </>
        ),
      };
    case "payment-risk":
      return {
        to: OWNER,
        subject: `Payment failed: ${f("vendor")}`,
        body: (
          <>
            <Heading>A payment didn&apos;t go through</Heading>
            <P>
              We couldn&apos;t charge <F>vendor</F> <F>amount</F> for their <F>plan</F> listing. We&apos;ll try again in three days and have emailed them to update their card.
            </P>
            <Details
              rows={[
                ["Reason", f("from Stripe")],
                ["Attempts", f("number")],
                ["Card", f("card")],
              ]}
            />
            <Button>Resolve</Button>
          </>
        ),
      };
    case "listing-expiring":
      return {
        to: OWNER,
        subject: `${f("Vendor")}'s listing ends ${f("date")}`,
        body: (
          <>
            <Heading>A listing is ending</Heading>
            <P>
              <F>Vendor</F> has auto-renew turned off, so their listing comes down on <F>date</F>. A personal note from you usually brings them back.
            </P>
            <Button>View the vendor</Button>
          </>
        ),
      };
    case "site-health":
      return {
        to: OWNER,
        subject: "The site is running slow",
        body: (
          <>
            <Heading>The site is running slow</Heading>
            <P>
              <F>What the check found</F> We&apos;re checking every minute and will tell you when it recovers.
            </P>
            <Details
              rows={[
                ["Started", f("date and time")],
                ["Lasted", f("minutes")],
                ["Status", f("status")],
              ]}
            />
          </>
        ),
      };
    case "vendor-enquiry":
      return {
        to: vendorEmail,
        subject: `New enquiry from ${f("couple's names")}`,
        body: (
          <>
            <Heading>{couple} would like to hear from you</Heading>
            <P>
              <F>Their message</F>
            </P>
            <Details
              rows={[
                ["Wedding date", f("date")],
                ["Email", f("email")],
                ["Phone", f("phone")],
              ]}
            />
            <Button>Reply</Button>
          </>
        ),
      };
    case "vendor-reply-reminder":
      return {
        to: vendorEmail,
        subject: `${f("Couple's names")} are waiting to hear from you`,
        body: (
          <>
            <Heading>Still waiting on a reply</Heading>
            <P>
              Hi {firstName}, {couple} enquired two days ago and haven&apos;t heard back. Couples usually book whoever replies first.
            </P>
            <Button>Reply now</Button>
          </>
        ),
      };
    case "vendor-review":
      return {
        to: vendorEmail,
        subject: `${f("Couple's names")} left you a review`,
        body: (
          <>
            <Heading>You have a new review</Heading>
            <P>
              {couple} gave you <F>rating</F> of 5. It&apos;s now on your listing.
            </P>
            <blockquote className="mt-6 border-l-2 border-ink/15 pl-4 text-[0.875rem] leading-relaxed text-ink">
              <F>Their review</F>
            </blockquote>
            <Button>See your listing</Button>
          </>
        ),
      };
    case "vendor-renewal":
      return {
        to: vendorEmail,
        subject: "Your listing renews soon",
        body: (
          <>
            <Heading>Your listing renews soon</Heading>
            <P>
              Hi {firstName}, your <F>plan</F> listing renews on <F>date</F> for <F>price</F>. Nothing to do if you&apos;d like to stay.
            </P>
            <Figures
              rows={[
                ["Profile views, last 12 months", f("number")],
                ["Enquiries, last 12 months", f("number")],
              ]}
            />
            <Button>Manage your plan</Button>
          </>
        ),
      };
    case "couple-confirmation":
      return {
        to: f("couple's email"),
        subject: `Your enquiry to ${vendorName}`,
        body: (
          <>
            <Heading>Your enquiry is on its way</Heading>
            <P>
              We&apos;ve sent your details to {vendorName}. They&apos;ll reply to <F>your email</F>, usually within two days.
            </P>
            <Details
              rows={[
                ["Wedding date", f("date")],
                ["Message", f("their message")],
              ]}
            />
          </>
        ),
      };
    case "couple-matches": {
      const v = getVendor("indelibleink-calligraphy") ?? vendor;
      return {
        to: f("couple's email"),
        subject: "New vendors for your wedding",
        body: (
          <>
            <Heading>New to the directory this week</Heading>
            <P>A new listing matches what you&apos;ve saved.</P>
            {v && (
              <div className="mt-6 flex gap-4 bg-paper p-4">
                {v.cover && (
                  // eslint-disable-next-line @next/next/no-img-element -- email preview mimics an email client
                  <img src={v.cover} alt="" className="size-20 object-cover" />
                )}
                <div>
                  <p className="font-display text-[1.25rem] leading-tight">{v.name}</p>
                  <p className="mt-1 text-[0.8125rem] text-ink-mute">{v.discipline}</p>
                </div>
              </div>
            )}
            <Button>See vendors</Button>
          </>
        ),
      };
    }
    default:
      return { to: OWNER, subject: "", body: null };
  }
}

/** An email as it would arrive: the envelope, then the message on white. */
export function EmailPreview({ id, vendorSlug = "katrina-lai" }: { id: string; vendorSlug?: string }) {
  const email = build(id, vendorSlug);
  return (
    <div className="p-6">
      <dl className="space-y-1.5 text-[0.8125rem]">
        {[
          ["From", FROM],
          ["To", email.to],
          ["Subject", email.subject],
        ].map(([k, v]) => (
          <div key={k} className="flex gap-3">
            <dt className="w-16 shrink-0 text-ink-mute">{k}</dt>
            <dd className={k === "Subject" ? "font-medium text-ink" : "text-ink-soft"}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 border border-ink/[0.09] bg-surface">
        <div className="px-8 pt-10 pb-10 sm:px-12">
          <Logo title="East Meets Wed" className="mb-10 w-20 text-ink" />
          {email.body}
        </div>
        <p className="border-t hairline px-8 py-5 text-[0.6875rem] leading-relaxed text-ink-mute sm:px-12">
          East Meets Wed · Melbourne, Australia · You&apos;re receiving this because of your notification settings.
        </p>
      </div>
    </div>
  );
}
