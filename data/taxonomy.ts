import type { AreaCode, Craft, CraftId, Language, OverseasCode, Service, StateCode } from "./types";

export const crafts: Craft[] = [
  {
    id: "ceremony",
    name: "Ceremony & Hosting",
    short: "Ceremony",
    blurb: "Celebrants, MCs and tea ceremony hosts who can switch languages mid-sentence.",
    services: ["Celebrant", "MC", "Tea Ceremony Host"],
  },
  {
    id: "photo-film",
    name: "Photography & Film",
    short: "Photo & Film",
    blurb: "Documentary photographers and filmmakers who catch both sides of the family.",
    services: ["Photographer", "Videographer", "Content Creator"],
  },
  {
    id: "beauty-attire",
    name: "Beauty & Attire",
    short: "Beauty & Attire",
    blurb: "Hair, makeup and traditional dress, for every outfit change of the day.",
    services: ["Makeup", "Hair", "Attire", "Jewellery"],
  },
  {
    id: "flowers-paper",
    name: "Styling, Florals & Stationery",
    short: "Styling & Florals",
    blurb: "Stylists, florists and stationers: the room, the flowers and the details guests take home.",
    services: ["Event Stylist", "Florist", "Stationery and Signage", "Favours and Gifts", "Bouquet Preservation"],
  },
  {
    id: "music-performance",
    name: "Entertainment",
    short: "Entertainment",
    blurb: "String quartets, DJs, live artists, photobooths and a lion dance troupe.",
    services: ["Live Music", "DJ", "Performers", "Lion Dance", "Dance Instructor", "Photobooth", "Live Portrait Studio", "Live Art"],
  },
  {
    id: "planning-styling",
    name: "Planning & Coordination",
    short: "Planning",
    blurb: "Planners and coordinators who keep both families' traditions on one run sheet.",
    services: ["Wedding Planner", "Wedding Coordinator", "Event Planner"],
  },
  {
    id: "food-cake",
    name: "Food & Drinks",
    short: "Food & Drinks",
    blurb: "Caterers, cake makers, food trucks and bars, from the banquet to the late-night snack.",
    services: ["Catering", "Cakes and Desserts", "Mobile Food Trucks and Carts", "Drink Trucks and Carts", "Mobile Bar"],
  },
  {
    id: "venues-hire",
    name: "Venue & Hire",
    short: "Venue & Hire",
    blurb: "Venues, cars and everything else that has to be booked and brought in.",
    services: ["Venue", "Furniture Hire", "Decor Hire", "Tea Ceremony Setup Hire", "Car Hire", "Fireworks and Effects"],
  },
];

export const craftById = Object.fromEntries(crafts.map((c) => [c.id, c])) as Record<CraftId, Craft>;

/**
 * Services no longer offered (the 17 Nov 2026 category list split or renamed them). Listings that have them
 * keep them, under their old craft, until the team retags each vendor; nobody can choose them again.
 */
export const retiredServices: Partial<Record<Service, CraftId>> = {
  "Hair & Makeup": "beauty-attire",
  Music: "music-performance",
  Entertainment: "music-performance",
  "Hire Items": "venues-hire",
};

export function craftOf(service: Service): Craft {
  const retired = retiredServices[service];
  return crafts.find((c) => c.services.includes(service)) ?? (retired ? craftById[retired] : crafts[0]);
}

/** Every service a vendor can choose, in category order. */
export const offeredServices: Service[] = crafts.flatMap((c) => c.services);

/** Options for a services picker: what's offered, plus any retired service the listing already has. */
export const serviceOptions = (current: readonly Service[] = []) =>
  [...offeredServices, ...current.filter((s) => s in retiredServices)].map((s) => ({ value: s, label: serviceLabels[s] }));

export const serviceLabels: Record<Service, string> = {
  Celebrant: "Celebrant",
  MC: "MC",
  "Tea Ceremony Host": "Tea ceremony host",
  Photographer: "Photography",
  Videographer: "Videography",
  "Content Creator": "Content creation",
  Photobooth: "Photobooth",
  Makeup: "Makeup",
  Hair: "Hair",
  Attire: "Attire",
  Jewellery: "Jewellery",
  "Event Stylist": "Styling",
  Florist: "Florals",
  "Stationery and Signage": "Stationery & signage",
  "Favours and Gifts": "Favours & gifts",
  "Bouquet Preservation": "Bouquet preservation",
  "Live Music": "Live music",
  DJ: "DJ",
  Performers: "Performers",
  "Lion Dance": "Lion dance",
  "Dance Instructor": "Dance lessons",
  "Live Portrait Studio": "Live portrait studio",
  "Live Art": "Live art",
  "Wedding Planner": "Wedding planning",
  "Wedding Coordinator": "Wedding coordination",
  "Event Planner": "Event planning and coordination",
  Catering: "Catering",
  "Cakes and Desserts": "Cakes & desserts",
  "Mobile Food Trucks and Carts": "Food trucks & carts",
  "Drink Trucks and Carts": "Drink trucks & carts",
  "Mobile Bar": "Bar / mobile bar",
  Venue: "Venue",
  "Furniture Hire": "Furniture & setup hire",
  "Decor Hire": "Décor & prop hire",
  "Tea Ceremony Setup Hire": "Tea ceremony setup hire",
  "Car Hire": "Car hire",
  "Fireworks and Effects": "Fireworks & effects",
  "Hair & Makeup": "Hair & makeup",
  Music: "Music",
  Entertainment: "Entertainment",
  "Hire Items": "Hire",
};

