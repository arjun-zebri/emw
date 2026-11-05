/*
 * The listing plans. Names and prices are placeholders until the client confirms them; they're
 * set in one place so the real ones can drop in. Stripe will hold the subscriptions themselves.
 */

export type TierId = "essential" | "signature" | "premier";

export const tiers: Record<TierId, { name: string; monthly: number; annual: number; perks: string[] }> = {
  essential: { name: "Essential", monthly: 39, annual: 390, perks: ["Listing with up to 6 photos", "Enquiries by email", "Monthly stats"] },
  signature: { name: "Signature", monthly: 69, annual: 690, perks: ["Up to 20 photos", "Enquiries by email and SMS", "Live stats", "Journal mentions"] },
  premier: { name: "Premier", monthly: 119, annual: 1190, perks: ["Everything in Signature", "Featured on the home page", "Top of category results", "A Real Wedding story each year"] },
};

export const tierOrder: TierId[] = ["essential", "signature", "premier"];
