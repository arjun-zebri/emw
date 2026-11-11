import type { AreaCode, Craft, CraftId, Language, OverseasCode, Service, StateCode } from "./types";

export const crafts: Craft[] = [
  {
    id: "ceremony",
    name: "Ceremony & Hosting",
    short: "Ceremony",
    blurb: "Celebrants, MCs and tea ceremony hosts who can switch languages mid-sentence.",
    services: ["Celebrant", "MC"],
  },
  {
    id: "photo-film",
    name: "Photography & Film",
    short: "Photo & Film",
    blurb: "Documentary photographers, filmmakers and booths that catch both sides of the family.",
    services: ["Photographer", "Videographer", "Content Creator", "Photobooth"],
  },
  {
    id: "beauty-attire",
    name: "Beauty & Attire",
    short: "Beauty & Attire",
    blurb: "Hair, makeup and traditional dress, for every outfit change of the day.",
    services: ["Hair & Makeup", "Attire", "Jewellery"],
  },
  {
    id: "flowers-paper",
    name: "Flowers & Paper",
    short: "Flowers & Paper",
    blurb: "Florists, calligraphers and illustrators: the details guests take home.",
    services: ["Florist", "Stationery and Signage", "Favours and Gifts", "Live Art", "Bouquet Preservation"],
  },
  {
    id: "music-performance",
    name: "Music & Performance",
    short: "Music",
    blurb: "String quartets, live bands, harpists and a lion dance troupe.",
    services: ["Music", "Entertainment", "Dance Instructor"],
  },
  {
    id: "planning-styling",
    name: "Planning & Styling",
    short: "Planning",
    blurb: "Planners, coordinators and stylists who keep both families' traditions on one run sheet.",
    services: ["Wedding Planner", "Wedding Coordinator", "Event Planner", "Event Stylist"],
  },
  {
    id: "food-cake",
    name: "Food & Cake",
    short: "Food & Cake",
    blurb: "Caterers, cake makers and food trucks, from the banquet to the late-night snack.",
    services: ["Catering", "Cakes and Desserts", "Mobile Food Trucks and Carts"],
  },
  {
    id: "venues-hire",
    name: "Venues & Hire",
    short: "Venues & Hire",
    blurb: "Venues, cars and everything else that has to be booked and brought in.",
    services: ["Venue", "Hire Items", "Car Hire", "Fireworks and Effects"],
  },
];

export const craftById = Object.fromEntries(crafts.map((c) => [c.id, c])) as Record<CraftId, Craft>;

export function craftOf(service: Service): Craft {
  return crafts.find((c) => c.services.includes(service)) ?? crafts[0];
}

export const serviceLabels: Record<Service, string> = {
  Celebrant: "Celebrant",
  MC: "MC",
  Photographer: "Photography",
  Videographer: "Videography",
  "Content Creator": "Content creation",
  Photobooth: "Photobooth",
  "Hair & Makeup": "Hair & makeup",
  Attire: "Attire",
  Florist: "Florals",
  "Stationery and Signage": "Stationery & signage",
  "Favours and Gifts": "Favours & gifts",
  Music: "Music",
  Entertainment: "Entertainment",
  "Dance Instructor": "Dance lessons",
  "Live Art": "Live art",
  "Bouquet Preservation": "Bouquet preservation",
  Jewellery: "Jewellery",
  "Wedding Planner": "Wedding planning",
  "Wedding Coordinator": "Wedding coordination",
  "Event Planner": "Event planning",
  "Event Stylist": "Styling",
  Catering: "Catering",
  "Cakes and Desserts": "Cakes & desserts",
  "Mobile Food Trucks and Carts": "Food trucks & carts",
  Venue: "Venues",
  "Hire Items": "Hire",
  "Car Hire": "Car hire",
  "Fireworks and Effects": "Fireworks & effects",
};

/** Native names are set in the vendor's script; the directory leads with these. */
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
  English: { native: "English", lang: "en" },
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

export const overseas: Record<OverseasCode, string> = {
  CAN: "Canada",
  USA: "USA",
  EUR: "Europe",
  ASIA: "Asia",
};

/** Every place a vendor can work, states first. */
export const areas: Record<AreaCode, string> = { ...states, ...overseas };

/** A service area that covers every state reads as "Australia-wide". */
export const australiaWide = (area: readonly string[]) => (Object.keys(states) as string[]).every((s) => area.includes(s));

/** "Australia-wide" or the states by name, then any overseas regions. */
export function areaLabel(area: readonly string[], none = "On request") {
  const home = australiaWide(area) ? ["Australia-wide"] : area.filter((a) => a in states).map((a) => states[a as StateCode]);
  const abroad = area.filter((a) => a in overseas).map((a) => overseas[a as OverseasCode]);
  return [...home, ...abroad].join(", ") || none;
}

/** Languages outside our list, as the vendor wrote them. English is everyone's, so it's never "other". */
export const otherLanguagesOf = (values: readonly string[]) => values.filter((v) => !(v in languages));