/**
 * Native names are set in the vendor's script; the directory leads with these. English isn't one: every vendor
 * is taken to work in it, so it's never offered, filtered on or shown, even where a listing still stores it.
 */
export const languages: Record<Language, { native: string; lang: string }> = {
  Cantonese: { native: "廣東話", lang: "yue" },
  Mandarin: { native: "普通话", lang: "zh-Hans" },
  Vietnamese: { native: "Tiếng Việt", lang: "vi" },
  Indonesian: { native: "Bahasa Indonesia", lang: "id" },
  Filipino: { native: "Filipino", lang: "fil" },
  Korean: { native: "한국어", lang: "ko" },
  Japanese: { native: "日本語", lang: "ja" },
  Thai: { native: "ภาษาไทย", lang: "th" },
  Teochew: { native: "潮州話", lang: "zh-Hant" },
  Hakka: { native: "客家話", lang: "hak" },
};

export const states: Record<StateCode, string> = {
  VIC: "Victoria",
  NSW: "New South Wales",
  QLD: "Queensland",
  WA: "Western Australia",
  SA: "South Australia",
  TAS: "Tasmania",
  ACT: "Australian Capital Territory",
  NT: "Northern Territory",
};

/** Nearest first. */
export const overseas: Record<OverseasCode, string> = {
  NZ: "New Zealand",
  ASIA: "Asia",
  EUR: "Europe",
  USA: "USA",
  CAN: "Canada",
};

/** Every place a vendor can work, states first. */
export const areas: Record<AreaCode, string> = { ...states, ...overseas };

/** A service area that covers every state reads as "Australia-wide". */
export const australiaWide = (area: readonly string[]) => (Object.keys(states) as string[]).every((s) => area.includes(s));

/** Every state and every overseas region reads as "Worldwide". */
export const worldwide = (area: readonly string[]) => australiaWide(area) && (Object.keys(overseas) as string[]).every((o) => area.includes(o));

/** "Worldwide", "Australia-wide" or the states by name, then any overseas regions. */
export function areaLabel(area: readonly string[], none = "On request") {
  if (worldwide(area)) return "Worldwide";
  const { home, abroad } = areaParts(area);
  return [home, abroad].filter(Boolean).join(", ") || none;
}

/** Where in Australia, and where overseas, as two separate lines of text (either may be empty). */
export function areaParts(area: readonly string[]) {
  const home = australiaWide(area) ? ["Australia-wide"] : area.filter((a) => a in states).map((a) => states[a as StateCode]);
  const abroad = area.filter((a) => a in overseas).map((a) => overseas[a as OverseasCode]);
  return { home: home.join(", "), abroad: abroad.join(", ") };
}

/** Every area as a choice, Australian states first and then overseas regions, each under its own heading. */
export const areaOptions = (short = false) => [
  ...(Object.keys(states) as StateCode[]).map((s) => ({ value: s as AreaCode, label: short ? s : states[s], group: "Australia" })),
  ...(Object.keys(overseas) as OverseasCode[]).map((o) => ({ value: o as AreaCode, label: overseas[o], group: "Overseas" })),
];

/** Languages outside our list, as the vendor wrote them. English is everyone's, so it's never "other". */
export const otherLanguagesOf = (values: readonly string[]) => values.filter((v) => !(v in languages) && !isEnglish(v));

const isEnglish = (v: string) => v.trim().toLowerCase() === "english";

/** A stored list of languages without English, which older listings and applications still hold. */
export const withoutEnglish = <T extends string>(values: readonly T[]) => values.filter((v) => !isEnglish(v));

/**
 * Cultures a couple can choose when they enquire, in alphabetical order. Anything else they write
 * in their own words. To check with the client before launch.
 */
export const cultureNames = [
  "Australian",
  "Cambodian",
  "Chinese",
  "European",
  "Filipino",
  "Indian",
  "Indonesian",
  "Japanese",
  "Korean",
  "Malaysian",
  "Middle Eastern",
  "Pacific Islander",
  "Sri Lankan",
  "Thai",
  "Vietnamese",
];
