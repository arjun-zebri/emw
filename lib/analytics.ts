import { headers } from "next/headers";
import { senderIp } from "./throttle";

/*
 * What the visitor counter (app/api/v) needs to know about a request. Server only.
 */

/** IP and browser string, scrambled in the database into the day's visitor code and never stored. */
export async function visitorIdent() {
  return `${await senderIp()}|${(await headers()).get("user-agent") ?? ""}`;
}

/**
 * Country, region and city from Vercel's location headers, and the city's rough position for the
 * map, rounded to one decimal place (about 10 km). Absent locally.
 */
export function visitorPlace(h: Headers) {
  const get = (name: string, max: number) => {
    try {
      const v = decodeURIComponent(h.get(name) ?? "").trim();
      return v.length <= max ? v : "";
    } catch {
      return "";
    }
  };
  const coord = (name: string, max: number) => {
    const n = Number(h.get(name));
    return h.get(name) && Number.isFinite(n) && Math.abs(n) <= max ? Math.round(n * 10) / 10 : undefined;
  };
  return {
    country: get("x-vercel-ip-country", 2),
    region: get("x-vercel-ip-country-region", 10),
    city: get("x-vercel-ip-city", 100),
    lat: coord("x-vercel-ip-latitude", 90),
    lon: coord("x-vercel-ip-longitude", 180),
  };
}
