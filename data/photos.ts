/*
 * Photography for the demo, taken from each vendor's own listing on eastmeetswed.com and
 * curated by hand: flyers, logos and headshots are left out where a better frame exists.
 * Files live in /public/images/vendors/<slug>/NN.jpg (2000px, resized from the originals).
 * Christine Civil Celebrant and Daniella Bui have no photos on the live site yet.
 */
const pick = (slug: string, cover: number, gallery: number[] = []) => {
  const path = (n: number) => `/images/vendors/${slug}/${String(n).padStart(2, "0")}.jpg`;
  return { cover: path(cover), gallery: gallery.map(path) };
};

export const vendorPhotos: Record<string, { cover: string; gallery: string[] }> = {
  "aldin-ortinez": pick("aldin-ortinez", 0, [1]),
  "amerta-entertainment": pick("amerta-entertainment", 8), // every upload is a flyer; 08 is the singer cropped clear of the text in 05
  "at-last-film-and-photography": pick("at-last-film-and-photography", 3, [2, 0, 4, 5, 1]),
  "candy-ng-art": pick("candy-ng-art", 2, [5, 0, 1, 3, 4]),
  "celebrant-jam": pick("celebrant-jam", 0, [1]),
  "citrus-7-photography": pick("citrus-7-photography", 5, [3, 2, 1, 4]),
  "dillon-reyn-live-event-illustration": pick("dillon-reyn-live-event-illustration", 0, [2, 3, 1]),
  "dlux-photobooth": pick("dlux-photobooth", 2, [1, 0]),
  elusana: pick("elusana", 0),
  "folkstone-weddings": pick("folkstone-weddings", 1, [3, 2]), // 00 has their logo on the flower wall
  "gabiera-film-photographer": pick("gabiera-film-photographer", 6, [0, 2, 1, 5, 7, 8]),
  "gdpt-dai-bi-quan-am-lion-dance": pick("gdpt-dai-bi-quan-am-lion-dance", 1, [0, 2]),
  "indelibleink-calligraphy": pick("indelibleink-calligraphy", 0, [1]),
  "invictus-quartet": pick("invictus-quartet", 1, [0, 2, 3, 4]),
  "jayess-events": pick("jayess-events", 4, [1, 2, 5, 3]),
  jayteehair: pick("jayteehair", 1, [0]),
  "katrina-lai": pick("katrina-lai", 3, [2, 4, 1, 5, 0]),
  "kindred-visuals": pick("kindred-visuals", 3, [0, 2, 1]),
  "makeup-by-elly-liana": pick("makeup-by-elly-liana", 2, [1, 3, 0]),
  "melbourne-harp-piano-deon-entwisle": pick("melbourne-harp-piano-deon-entwisle", 2, [1, 0, 4, 3]),
  "mona-chungchao-civil-marriage-celebrant": pick("mona-chungchao-civil-marriage-celebrant", 0, [2, 1, 3]),
  "nikki-z-wedding-services": pick("nikki-z-wedding-services", 0, [1, 2, 4, 3]),
  "patrick-nguyen-kieu": pick("patrick-nguyen-kieu", 1, [0, 2]),
  "right-click-moments": pick("right-click-moments", 0, [2, 1, 5, 3, 4]),
  "rosie-haus": pick("rosie-haus", 0),
  "seventy7-studios-booths": pick("seventy7-studios-booths", 0, [1, 3]),
  "silver-arrow-films": pick("silver-arrow-films", 1),
  "stephanie-nguyen-artistry": pick("stephanie-nguyen-artistry", 2, [1, 3, 4, 5, 0]),
  "sugar-bee-flowers": pick("sugar-bee-flowers", 2, [0, 1, 3, 4, 5]),
  "victor-tang-photography": pick("victor-tang-photography", 0),
  "yaya-films": pick("yaya-films", 4, [1, 2, 5, 3, 0]),
  "yong-video-productions": pick("yong-video-productions", 1, [5, 4, 3, 2]),
};

/**
 * Site-level picks from the same pool. Keep the mix broad: the brief is "open to all cultures, not just
 * the tea ceremony", and too much red tips towards the red-and-gold cliché it rules out.
 */
export const sitePhotos = {
  hero: "/images/hero/melbourne-harp-piano-deon-entwisle-01.jpg",
  // About: a tea ceremony beside a couple in a qun gua.
  statement: "/images/hero/mona-chungchao-civil-marriage-celebrant-02.jpg",
  statementPortrait: "/images/vendors/citrus-7-photography/05.jpg",
  crafts: {
    ceremony: "/images/vendors/mona-chungchao-civil-marriage-celebrant/00.jpg",
    "photo-film": "/images/vendors/kindred-visuals/01.jpg",
    "beauty-attire": "/images/vendors/makeup-by-elly-liana/02.jpg",
    "flowers-paper": "/images/vendors/sugar-bee-flowers/01.jpg",
    "music-performance": "/images/vendors/invictus-quartet/00.jpg",
  },
  journal: [
    "/images/hero/yong-video-productions-03.jpg",
    "/images/vendors/right-click-moments/00.jpg",
    "/images/vendors/katrina-lai/04.jpg",
  ],
} as const;
