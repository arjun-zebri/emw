import { vendors } from "@/lib/vendors";
import { hash, rng } from "./random";
import { TODAY, addMonths, daysFromToday, daysUntil, lastMonths, monthKey } from "./time";

/*
 * Simulated listing subscriptions. The tiers and prices are placeholders for the demo, set in one
 * place so the real ones can drop in. Stripe would be the source of truth in the full build.
 */

export type TierId = "essential" | "signature" | "premier";

export const tiers: Record<TierId, { name: string; monthly: number; annual: number; perks: string[] }> = {
  essential: { name: "Essential", monthly: 39, annual: 390, perks: ["Listing with up to 6 photos", "Enquiries by email", "Monthly stats"] },
  signature: { name: "Signature", monthly: 69, annual: 690, perks: ["Up to 20 photos", "Enquiries by email and SMS", "Live stats", "Journal mentions"] },
  premier: { name: "Premier", monthly: 119, annual: 1190, perks: ["Everything in Signature", "Featured on the home page", "Top of category results", "A Real Wedding story each year"] },
};

export const tierOrder: TierId[] = ["essential", "signature", "premier"];

export type SubStatus = "active" | "past_due" | "cancelling" | "cancelled";

export type Subscription = {
  id: string;
  /** A listed vendor's slug, or a business that has since left. */
  slug: string;
  name: string;
  tier: TierId;
  billing: "monthly" | "annual";
  started: string;
  /** Next charge, or for annual plans the renewal. */
  renews: string;
  autoRenew: boolean;
  status: SubStatus;
  card: { brand: "Visa" | "Mastercard" | "Amex"; last4: string; expires: string };
  failure?: { at: string; reason: string; attempts: number };
  cancelled?: { at: string; reason: string };
  upgradedFrom?: { tier: TierId; at: string };
};

// A few businesses that have left the directory, so the churn figures have a history.
const departed = [
  { slug: "former-lumiere-bridal", name: "Lumière Bridal Studio", tier: "essential" as const, cancelled: daysFromToday(-9), reason: "Closing the business" },
  { slug: "former-bloom-and-co", name: "Bloom & Co Events", tier: "signature" as const, cancelled: daysFromToday(-41), reason: "Not enough enquiries" },
  { slug: "former-harbour-strings", name: "Harbour Strings", tier: "essential" as const, cancelled: daysFromToday(-96), reason: "Moved interstate" },
  { slug: "former-saigon-lens", name: "Saigon Lens Co", tier: "signature" as const, cancelled: daysFromToday(-150), reason: "Too expensive" },
];

const cards = ["Visa", "Mastercard", "Visa", "Amex", "Visa", "Mastercard"] as const;

export const subscriptions: Subscription[] = (() => {
  const r = rng("billing");
  const subs: Subscription[] = vendors.map((v, i) => {
    const tier: TierId = v.featured ? "premier" : r() < 0.42 ? "signature" : "essential";
    const billing = r() < 0.55 ? "annual" : "monthly";
    const started = daysFromToday(-Math.round(40 + r() * 640));
    // Next charge: the next anniversary of the start date, by year or by month.
    let renews = started;
    while (renews <= TODAY) renews = addMonths(renews, billing === "annual" ? 12 : 1);
    const expiresIn = Math.round(r() * 30);
    return {
      id: `sub_${(hash(v.slug) % 1e6).toString(36)}`,
      slug: v.slug,
      name: v.name,
      tier,
      billing,
      started,
      renews,
      autoRenew: true,
      status: "active",
      card: { brand: cards[i % cards.length], last4: String(1000 + (hash(v.slug) % 9000)), expires: monthKey(addMonths(TODAY, expiresIn)) },
    };
  });

  // The situations the portal is there to catch.
  const set = (slug: string, patch: Partial<Subscription>) => Object.assign(subs.find((s) => s.slug === slug)!, patch);
  set("jayess-events", { status: "past_due", billing: "monthly", renews: daysFromToday(-2), failure: { at: daysFromToday(-2), reason: "Card declined: insufficient funds", attempts: 2 } });
  set("dlux-photobooth", { status: "past_due", billing: "monthly", renews: daysFromToday(-5), failure: { at: daysFromToday(-5), reason: "Card expired", attempts: 3 } });
  set("celebrant-jam", { status: "cancelling", billing: "annual", autoRenew: false, renews: daysFromToday(11), cancelled: { at: daysFromToday(-6), reason: "Taking a break from weddings next year" } });
  set("rosie-haus", { billing: "annual", autoRenew: false, renews: daysFromToday(19) });
  set("elusana", { billing: "annual", renews: daysFromToday(8) });
  set("silver-arrow-films", { billing: "annual", renews: daysFromToday(26) });
  set("katrina-lai", { card: { brand: "Visa", last4: "4417", expires: monthKey(TODAY) } });
  set("yong-video-productions", { card: { brand: "Mastercard", last4: "8820", expires: monthKey(TODAY) } });
  set("citrus-7-photography", { tier: "signature", upgradedFrom: { tier: "essential", at: daysFromToday(-3) } });
  set("indelibleink-calligraphy", { started: daysFromToday(-1), renews: addMonths(daysFromToday(-1), 1), billing: "monthly" });
  set("gabiera-film-photographer", { started: daysFromToday(-12), renews: addMonths(daysFromToday(-12), 12), billing: "annual" });
  // Make sure no other card has run out.
  for (const s of subs) if (s.card.expires < monthKey(TODAY)) s.card.expires = monthKey(addMonths(TODAY, 14));

  for (const d of departed) {
    subs.push({
      id: `sub_${(hash(d.slug) % 1e6).toString(36)}`,
      slug: d.slug,
      name: d.name,
      tier: d.tier,
      billing: "monthly",
      started: addMonths(d.cancelled, -14),
      renews: d.cancelled,
      autoRenew: false,
      status: "cancelled",
      card: { brand: "Visa", last4: "0000", expires: "2027-01" },
      cancelled: { at: d.cancelled, reason: d.reason },
    });
  }
  return subs;
})();

