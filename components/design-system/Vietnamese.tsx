import localFont from "next/font/local";
import { Stage } from "./parts";

// Neue Montreal v1 has 50 of Vietnamese's 146 letters. These copies add the other 96, built from the
// font's own accents plus a drawn hook, horn and dot below. Preview only: loaded on this page and
// nowhere else, until EMW decides between licensing v3 and a fallback font.
const built = localFont({
  src: [
    { path: "./fonts/NeueMontreal-vietnamese-regular.otf", weight: "400", style: "normal" },
    { path: "./fonts/NeueMontreal-vietnamese-italic.otf", weight: "400", style: "italic" },
    { path: "./fonts/NeueMontreal-vietnamese-medium.otf", weight: "500", style: "normal" },
  ],
  display: "swap",
  preload: false,
});

const sample = "Nguyễn Thị Phượng, Trần Đức Việt. Tiệc cưới ở Hội An, ảnh cưới ở Sài Gòn.";
const vowels = "aăâeêioôơuưy";
const tones = ["", "̀", "́", "̉", "̃", "̣"];
const rows = (upper: boolean) =>
  [...vowels].map((v) => tones.map((t) => (upper ? v.toUpperCase() : v).concat(t).normalize("NFC")).join(" "));

export function Vietnamese() {
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Stage ground="paper" className="p-[clamp(1.25rem,3vw,2.5rem)]" caption="Vietnamese today: missing letters come from another font">
          <p lang="vi" className="font-sans text-[clamp(1.5rem,2.6vw,2rem)] leading-snug tracking-[-0.01em]">
            {sample}
          </p>
        </Stage>
        <Stage ground="paper" className="p-[clamp(1.25rem,3vw,2.5rem)]" caption="Vietnamese with the built letters (preview)">
          <p lang="vi" className={`${built.className} text-[clamp(1.5rem,2.6vw,2rem)] leading-snug tracking-[-0.01em]`}>
            {sample}
          </p>
        </Stage>
      </div>

      <Stage ground="soft" className="p-[clamp(1.25rem,3vw,2.5rem)]" caption="Every Vietnamese vowel in the built letters: regular, italic, medium">
        <div lang="vi" className={`${built.className} grid grid-cols-1 gap-x-10 gap-y-6 text-[1.375rem] leading-relaxed sm:grid-cols-2 xl:grid-cols-3`}>
          {[
            { label: "Regular", className: "" },
            { label: "Italic", className: "italic" },
            { label: "Medium", className: "font-medium" },
          ].map((s) => (
            <div key={s.label} className={s.className}>
              {[...rows(false), ...rows(true), "đ Đ"].map((r) => (
                <p key={r}>{r}</p>
              ))}
            </div>
          ))}
        </div>
      </Stage>
    </div>
  );
}
