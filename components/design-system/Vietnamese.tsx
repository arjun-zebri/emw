import { Stage } from "./parts";

// Neue Montreal v1 shipped with 50 of Vietnamese's 146 letters. Our copies in app/fonts add the other
// 96 (regular, italic, medium), built from the font's own accents plus a drawn hook, horn and dot below.
const sample = "Nguyễn Thị Phượng, Trần Đức Việt. Tiệc cưới ở Hội An, ảnh cưới ở Sài Gòn.";
const vowels = "aăâeêioôơuưy";
const tones = ["", "̀", "́", "̉", "̃", "̣"];
const rows = (upper: boolean) =>
  [...vowels].map((v) => tones.map((t) => (upper ? v.toUpperCase() : v).concat(t).normalize("NFC")).join(" "));

export function Vietnamese() {
  return (
    <div className="grid grid-cols-1 gap-4">
      <Stage ground="paper" className="p-[clamp(1.25rem,3vw,2.5rem)]" caption="Vietnamese in Neue Montreal">
        <p lang="vi" className="font-sans text-[clamp(1.5rem,2.6vw,2rem)] leading-snug tracking-[-0.01em]">
          {sample}
        </p>
      </Stage>

      <Stage ground="soft" className="p-[clamp(1.25rem,3vw,2.5rem)]" caption="Every Vietnamese vowel: regular, italic, medium">
        <div lang="vi" className="grid grid-cols-1 gap-x-10 gap-y-6 font-sans text-[1.375rem] leading-relaxed sm:grid-cols-2 xl:grid-cols-3">
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
