import type { Language, Service, StateCode } from "@/data/types";
import { vendors } from "@/lib/vendors";
import { pickOne, rng } from "./random";
import { daysFromToday, hoursAgo } from "./time";

/*
 * Simulated people for the demo: couples, enquiries, businesses waiting to join, and the
 * submissions waiting on approval. Every couple and applicant here is fictional.
 */

const firstNames = [
  "Linh", "Thomas", "Mei", "Arjun", "Hana", "Liam", "Grace", "Minh", "Priya", "Daniel", "Jia", "Sam", "Anh", "Oliver",
  "Yuna", "James", "Bea", "Marco", "Siti", "Noah", "Kim", "Lachlan", "Ploy", "Ethan", "Rina", "Joel", "Thao", "Ben",
  "Sora", "Isaac", "Mai", "Harry", "Lan", "Felix", "Ayu", "Jack", "Nhi", "Lucas", "Wen", "Hugo",
];
const lastNames = ["Nguyen", "Chen", "Tran", "Wong", "Kim", "Lee", "Smith", "Pham", "Santos", "Lim", "Tan", "Brown", "Le", "Park", "Wilson", "Ho"];
const cultures = [
  "Vietnamese and Australian",
  "Cantonese and Italian",
  "Korean and Irish",
  "Filipino and Greek",
  "Thai and English",
  "Mandarin and Indian",
  "Indonesian and Australian",
  "Japanese and Lebanese",
  "Teochew and Vietnamese",
  "Hakka and Scottish",
];
const places: [string, StateCode][] = [
  ["Melbourne", "VIC"],
  ["Melbourne", "VIC"],
  ["Sydney", "NSW"],
  ["Brisbane", "QLD"],
  ["Geelong", "VIC"],
  ["Perth", "WA"],
  ["Adelaide", "SA"],
];

export type Couple = {
  id: string;
  names: string;
  email: string;
  joined: string;
  weddingDate: string;
  city: string;
  state: StateCode;
  cultures: string;
  guests: string;
  saved: number;
  enquiries: number;
  /** What they've saved, for the "new vendors matching what you saved" alert. */
  interests: Service[];
};

export const couples: Couple[] = (() => {
  const r = rng("couples");
  return Array.from({ length: 64 }, (_, i) => {
    const a = pickOne(r, firstNames);
    let b = pickOne(r, firstNames);
    if (b === a) b = firstNames[(firstNames.indexOf(a) + 7) % firstNames.length];
    const [city, state] = pickOne(r, places);
    const joined = daysFromToday(-Math.round(Math.pow(i / 64, 1.3) * 120));
    return {
      id: `c${i + 1}`,
      names: `${a} & ${b}`,
      email: `${a.toLowerCase()}.${pickOne(r, lastNames).toLowerCase()}@${pickOne(r, ["gmail.com", "outlook.com", "icloud.com", "hotmail.com"])}`,
      joined,
      weddingDate: daysFromToday(Math.round(90 + r() * 520)),
      city,
      state,
      cultures: pickOne(r, cultures),
      guests: pickOne(r, ["Under 80", "80–200", "80–200", "200–400", "400+"]),
      saved: Math.round(r() * 11),
      enquiries: Math.round(r() * 4),
      interests: [pickOne(r, ["Photographer", "Celebrant", "MC", "Hair & Makeup", "Videographer", "Florist", "Attire"] as Service[])],
    };
  });
})();

// ── Enquiries ────────────────────────────────────────────────────────────

const openers = [
  "We're planning a tea ceremony in the morning and a garden ceremony in the afternoon.",
  "Our families speak Cantonese and English, so we'd love someone who can switch between the two.",
  "We're having a small ceremony at home first, then a reception for about 180 guests.",
  "We loved your work and wanted to check if you're free on our date.",
  "We're after someone who understands both the traditional ceremony and a Western one.",
  "My parents will be most comfortable with someone who speaks Vietnamese.",
];
const askers = ["Could you send through your packages?", "Would you be free for a call this week?", "Do you travel outside Melbourne?", "Are you available on that date?"];

