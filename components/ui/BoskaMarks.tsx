import { Fragment } from "react";

/* Boska has the Vietnamese base letters (ê, â, ô, ă) and the spacing accents, but not the stacked
   letters (ế, ệ…), which a browser would draw from a fallback sans. This sets each tone mark from
   Boska's own accent glyphs over Boska's base letter, so the word stays in one face. Hook above and
   the horned ơ/ư have no Boska glyph and are left to the fallback. */
const ABOVE: Record<string, string> = { "́": "´", "̀": "`", "̃": "˜" };
const DOT_BELOW = "̣";
const HAT = /[̂̆]/; // circumflex, breve: the tone sits beside it, a little higher

export function BoskaMarks({ text }: { text: string }) {
  const clusters = text.normalize("NFD").match(/\P{M}\p{M}*/gu) ?? [];
  return (
    <>
      <span aria-hidden>
        {clusters.map((c, i) => {
          const marks = [...c.slice(1)];
          const above = marks.find((m) => m in ABOVE);
          const below = marks.includes(DOT_BELOW);
          const rest = marks.filter((m) => !(m in ABOVE) && m !== DOT_BELOW);
          if ((!above && !below) || rest.some((m) => !HAT.test(m))) {
            return <Fragment key={i}>{c.normalize("NFC")}</Fragment>;
          }
          const hat = rest.length > 0;
          return (
            <span key={i} className="relative inline-block">
              {(c[0] + rest.join("")).normalize("NFC")}
              {above && (
                <span
                  className="absolute"
                  style={hat ? { left: "48%", top: "-0.17em" } : { left: "50%", top: 0, translate: "-50% 0" }}
                >
                  {ABOVE[above]}
                </span>
              )}
              {below && (
                <span className="absolute left-1/2 -translate-x-1/2" style={{ top: "0.77em" }}>
                  {"˙"}
                </span>
              )}
            </span>
          );
        })}
      </span>
      <span className="sr-only">{text}</span>
    </>
  );
}
