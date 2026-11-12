import { cacheLife } from "next/cache";
import { type Place, stateCode } from "@/lib/enquiry-fields";

/*
 * Venue search for the Enquire form. A couple types a venue, suburb or city and gets up to five
 * places with their addresses, from Photon (OpenStreetMap, no key). The search runs from our
 * server so the couple's browser talks only to us. Results lean towards Melbourne but cover
 * anywhere; a venue in an Australian state brings its state code for the enquiry's region.
 */

type Feature = { properties: Record<string, string | undefined> };

/** The same query within a day gets the same answer, so a busy form doesn't hammer the free service. */
async function search(q: string): Promise<Place[]> {
  "use cache";
  cacheLife("days");
  const url = new URL("https://photon.komoot.io/api/");
  url.search = new URLSearchParams({ q, limit: "6", lang: "en", lat: "-37.81", lon: "144.96" }).toString();
  const res = await fetch(url, { headers: { "User-Agent": "EastMeetsWed/1.0 (venue search)" }, signal: AbortSignal.timeout(4000) });
  if (!res.ok) return [];
  const { features = [] } = (await res.json()) as { features?: Feature[] };
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const { properties: p } of features) {
    if (!p.name) continue;
    const street = [p.housenumber, p.street].filter(Boolean).join(" ");
    const area = [p.district ?? p.locality ?? p.city, [p.countrycode === "AU" ? stateCode(p.state) : p.state, p.postcode].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ");
    const address = [street, area, p.countrycode === "AU" ? "" : p.country].filter(Boolean).join(", ");
    const key = `${p.name}|${address}`;
    if (seen.has(key) || address === p.name) continue;
    seen.add(key);
    places.push({ name: p.name, address, region: p.countrycode === "AU" ? stateCode(p.state) : undefined });
    if (places.length === 5) break;
  }
  return places;
}

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
  if (q.length < 3) return Response.json([]);
  try {
    return Response.json(await search(q.toLowerCase()));
  } catch {
    return Response.json([]);
  }
}