export type Enquiry = {
  id: string;
  vendor: string;
  couple: string;
  email: string;
  phone?: string;
  weddingDate: string;
  guests: string;
  traditions: string;
  message: string;
  sentAt: string;
  /** The vendor's reply, when there is one. */
  reply?: { at: string; text: string };
};

export const enquiries: Enquiry[] = (() => {
  const r = rng("enquiries");
  const listed = vendors.filter((v) => v.cover);
  const out: Enquiry[] = [];
  for (let i = 0; i < 90; i++) {
    const couple = couples[i % couples.length];
    // Katrina Lai, the vendor demo account, gets a steady stream so the inbox is full.
    const vendor = i % 6 === 0 ? "katrina-lai" : pickOne(r, listed).slug;
    const hours = Math.pow(i / 90, 1.4) * 24 * 40 + r() * 6;
    const replied = hours > 30 || r() < 0.45;
    out.push({
      id: `e${i + 1}`,
      vendor,
      couple: couple.names,
      email: couple.email,
      phone: r() < 0.6 ? `04${Math.floor(10 + r() * 89)} ${Math.floor(100 + r() * 899)} ${Math.floor(100 + r() * 899)}` : undefined,
      weddingDate: couple.weddingDate,
      guests: couple.guests,
      traditions: couple.cultures,
      message: `${pickOne(r, openers)} ${pickOne(r, askers)}`,
      sentAt: hoursAgo(hours),
      reply: replied ? { at: hoursAgo(Math.max(0.5, hours - 2 - r() * 20)), text: "Thank you for getting in touch. I'd love to hear more, and I'm free on your date. I'll send our details through now." } : undefined,
    });
  }
  // One enquiry left waiting long enough to trigger the 48-hour reminder.
  const late = out.find((e) => e.vendor === "katrina-lai" && !e.reply);
  if (late) late.sentAt = hoursAgo(53);
  return out;
})();

// ── Waiting on approval ──────────────────────────────────────────────────

export type Applicant = {
  id: string;
  name: string;
  person: string;
  email: string;
  phone: string;
  discipline: string;
  services: Service[];
  based: string;
  serviceArea: StateCode[];
  languages: Language[];
  lede: string;
  website?: string;
  instagram?: string;
  submitted: string;
  /** Searches on the site that currently find nothing, which this business would answer. */
  answers?: string;
};

export const applicants: Applicant[] = [
  {
    id: "app-maru",
    name: "Maru Hanbok Atelier",
    person: "Seo-yeon Park",
    email: "hello@maruhanbok.com.au",
    phone: "0412 558 210",
    discipline: "Hanbok for hire and made to measure",
    services: ["Attire"],
    based: "Strathfield",
    serviceArea: ["NSW", "VIC"],
    languages: ["Korean", "English"],
    lede: "Hanbok for the pyebaek and the reception, fitted for both families.",
    website: "https://maruhanbok.com.au",
    instagram: "https://instagram.com/maruhanbok",
    submitted: hoursAgo(5),
    answers: "hanbok",
  },
  {
    id: "app-saigon-silk",
    name: "Lụa Áo Dài Studio",
    person: "Thu Hà Lê",
    email: "studio@luaaodai.com.au",
    phone: "0433 120 987",
    discipline: "Áo dài, made to measure",
    services: ["Attire"],
    based: "Footscray",
    serviceArea: ["VIC"],
    languages: ["Vietnamese", "English"],
    lede: "Áo dài for the couple and both families, cut and fitted in Footscray.",
    instagram: "https://instagram.com/luaaodai",
    submitted: hoursAgo(26),
    answers: "ao dai",
  },
  {
    id: "app-north-strings",
    name: "Northcote String Collective",
    person: "Jun Wei Ong",
    email: "bookings@northcotestrings.com",
    phone: "0400 771 302",
    discipline: "String trio and quartet",
    services: ["Music"],
    based: "Northcote",
    serviceArea: ["VIC"],
    languages: ["Mandarin", "English"],
    lede: "Strings for the ceremony and dinner, with Mandarin and Cantonese songbooks.",
    website: "https://northcotestrings.com",
    submitted: hoursAgo(50),
  },
];

