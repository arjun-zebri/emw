import { headers } from "next/headers";
import { senderIp } from "./throttle";

/*
 * What the visitor counter needs to know about a request, shared by app/api/v (page views,
 * searches, filters) and the enquiry form (lib/enquiries-actions.ts), so an enquiry lands on the
 * same visit as the pages before it. Server only.
 */

/** IP and browser string, scrambled in the database into the day's visitor code and never stored. */
export async function visitorIdent() {
  return `${await senderIp()}|${(await headers()).get("user-agent") ?? ""}`;
}

/** Country, region and city from Vercel's location headers. Absent locally. */
export function visitorPlace(h: Headers) {
  const get = (name: string, max: number) => {
    try {
      const v = decodeURIComponent(h.get(name) ?? "").trim();
      return v.length <= max ? v : "";
    } catch {
      return "";
    }
  };
  return { country: get("x-vercel-ip-country", 2), region: get("x-vercel-ip-country-region", 10), city: get("x-vercel-ip-city", 100) };
}
