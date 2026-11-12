import { after, type NextRequest } from "next/server";
import { BOT_UA } from "@/lib/bots";
import { report } from "@/lib/observe/report";
import { AREAS, type Area, browserOf, isPublic, routeOf } from "@/lib/observe/scrub";
import { allow, senderIp } from "@/lib/throttle";

/*
 * Errors from browsers (lib/observe/client.ts sends here). Like the visitor counter (app/api/v):
 * it answers at once with an empty 204 and drops anything it doesn't like without a word. Unlike
 * it, signed-in people count: an admin page breaking for the team matters. At most 30 reports an
 * hour from one IP, so no one can fill the table or the developer's inbox.
 */

const MAX_BODY = 4096;
const PER_HOUR = 30;

const nothing = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
const text = (v: unknown, max: number) => (typeof v === "string" && v.length <= max ? v : "");
const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
};

export async function POST(request: NextRequest) {
  const h = request.headers;
  const site = h.get("sec-fetch-site");
  const origin = h.get("origin");
  const host = h.get("host") ?? "";
  if (site ? site !== "same-origin" : !origin || hostOf(origin) !== host) return nothing();

  const ua = h.get("user-agent") ?? "";
  if (!ua || ua.length > 500 || BOT_UA.test(ua)) return nothing();

  if (Number(h.get("content-length") ?? 0) > MAX_BODY) return nothing();
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return nothing();
    body = JSON.parse(raw);
    if (!body || typeof body !== "object") return nothing();
  } catch {
    return nothing();
  }

  const message = text(body.m, 500);
  const path = text(body.p, 200);
  if (!message || !path.startsWith("/")) return nothing();
  const area: Area = AREAS.includes(body.a as Area) ? (body.a as Area) : "browser";
  const route = routeOf(path);
  const error = Object.assign(new Error(message), { name: text(body.n, 60) || "Error", stack: text(body.s, 2500) || undefined });
  const digest = text(body.d, 100) || undefined;
  // The browser sent this as a beacon and isn't waiting, so counting it first slows no one.
  if (!(await allow("client-error", [{ key: await senderIp(), perHour: PER_HOUR }]))) return nothing();

  after(async () => {
    await report(error, {
      area,
      source: "client",
      // A public page showing its error screen to a couple is urgent; anything else can wait.
      severity: area === "page" && isPublic(route) ? "urgent" : "normal",
      route,
      digest,
      browser: browserOf(ua),
    });
  });
  return nothing();
}