export const subscriptionFor = (slug: string) => subscriptions.find((s) => s.slug === slug);

export const isPaying = (s: Subscription) => s.status === "active" || s.status === "past_due" || s.status === "cancelling";

export const price = (s: Pick<Subscription, "tier" | "billing">) => tiers[s.tier][s.billing];

/** Monthly value of a plan, annual plans spread across the year. */
export const monthlyValue = (s: Subscription) => (s.billing === "annual" ? tiers[s.tier].annual / 12 : tiers[s.tier].monthly);

export type Charge = { id: string; sub: Subscription; day: string; amount: number; status: "paid" | "failed" | "refunded" };

/** Every charge to date: monthly plans each month, annual plans on their anniversary. */
export const charges: Charge[] = (() => {
  const out: Charge[] = [];
  for (const s of subscriptions) {
    const end = s.status === "cancelled" ? s.cancelled!.at : TODAY;
    let at = s.started;
    // A plan upgraded mid-term was charged at the old price until the upgrade.
    while (at <= end) {
      const tier = s.upgradedFrom && at < s.upgradedFrom.at ? s.upgradedFrom.tier : s.tier;
      const failed = s.failure && at >= s.failure.at;
      out.push({ id: `ch_${(hash(s.id + at) % 1e8).toString(36)}`, sub: s, day: at, amount: tiers[tier][s.billing], status: failed ? "failed" : "paid" });
      at = addMonths(at, s.billing === "annual" ? 12 : 1);
    }
    if (s.upgradedFrom) out.push({ id: `ch_up_${s.id}`, sub: s, day: s.upgradedFrom.at, amount: (price(s) - tiers[s.upgradedFrom.tier][s.billing]) / 2, status: "paid" });
  }
  return out.sort((a, b) => b.day.localeCompare(a.day));
})();

export const chargesFor = (slug: string) => charges.filter((c) => c.sub.slug === slug);

/** Revenue collected each month, split by tier. */
export function revenueByMonth(count = 12) {
  return lastMonths(count).map((key) => {
    const byTier = { essential: 0, signature: 0, premier: 0 } as Record<TierId, number>;
    for (const c of charges) if (c.status === "paid" && monthKey(c.day) === key) byTier[c.sub.tier] += c.amount;
    return { key, ...byTier, total: byTier.essential + byTier.signature + byTier.premier };
  });
}

/** Recurring revenue per month at today's plans. */
export const mrr = () => subscriptions.filter((s) => s.status === "active" || s.status === "cancelling").reduce((t, s) => t + monthlyValue(s), 0);

export function billingSummary() {
  const thisMonth = monthKey(TODAY);
  const paying = subscriptions.filter(isPaying);
  return {
    paying: paying.length,
    byTier: tierOrder.map((t) => ({ tier: t, count: paying.filter((s) => s.tier === t).length })),
    newThisMonth: subscriptions.filter((s) => monthKey(s.started) === thisMonth),
    cancelled: subscriptions.filter((s) => s.cancelled && daysUntil(s.cancelled.at) >= -90),
    failed: subscriptions.filter((s) => s.status === "past_due"),
    renewals: subscriptions.filter((s) => isPaying(s) && s.billing === "annual" && daysUntil(s.renews) <= 60).sort((a, b) => a.renews.localeCompare(b.renews)),
    expiringCards: subscriptions.filter((s) => isPaying(s) && s.status !== "past_due" && s.card.expires <= monthKey(addMonths(TODAY, 1))),
    upgrades: subscriptions.filter((s) => s.upgradedFrom),
  };
}
