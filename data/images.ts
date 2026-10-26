import { photoRatios } from "./photo-ratios";
import { sitePhotos } from "./photos";
import type { CraftId, Vendor } from "./types";

/*
 * Image slots for the editorial pages. Drop files into /public/images and set `src`.
 * Direction: real moments in natural light, both families in frame where possible,
 * no posed stock and no single culture's iconography standing in for the brand.
 */
export type Slot = { src?: string; alt: string; brief: string; tone?: number | "dark"; ratio?: number };

export const siteImages = {
  cover: {
    src: sitePhotos.hero,
    alt: "A couple embracing as a harpist plays beside them, photographed by Melbourne Harp Piano",
    brief: "Hero, full screen. Couple between ceremonies, outfit change half done, laughing. Warm late light, landscape.",
  },
  statement: {
    src: sitePhotos.statement,
    alt: "A tea ceremony at home: a young guest offers tea to the bride and groom",
    brief: "Two traditions in one frame.",
  },
  statementPortrait: {
    src: sitePhotos.statementPortrait,
    alt: "A bride in an embroidered qun gua beside her partner in a navy suit",
    brief: "",
  },
} satisfies Record<string, Slot>;

export const craftImages: Record<CraftId, Slot> = {
  ceremony: { src: sitePhotos.crafts["ceremony"], alt: "A celebrant mid-ceremony", brief: "Celebrant mid-sentence, couple soft in the foreground." },
  "photo-film": { src: sitePhotos.crafts["photo-film"], alt: "A photographer at a reception", brief: "Photographer at work, camera up, guests around." },
  "beauty-attire": { src: sitePhotos.crafts["beauty-attire"], alt: "Bridal hair being finished", brief: "Final pins in bridal hair, window light." },
  "flowers-paper": { src: sitePhotos.crafts["flowers-paper"], alt: "A calligraphed place card beside a bloom", brief: "Place card in ink, a single stem beside it." },
  "music-performance": { src: sitePhotos.crafts["music-performance"], alt: "A string quartet at a reception", brief: "Strings mid-performance, bows blurred." },
};

// "Eight trays, seven trays" is told in the About section, so the Journal carries the client's
// announced follow-up, "All weddings are not the same", instead.
export const journal = [
  {
    image: { src: sitePhotos.journal[1], alt: "A couple on a clifftop above the ocean at sunset", brief: "" },
    category: "Real weddings",
    title: "Eloping by the sea",
  },
  {
    image: { src: sitePhotos.journal[0], alt: "A bride and her bridal party walking through a city laneway", brief: "" },
    category: "Culture",
    title: "All weddings are not the same",
  },
  {
    image: { src: sitePhotos.journal[2], alt: "A bilingual MC on the microphone at a reception", brief: "Celebrant's hands with a bilingual script." },
    category: "Planning",
    title: "Writing a ceremony in two languages",
  },
];

export function vendorCover(vendor: Vendor): Slot {
  return {
    src: vendor.cover,
    alt: `${vendor.name}, ${vendor.discipline.toLowerCase()}`,
    brief: `${vendor.name}. Signature image.`,
  };
}

/** Cover first, then the gallery, each with its width ÷ height. Vendors without photos get a briefed cover slot only. */
export function vendorImages(vendor: Vendor): Slot[] {
  const cover = vendorCover(vendor);
  return [
    { ...cover, ratio: vendor.cover ? photoRatios[vendor.cover] : undefined },
    ...(vendor.gallery ?? []).map((src, i) => ({ src, alt: `${vendor.name}, photo ${i + 2}`, brief: "", ratio: photoRatios[src] })),
  ];
}
