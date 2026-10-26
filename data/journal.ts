import { sitePhotos } from "./photos";

/*
 * Journal posts. These seed the admin portal, where posts are written and published; the landing
 * page shows the three most recent published ones. In the demo, edits live in the browser
 * (lib/admin/store.ts), so a post published in /admin appears on / straight away.
 */

export type Block =
  | { id: string; type: "p" | "h"; text: string }
  | { id: string; type: "img"; src: string; alt: string; caption?: string };

export type PostStatus = "published" | "draft" | "scheduled";

export const postCategories = ["Real weddings", "Culture", "Planning", "Vendors"] as const;
export type PostCategory = (typeof postCategories)[number];

export type Post = {
  id: string;
  slug: string;
  title: string;
  standfirst: string;
  category: PostCategory;
  cover: { src?: string; alt: string };
  body: Block[];
  /** Vendors credited in the story, by slug. */
  vendors: string[];
  status: PostStatus;
  /** Publish date, or the scheduled one. */
  date: string;
  updated: string;
  author: string;
  description: string;
};

export const seedPosts: Post[] = [
  {
    id: "p-two-languages",
    slug: "writing-a-ceremony-in-two-languages",
    title: "Writing a ceremony in two languages",
    standfirst: "How to keep both families with you, line by line.",
    category: "Planning",
    cover: { src: sitePhotos.journal[2], alt: "A bilingual MC on the microphone at a reception" },
    body: [
      { id: "b1", type: "p", text: "A ceremony in two languages takes longer to write than it does to say. Start with what has to be heard by everyone: the welcome, the vows, the moment you're pronounced married." },
      { id: "b2", type: "h", text: "Decide what gets translated" },
      { id: "b3", type: "p", text: "Not every line needs to be said twice. Many couples translate the welcome and the vows in full, and let the readings stay in the language they were written in." },
      { id: "b4", type: "p", text: "Ask your celebrant or MC how they like to work. Some switch sentence by sentence, others by section, and a printed order of service can carry the rest." },
    ],
    vendors: ["katrina-lai", "mona-chungchao-civil-marriage-celebrant"],
    status: "published",
    date: "2026-10-14",
    updated: "2026-10-14T10:12:00+11:00",
    author: "Ivy Chen",
    description: "How to plan a bilingual wedding ceremony that both families can follow.",
  },
  {
    id: "p-not-the-same",
    slug: "all-weddings-are-not-the-same",
    title: "All weddings are not the same",
    standfirst: "Three couples, three ways of bringing two families together.",
    category: "Culture",
    cover: { src: sitePhotos.journal[0], alt: "A bride and her bridal party walking through a city laneway" },
    body: [
      { id: "b1", type: "p", text: "There is no single way to blend two cultures on one day. Some couples hold two ceremonies, some fold one tradition into the other, and some keep the day small and the celebration long." },
    ],
    vendors: ["right-click-moments"],
    status: "published",
    date: "2026-09-22",
    updated: "2026-09-22T09:00:00+10:00",
    author: "East Meets Wed",
    description: "Different ways couples blend two cultures on their wedding day.",
  },
  {
    id: "p-eloping",
    slug: "eloping-by-the-sea",
    title: "Eloping by the sea",
    standfirst: "A clifftop, two witnesses and a dinner for the families afterwards.",
    category: "Real weddings",
    cover: { src: sitePhotos.journal[1], alt: "A couple on a clifftop above the ocean at sunset" },
    body: [
      { id: "b1", type: "p", text: "They married on a clifftop with two witnesses and a photographer, then flew home for a dinner with both families the following weekend." },
    ],
    vendors: ["yong-video-productions"],
    status: "published",
    date: "2026-08-30",
    updated: "2026-08-30T12:30:00+10:00",
    author: "East Meets Wed",
    description: "A clifftop elopement, followed by a family dinner at home.",
  },
  {
    id: "p-mc",
    slug: "choosing-an-mc-who-switches-languages",
    title: "Choosing an MC who can switch languages",
    standfirst: "What to ask before you book.",
    category: "Planning",
    cover: { src: "/images/vendors/katrina-lai/02.jpg", alt: "A celebrant on the microphone between the couple at a garden arch" },
    body: [
      { id: "b1", type: "p", text: "A good bilingual MC does more than translate. They read the room, keep the timing, and know when a joke will land in one language and not the other." },
      { id: "b2", type: "h", text: "Questions to ask" },
      { id: "b3", type: "p", text: "Which languages are they comfortable hosting in, not just speaking? Have they run the formalities you're planning, like a tea ceremony or a door game?" },
    ],
    vendors: ["nikki-z-wedding-services", "katrina-lai"],
    status: "draft",
    date: "2026-11-04",
    updated: "2026-10-25T16:20:00+11:00",
    author: "Ivy Chen",
    description: "What to ask a bilingual wedding MC before you book.",
  },
  {
    id: "p-trays",
    slug: "eight-trays-seven-trays",
    title: "Eight trays, seven trays",
    standfirst: "The betrothal gifts, and what each family brings.",
    category: "Culture",
    cover: { src: "/images/vendors/mona-chungchao-civil-marriage-celebrant/02.jpg", alt: "Gift trays laid out for a betrothal ceremony" },
    body: [{ id: "b1", type: "p", text: "" }],
    vendors: [],
    status: "scheduled",
    date: "2026-11-12",
    updated: "2026-10-24T11:05:00+11:00",
    author: "East Meets Wed",
    description: "",
  },
];

