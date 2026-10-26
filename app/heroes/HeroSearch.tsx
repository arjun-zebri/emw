"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { languages } from "@/data/taxonomy";
import type { CraftId, Language } from "@/data/types";

const crafts: { id: CraftId | ""; noun: string }[] = [
  { id: "", noun: "wedding vendor" },
  { id: "ceremony", noun: "celebrant or MC" },
  { id: "photo-film", noun: "photographer" },
  { id: "beauty-attire", noun: "hair and makeup artist" },
  { id: "flowers-paper", noun: "florist" },
  { id: "music-performance", noun: "musician" },
];

const langs = (Object.keys(languages) as Language[]).filter((l) => l !== "English");

/** "Find a ___ who speaks ___", where the blanks are selects that filter the directory. */
export function HeroSearch() {
  const router = useRouter();
  const [craft, setCraft] = useState<CraftId | "">("");
  const [lang, setLang] = useState<Language | "">("");
  const select =
    "[field-sizing:content] appearance-none cursor-pointer border-b border-paper/50 bg-transparent pr-1 italic transition-colors hover:border-paper focus:border-paper focus:outline-none [&>option]:text-ink";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const p = new URLSearchParams();
        if (craft) p.set("craft", craft);
        if (lang) p.set("lang", lang);
        router.push(`/vendors${p.size ? `?${p}` : ""}`);
      }}
      className="max-w-[58rem]"
    >
      <p className="font-display text-[clamp(2.4rem,5vw,5.25rem)] leading-[1.1] tracking-[-0.03em]">
        Find a{" "}
        <label className="sr-only" htmlFor="hs-craft">
          Kind of vendor
        </label>
        <select id="hs-craft" value={craft} onChange={(e) => setCraft(e.target.value as CraftId | "")} className={select}>
          {crafts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.noun}
            </option>
          ))}
        </select>{" "}
        who speaks{" "}
        <label className="sr-only" htmlFor="hs-lang">
          Language
        </label>
        <select id="hs-lang" value={lang} onChange={(e) => setLang(e.target.value as Language | "")} className={select}>
          <option value="">your language</option>
          {langs.map((l) => (
            <option key={l} value={l}>
              {languages[l].native === l ? l : `${languages[l].native} ${l}`}
            </option>
          ))}
        </select>
      </p>
      <button type="submit" className="t-nav mt-10 inline-flex h-12 items-center gap-3 bg-paper px-7 text-ink transition-colors hover:bg-paper/85">
        Search <Icon name="arrow" className="size-3.5" />
      </button>
    </form>
  );
}
