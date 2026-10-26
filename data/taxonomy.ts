import type { Craft, CraftId, Language, Service, StateCode } from "./types";

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
    services: ["Hair & Makeup", "Attire"],
  },
  {
    id: "flowers-paper",
    name: "Flowers & Paper",
    short: "Flowers & Paper",
    blurb: "Florists, calligraphers and illustrators: the details guests take home.",
    services: ["Florist", "Stationery and Signage", "Favours and Gifts"],
  },
  {
    id: "music-performance",
    name: "Music & Performance",
    short: "Music",
    blurb: "String quartets, live bands, harpists and a lion dance troupe.",
    services: ["Music", "Entertainment"],
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
