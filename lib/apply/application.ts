import { languages, serviceLabels, states } from "@/data/taxonomy";
import type { CraftId, Language, Service, StateCode } from "@/data/types";
import { normaliseBlocks, parseBlock, splitStory, storyLength } from "@/lib/story";
import { countryByCode, formatPhone } from "./countries";

/*
 * A vendor's application to join the directory, as the apply flow collects it and the server checks
 * it. Shared by both, so the limits a vendor sees are the ones the server enforces.
 */

export type Application = {
  crafts: CraftId[];
  /** What they do when none of our crafts fits, in their words. Goes to the team. */
  otherCraft: string;
  services: Service[];
  languages: Language[];
  /** Languages we don't list yet, in their words. Goes to the team, not the listing. */
  otherLanguages: string;
  based: string;
  serviceArea: StateCode[];
  name: string;
  person: string;
  discipline: string;
  story: string;
  email: string;
  /** ISO code of the phone's country, e.g. "AU". */
  phoneCountry: string;
  /** The number without its country code, as typed. */
  phone: string;
  website: string;
  instagram: string;
  facebook: string;
  /** They confirmed the photos are theirs to share. */
  rights: boolean;
};

export const emptyApplication: Application = {
  crafts: [],
  otherCraft: "",
  services: [],
  languages: [],
  otherLanguages: "",
  based: "",
  serviceArea: [],
  name: "",
  person: "",
  discipline: "",
  story: "",
  email: "",
  phoneCountry: "AU",
  phone: "",
  website: "",
  instagram: "",
  facebook: "",
  rights: false,
};

export const LIMITS = {
  name: 60,
  person: 60,
  discipline: 40,
  based: 40,
  storyMax: 2000,
  otherLanguages: 80,
  otherCraft: 80,
  photosMax: 12,
  /** Below this on the long edge a photo is refused; below `photoSoft` it's accepted with a warning. */
  photoMin: 800,
  photoSoft: 1200,
} as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HOST = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i;

export const isEmail = (s: string) => EMAIL.test(s.trim());

const lower = (s: string) => (/^[A-Z]{2,}\b/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

/** Plain lines for the card from what they offer, e.g. "Photography" or "Celebrant & MC". */
export function disciplineSuggestions(services: Service[], other = ""): string[] {
  const labels = services.map((s) => serviceLabels[s]);
  const out = labels.slice(0, 4);
  if (labels.length >= 2) out.push(`${labels[0]} & ${lower(labels[1])}`);
  if (other) out.push(other.charAt(0).toUpperCase() + other.slice(1));
  return [...new Set(out)].filter((s) => s.length <= LIMITS.discipline);
}
export const isWebsite = (s: string) => !s.trim() || HOST.test(s.trim());

/** How long a story reads, once the house rules are applied (see lib/story.ts). */
export const storyChars = (story: string) => storyLength(normaliseBlocks(splitStory(story).map(parseBlock)));

/** The full number for the listing, e.g. "+61 4123 4567 8", or nothing. */
export function fullPhone(a: Pick<Application, "phone" | "phoneCountry">) {
  const digits = a.phone.replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return "";
  return `${countryByCode(a.phoneCountry).dial} ${formatPhone(digits)}`;
}

export const withScheme = (url: string) => {
  const u = url.trim();
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
};

/** "@studio", "studio" or a full link, as a link to the profile. */
export function socialUrl(value: string, site: "instagram" | "facebook") {
  const v = value.trim();
  if (!v) return "";
  if (/^(https?:\/\/)?(www\.)?(instagram|facebook|fb)\.com\//i.test(v)) return withScheme(v);
  const handle = v.replace(/^@/, "").replace(/\/+$/, "");
  if (!/^[\w.-]{1,60}$/.test(handle)) return "";
  return `https://www.${site}.com/${handle}/`;
}

/** What's wrong with an application, or nothing. The server runs this on every submission. */
export function problems(a: Application): string[] {
  const out: string[] = [];
  const known = <T extends string>(values: unknown, map: Record<T, unknown>) => Array.isArray(values) && values.every((v) => typeof v === "string" && v in map);
  const other = typeof a.otherCraft === "string" ? a.otherCraft.trim() : "";
  if (!known(a.services, serviceLabels) || (a.services.length === 0 && !other)) out.push("Choose what you offer.");
  if (other.length > LIMITS.otherCraft) out.push("Keep what you do short.");
  if (!known(a.languages, languages) || a.languages.length === 0) out.push("Choose at least one language.");
  if (!known(a.serviceArea, states) || a.serviceArea.length === 0) out.push("Choose where you'll work.");
  const text = (s: unknown, max: number) => typeof s === "string" && s.trim().length <= max;
  if (!text(a.name, LIMITS.name) || !a.name.trim()) out.push("Add your business name.");
  if (!text(a.person, LIMITS.person) || !a.person.trim()) out.push("Add your name.");
  if (!text(a.discipline, LIMITS.discipline) || !a.discipline.trim()) out.push("Describe what you do in a few words.");
  if (!text(a.based, LIMITS.based)) out.push("Keep where you're based short.");
  if (!text(a.otherLanguages, LIMITS.otherLanguages)) out.push("Keep other languages short.");
  if (typeof a.story !== "string" || a.story.length > LIMITS.storyMax * 2 || storyChars(a.story) === 0) out.push("Tell couples about your work.");
  if (typeof a.email !== "string" || !isEmail(a.email)) out.push("Check your email address.");
  const digits = typeof a.phone === "string" ? a.phone.replace(/\D/g, "").replace(/^0+/, "") : "";
  if (!text(a.phone, 30) || (digits && (digits.length < 6 || digits.length > 14)) || !countryByCode(a.phoneCountry, null)) out.push("Check your phone number.");
  if (!text(a.website, 200) || !isWebsite(a.website)) out.push("Check your website address.");
  if (!text(a.instagram, 200) || (a.instagram.trim() && !socialUrl(a.instagram, "instagram"))) out.push("Check your Instagram.");
  if (!text(a.facebook, 200) || (a.facebook.trim() && !socialUrl(a.facebook, "facebook"))) out.push("Check your Facebook.");
  if (a.rights !== true) out.push("Confirm the photos are yours to share.");
  return out;
}

/** Lowercase, hyphenated, accents dropped: "Mỹ Linh Studio" → "my-linh-studio". */
export function slugify(name: string) {
  const s = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return s || "vendor";
}

/** Where a photo and its smaller copies go in the vendor-photos bucket (see lib/supabase/storage.ts). */
export const photoPaths = (vendorId: string, i: number) => {
  const key = `${vendorId}/${String(i).padStart(2, "0")}.jpg`;
  return { full: key, w1200: key.replace(/\.jpg$/, "@1200.jpg"), w480: key.replace(/\.jpg$/, "@480.jpg") };
};
