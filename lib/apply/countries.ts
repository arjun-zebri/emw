/*
 * Countries for the phone field: Australia first, then the places East Meets Wed's vendors and
 * couples most often call home, then the rest of the usual suspects. Flags are the emoji drawn from
 * each ISO code, so there are no image files to keep.
 */

export type Country = { code: string; name: string; dial: string };

export const countries: Country[] = [
  { code: "AU", name: "Australia", dial: "+61" },
  { code: "NZ", name: "New Zealand", dial: "+64" },
  { code: "CN", name: "China", dial: "+86" },
  { code: "HK", name: "Hong Kong", dial: "+852" },
  { code: "TW", name: "Taiwan", dial: "+886" },
  { code: "VN", name: "Vietnam", dial: "+84" },
  { code: "SG", name: "Singapore", dial: "+65" },
  { code: "MY", name: "Malaysia", dial: "+60" },
  { code: "ID", name: "Indonesia", dial: "+62" },
  { code: "PH", name: "Philippines", dial: "+63" },
  { code: "TH", name: "Thailand", dial: "+66" },
  { code: "KR", name: "South Korea", dial: "+82" },
  { code: "JP", name: "Japan", dial: "+81" },
  { code: "KH", name: "Cambodia", dial: "+855" },
  { code: "IN", name: "India", dial: "+91" },
  { code: "LK", name: "Sri Lanka", dial: "+94" },
  { code: "GB", name: "United Kingdom", dial: "+44" },
  { code: "US", name: "United States", dial: "+1" },
  { code: "CA", name: "Canada", dial: "+1" },
];

export function countryByCode(code: string): Country;
export function countryByCode(code: string, fallback: null): Country | null;
export function countryByCode(code: string, fallback: Country | null = countries[0]) {
  return countries.find((c) => c.code === code) ?? fallback;
}

export const flag = (code: string) => String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));

/**
 * The number after the country code, spaced the way people say it. Australian mobiles in threes
 * ("412 345 678"), Australian landlines after the area digit ("3 9123 4567"); anywhere else in threes.
 */
export function formatPhone(digits: string, country = "AU") {
  const d = digits.replace(/\D/g, "");
  if (country === "AU") {
    const groups = d.startsWith("4") || d.length < 2 ? [3, 3, 3] : [1, 4, 4];
    const out: string[] = [];
    let i = 0;
    for (const g of groups) if (i < d.length) out.push(d.slice(i, (i += g)));
    if (i < d.length) out.push(d.slice(i));
    return out.join(" ");
  }
  return d.replace(/(\d{3})(?=\d)/g, "$1 ");
}