export type Submission = {
  id: string;
  couple: string;
  email: string;
  title: string;
  place: string;
  date: string;
  story: string;
  vendors: string[];
  photos: string[];
  submitted: string;
};

export const submissions: Submission[] = [
  {
    id: "rw-linh-tom",
    couple: "Linh & Tom",
    email: "linh.tran@gmail.com",
    title: "A tea ceremony at home, then a garden in the Yarra Valley",
    place: "Yarra Valley, VIC",
    date: daysFromToday(-38),
    story:
      "We started the morning at my parents' place in Springvale with the tea ceremony, then drove out to the valley for a garden ceremony in English. Patrick photographed both, and the flowers came with us from the house to the garden.",
    vendors: ["patrick-nguyen-kieu", "sugar-bee-flowers"],
    photos: ["/images/vendors/patrick-nguyen-kieu/01.jpg", "/images/vendors/patrick-nguyen-kieu/00.jpg", "/images/vendors/sugar-bee-flowers/02.jpg"],
    submitted: hoursAgo(9),
  },
  {
    id: "rw-mei-arjun",
    couple: "Mei & Arjun",
    email: "mei.lim@outlook.com",
    title: "Two ceremonies, one long table",
    place: "Fitzroy, VIC",
    date: daysFromToday(-61),
    story:
      "A Chinese tea ceremony for Mei's family and a small Hindu ceremony for Arjun's, on the same day and in the same courtyard. We ended with one long table and a string quartet playing songs from both sides.",
    vendors: ["katrina-lai", "invictus-quartet", "candy-ng-art"],
    photos: ["/images/vendors/katrina-lai/03.jpg", "/images/vendors/katrina-lai/02.jpg", "/images/vendors/invictus-quartet/01.jpg"],
    submitted: hoursAgo(31),
  },
];

export type Review = { id: string; vendor: string; couple: string; rating: number; text: string; weddingDate: string; submitted: string };

export const reviews: Review[] = [
  {
    id: "rv-1",
    vendor: "katrina-lai",
    couple: "Hana & Liam",
    rating: 5,
    text: "Our ceremony felt like us, and both families followed every word.",
    weddingDate: daysFromToday(-24),
    submitted: hoursAgo(3),
  },
  {
    id: "rv-2",
    vendor: "invictus-quartet",
    couple: "Grace & Minh",
    rating: 5,
    text: "Beautiful through the ceremony and dinner. Our guests are still talking about it.",
    weddingDate: daysFromToday(-17),
    submitted: hoursAgo(20),
  },
  {
    id: "rv-3",
    vendor: "dlux-photobooth",
    couple: "Priya & Daniel",
    rating: 4,
    text: "Guests loved it. Set-up ran a little late but the team made up for it.",
    weddingDate: daysFromToday(-12),
    submitted: hoursAgo(44),
  },
];

export const publishedReviews: Review[] = [
  { id: "rv-p1", vendor: "katrina-lai", couple: "Yuna & James", rating: 5, text: "Every photo feels like the day felt.", weddingDate: daysFromToday(-80), submitted: hoursAgo(24 * 60) },
  { id: "rv-p2", vendor: "katrina-lai", couple: "Bea & Marco", rating: 5, text: "Relaxed, patient and so good with our families.", weddingDate: daysFromToday(-130), submitted: hoursAgo(24 * 110) },
];

// ── Team ────────────────────────────────────────────────────────────────

export type Role = "Owner" | "Editor" | "Viewer";
export type Member = { id: string; name: string; email: string; role: Role; joined: string; you?: boolean };

export const team: Member[] = [
  { id: "m1", name: "East Meets Wed", email: "hello@eastmeetswed.com", role: "Owner", joined: "2023-02-14", you: true },
  { id: "m2", name: "Ivy Chen", email: "ivy@eastmeetswed.com", role: "Editor", joined: "2025-06-02" },
];
