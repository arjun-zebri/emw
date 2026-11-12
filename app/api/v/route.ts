import { createClient } from "@supabase/supabase-js";
import { after, type NextRequest } from "next/server";
import { BOT_UA } from "@/lib/bots";
import type { Database } from "@/lib/supabase/database.types";
import { senderIp } from "@/lib/throttle";

/*
 * The site's own visitor counter (components/site/Analytics.tsx sends here). One message per page
 * view or directory search, checked and recorded in Supabase (record_page_view,
 * record_site_search in supabase/migrations/20261112500000_site_analytics.sql).
 *
 * It always answers at once with an empty 204, before anything is recorded, and anything it
 * doesn't like is dropped without a word: counting must never slow a page or trouble a visitor.
 * Left out: other sites, crawlers and scripts, signed-in team and vendors, pages we don't have.
 * The visitor's IP and browser string go to the database only to make the day's visitor code;
 * they are never stored.
 */

const PAGES = /^\/$|^\/vendors$|^\/vendors\/[a-z0-9]+(-[a-z0-9]+)*$|^\/list-your-business$|^\/privacy-policy$|^\/terms-and-conditions$/;
const MAX_BODY = 1024;

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
};

const nothing = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

/** The sending site's host, like "instagram.com"; empty for our own site, or nothing usable. */
function referrerHost(raw: unknown, ownHost: string) {
  if (typeof raw !== "string" || !raw || raw.length > 2000) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return host === ownHost.replace(/^www\./, "") || host.length > 100 ? "" : host;
  } catch {
    return "";
  }
}

const campaign = (raw: unknown) => (typeof raw === "string" && /^[a-z0-9._ -]{1,50}$/i.test(raw.trim()) ? raw.trim().toLowerCase() : "");

function device(ua: string) {
  if (/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return "phone";
  return "desktop";
}

/** Directory search words, as typed but tidied; nothing that looks like an email, phone number or address on the web. */
function searchWords(raw: unknown) {
  if (typeof raw !== "string") return "";
  const q = raw.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
  if (q.length < 2 || q.length > 80) return "";
  if (/@|https?:|www\./.test(q) || /\d{6,}/.test(q.replace(/[\s()+.-]/g, ""))) return "";
  return q;
}

/** Vercel's location headers. Absent locally. */
function place(h: Headers) {
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

export async function POST(request: NextRequest) {
  const h = request.headers;

  // Only our own pages: the browser says where a request comes from, and a page can't change it.
  const site = h.get("sec-fetch-site");
  const origin = h.get("origin");
  const host = h.get("host") ?? "";
  if (site ? site !== "same-origin" : !origin || hostOf(origin) !== host) return nothing();

  const ua = h.get("user-agent") ?? "";
  if (!ua || ua.length > 500 || BOT_UA.test(ua) || !h.get("accept-language")) return nothing();

  // The team and vendors, signed in, would only inflate the figures.
  if (request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"))) return nothing();

  if (Number(h.get("content-length") ?? 0) > MAX_BODY) return nothing();
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return nothing();
    body = JSON.parse(text);
    if (!body || typeof body !== "object") return nothing();
  } catch {
    return nothing();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return nothing();

  const ip = await senderIp();
  const ident = `${ip}|${ua}`;

  let record: (() => PromiseLike<{ error: { message: string } | null }>) | undefined;
  const db = () => createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  if (body.t === "view" && typeof body.p === "string" && body.p.length <= 200 && PAGES.test(body.p)) {
    const path = body.p;
    const where = place(h);
    record = () =>
      db()
        .rpc("record_page_view", {
          p_ident: ident,
          p_path: path,
          p_referrer: referrerHost(body.r, host.split(":")[0]),
          p_campaign: campaign(body.c),
          p_country: where.country,
          p_region: where.region,
          p_city: where.city,
          p_device: device(ua),
        })
        .abortSignal(AbortSignal.timeout(2000));
  } else if (body.t === "search") {
    const q = searchWords(body.q);
    const n = Number(body.n);
    if (q && Number.isInteger(n) && n >= 0 && n <= 10_000) record = () => db().rpc("record_site_search", { p_ident: ident, p_query: q, p_matches: n }).abortSignal(AbortSignal.timeout(2000));
  }

  if (record) {
    const run = record;
    after(async () => {
      try {
        const { error } = await run();
        if (error) console.error(`[analytics] ${error.message}`);
      } catch {
        // Timed out or unreachable: the view is lost, the visitor never knows.
      }
    });
  }
  return nothing();
}
