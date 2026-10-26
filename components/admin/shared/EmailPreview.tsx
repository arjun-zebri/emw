"use client";

import { Logo } from "@/components/brand/Logo";
import { enquiries as enquiryTotals, searches, traffic, uptime, vendorRanking, vendorTotals } from "@/lib/admin/analytics";
import { billingSummary, price, revenueByMonth, subscriptionFor, tiers } from "@/lib/admin/billing";
import { aud, day, month, num, signedPct } from "@/lib/admin/format";
import { applicants, couples, enquiries, publishedReviews, reviews } from "@/lib/admin/people";
import { getVendor } from "@/lib/vendors";

/*
 * What each alert looks like when it lands in an inbox. Short, plain and on-brand: the monogram,
 * one Boska heading, a few lines of Switzer and at most one button.
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

const lastSeven = (points: { value: number }[]) => {
  const now = points.slice(-7).reduce((s, p) => s + p.value, 0);
  const before = points.slice(-14, -7).reduce((s, p) => s + p.value, 0);
  return { now, delta: before ? now / before - 1 : 0 };
};

export function build(id: string, vendorSlug: string): Email {
  const vendor = getVendor(vendorSlug);
  const vendorName = vendor?.name ?? "your business";
  const vendorEmail = vendor?.contact?.email ?? "you@example.com";
  const firstName = (vendor?.person ?? vendor?.signoff ?? vendorName).split(" ")[0];
  const enquiry = enquiries.find((e) => e.vendor === vendorSlug) ?? enquiries[0];
  const couple = couples.find((c) => c.names === enquiry.couple) ?? couples[0];
  const billing = billingSummary();

  switch (id) {
    case "weekly-summary": {
      const visits = lastSeven(traffic("visits", "day"));
      const leads = lastSeven(enquiryTotals("day"));
      const newCouples = lastSeven(traffic("couples", "day"));
      const top = [...vendorRanking("day")].sort((a, b) => b.enquiries.value - a.enquiries.value)[0];
      const gap = searches("day").find((s) => s.results === 0);
      const revenue = revenueByMonth(1)[0];
      return {
        to: OWNER,
        subject: `Your week: ${num(visits.now)} visits, ${num(leads.now)} enquiries`,
        body: (
          <>
            <Heading>Your week</Heading>
            <P>The last seven days on East Meets Wed, compared with the week before.</P>
            <Figures
              rows={[
                ["Visits", num(visits.now), signedPct(visits.delta)],
                ["Enquiries sent to vendors", num(leads.now), signedPct(leads.delta)],
                ["Revenue collected in " + month(revenue.key, true).split(" ")[0], aud(revenue.total)],
                ["New vendors this month", num(billing.newThisMonth.length)],
                ["New couples", num(newCouples.now)],
              ]}
            />
            <P>
              {top.vendor.name} had the most enquiries over the last 30 days. {gap && <>Couples searched for “{gap.label}” {num(gap.value)} times in that time and found no one.</>}
            </P>
            <Button>Open the admin</Button>
          </>
        ),
      };
    }
    case "monthly-report": {
      const months = traffic("visits", "month");
      const leads = enquiryTotals("month");
      const [prevRev, lastRev] = revenueByMonth(3);
      const last = months.at(-2)!;
      const before = months.at(-3)!;
      const name = month(last.key, true).split(" ")[0];
      return {
        to: OWNER,
        subject: `${name} on East Meets Wed`,
        body: (
          <>
            <Heading>{name} in review</Heading>
            <P>A full month of figures, against {month(before.key, true).split(" ")[0]}.</P>
            <Figures
              rows={[
                ["Visits", num(last.value), signedPct(last.value / before.value - 1)],
                ["Enquiries", num(leads.at(-2)!.value), signedPct(leads.at(-2)!.value / leads.at(-3)!.value - 1)],
                ["Revenue", aud(lastRev.total), prevRev.total ? signedPct(lastRev.total / prevRev.total - 1) : undefined],
                ["Paying vendors", num(billing.paying)],
                ["Cancellations, last 90 days", num(billing.cancelled.length)],
              ]}
            />
            <Button>See the full report</Button>
          </>
        ),
      };
    }
    case "vendor-signup": {
      const a = applicants[0];
      return {
        to: OWNER,
        subject: `${a.name} wants to join the directory`,
        body: (
          <>
            <Heading>{a.name} applied to join</Heading>
            <P>{a.lede}</P>
            <Details
              rows={[
                ["Contact", a.person],
                ["Offers", a.discipline],
                ["Based in", a.based],
                ["Languages", a.languages.join(", ")],
                ["Answers", a.answers ? `Searches for “${a.answers}”, which find no one today` : undefined],
              ]}
            />
            <Button>Review the application</Button>
          </>
        ),
      };
    }
    case "submission": {
      const r = reviews[0];
      return {
        to: OWNER,
        subject: `New review for ${getVendor(r.vendor)?.name}`,
        body: (
          <>
            <Heading>A review is waiting</Heading>
            <P>
              {r.couple} reviewed {getVendor(r.vendor)?.name}, {r.rating} of 5. It goes live once you approve it.
            </P>
            <blockquote className="mt-6 border-l-2 border-ink/15 pl-4 text-[0.875rem] leading-relaxed text-ink">{r.text}</blockquote>
            <Button>Review it</Button>
          </>
        ),
      };
    }
    case "paid-change": {
      const s = billing.upgrades[0] ?? billing.newThisMonth[0];
      return {
        to: OWNER,
        subject: `${s.name} upgraded to ${tiers[s.tier].name}`,
        body: (
          <>
            <Heading>{s.name} upgraded</Heading>
            <P>
              They moved to {tiers[s.tier].name}, now {aud(price(s))} {s.billing === "annual" ? "a year" : "a month"}. The difference has been charged.
            </P>
            <Button>View the vendor</Button>
          </>
        ),
      };
    }
    case "payment-risk": {
      const s = billing.failed[0];
      return {
        to: OWNER,
        subject: `Payment failed: ${s.name}`,
        body: (
          <>
            <Heading>A payment didn&apos;t go through</Heading>
            <P>
              We couldn&apos;t charge {s.name} {aud(price(s))} for their {tiers[s.tier].name} listing. We&apos;ll try again in three days and have emailed them to update their card.
            </P>
            <Details
              rows={[
                ["Reason", s.failure?.reason],
                ["Attempts", String(s.failure?.attempts ?? 1)],
                ["Card", `${s.card.brand} ending ${s.card.last4}`],
              ]}
            />
            <Button>Resolve</Button>
          </>
        ),
      };
    }
    case "listing-expiring": {
      const s = billing.renewals.find((r) => !r.autoRenew) ?? billing.renewals[0];
      return {
        to: OWNER,
        subject: `${s.name}'s listing ends ${day(s.renews)}`,
        body: (
          <>
            <Heading>A listing is ending</Heading>
            <P>
              {s.name} has auto-renew turned off, so their listing comes down on {day(s.renews, { weekday: true })}. A personal note from you usually brings them back.
            </P>
            <Button>View the vendor</Button>
          </>
        ),
      };
    }
    case "site-health": {
      const i = uptime.incidents[0];
      return {
        to: OWNER,
        subject: "The site is running slow",
        body: (
          <>
            <Heading>The site is running slow</Heading>
            <P>{i.detail} We&apos;re checking every minute and will tell you when it recovers.</P>
            <Details
              rows={[
                ["Started", `${day(i.day, { weekday: true })} at ${i.at}`],
                ["Lasted", `${i.minutes} minutes`],
                ["Status", "Resolved"],
              ]}
            />
          </>
        ),
      };
    }
    case "vendor-enquiry":
      return {
        to: vendorEmail,
        subject: `New enquiry from ${enquiry.couple}`,
        body: (
          <>
            <Heading>{enquiry.couple} would like to hear from you</Heading>
            <P>{enquiry.message}</P>
            <Details
              rows={[
                ["Wedding date", day(enquiry.weddingDate, { weekday: true, year: true })],
                ["Guests", enquiry.guests],
                ["Traditions", enquiry.traditions],
                ["Email", enquiry.email],
                ["Phone", enquiry.phone],
              ]}
            />
            <Button>Reply</Button>
          </>
        ),
      };
    case "vendor-reply-reminder":
      return {
        to: vendorEmail,
        subject: `${enquiry.couple} are waiting to hear from you`,
        body: (
          <>
            <Heading>Still waiting on a reply</Heading>
            <P>
              Hi {firstName}, {enquiry.couple} enquired two days ago and haven&apos;t heard back. Couples usually book whoever replies first.
            </P>
            <Button>Reply now</Button>
          </>
        ),
      };
    case "vendor-review": {
      const r = publishedReviews.find((x) => x.vendor === vendorSlug) ?? reviews[0];
      return {
        to: vendorEmail,
        subject: `${r.couple} left you a review`,
        body: (
          <>
            <Heading>You have a new review</Heading>
            <P>
              {r.couple} gave you {r.rating} of 5. It&apos;s now on your listing.
            </P>
            <blockquote className="mt-6 border-l-2 border-ink/15 pl-4 text-[0.875rem] leading-relaxed text-ink">{r.text}</blockquote>
            <Button>See your listing</Button>
          </>
        ),
      };
    }
    case "vendor-renewal": {
      const s = subscriptionFor(vendorSlug);
      const t = vendorTotals(vendorSlug, "month");
      return {
        to: vendorEmail,
        subject: "Your listing renews soon",
        body: (
          <>
            <Heading>Your listing renews soon</Heading>
            <P>
              Hi {firstName}, your {s ? tiers[s.tier].name : ""} listing renews on {s ? day(s.renews, { weekday: true }) : "soon"}
              {s ? ` for ${aud(price(s))}` : ""}. Nothing to do if you&apos;d like to stay.
            </P>
            <Figures
              rows={[
                ["Profile views, last 12 months", num(t.views.value)],
                ["Enquiries, last 12 months", num(t.enquiries.value)],
              ]}
            />
            <Button>Manage your plan</Button>
          </>
        ),
      };
    }
    case "couple-confirmation":
      return {
        to: couple.email,
        subject: `Your enquiry to ${getVendor(enquiry.vendor)?.name}`,
        body: (
          <>
            <Heading>Your enquiry is on its way</Heading>
            <P>
              We&apos;ve sent your details to {getVendor(enquiry.vendor)?.name}. They&apos;ll reply to {couple.email}, usually within two days.
            </P>
            <Details
              rows={[
                ["Wedding date", day(enquiry.weddingDate, { year: true })],
                ["Guests", enquiry.guests],
                ["Message", enquiry.message],
              ]}
            />
          </>
        ),
      };
    case "couple-matches": {
      const v = getVendor("indelibleink-calligraphy") ?? getVendor(vendorSlug);
      return {
        to: couple.email,
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
