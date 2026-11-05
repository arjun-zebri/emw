export type StateCode = "ACT" | "NSW" | "NT" | "QLD" | "SA" | "TAS" | "VIC" | "WA";

export type Service =
  | "Celebrant"
  | "MC"
  | "Photographer"
  | "Videographer"
  | "Content Creator"
  | "Photobooth"
  | "Hair & Makeup"
  | "Attire"
  | "Florist"
  | "Stationery and Signage"
  | "Favours and Gifts"
  | "Music"
  | "Entertainment"
  | "Dance Instructor"
  | "Live Art"
  | "Jewellery"
  | "Wedding Planner"
  | "Wedding Coordinator"
  | "Event Planner"
  | "Event Stylist"
  | "Catering"
  | "Cakes and Desserts"
  | "Mobile Food Trucks and Carts"
  | "Venue"
  | "Hire Items"
  | "Car Hire";

export type Language =
  | "Cantonese"
  | "English"
  | "Filipino"
  | "Hakka"
  | "Indonesian"
  | "Japanese"
  | "Korean"
  | "Mandarin"
  | "Teochew"
  | "Thai"
  | "Vietnamese";

export type CraftId =
  | "ceremony"
  | "photo-film"
  | "beauty-attire"
  | "flowers-paper"
  | "music-performance"
  | "planning-styling"
  | "food-cake"
  | "venues-hire";

export type Craft = {
  id: CraftId;
  name: string;
  short: string;
  blurb: string;
  services: Service[];
};

export type Vendor = {
  slug: string;
  /** Slug on the current WordPress site, when it differs. Kept for redirects in the full build. */
  legacySlug?: string;
  name: string;
  person?: string;
  discipline: string;
  services: Service[];
  based?: string;
  serviceArea?: StateCode[];
  travels?: string;
  languages?: Language[];
  lede: string;
  quote?: string;
  story: string[];
  signoff?: string;
  contact?: { email?: string; phone?: string; website?: string };
  socials?: { instagram?: string; facebook?: string; youtube?: string };
  featured: boolean;
  cover?: string;
  gallery?: string[];
  /** Width ÷ height of each photo, by src. Listings from the database carry their own; otherwise data/photo-ratios.ts. */
  ratios?: Record<string, number>;
};
