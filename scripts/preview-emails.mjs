/*
 * Renders the three application emails with a real published vendor from the database (read only,
 * publishable key) and writes them as HTML files to look at in a browser.
 *
 *   node --env-file=.env.local --experimental-strip-types scripts/preview-emails.mjs [slug] [out dir]
 *
 * Defaults: katrina-lai, ./email-previews. Links and the monogram point at http://localhost:3000,
 * so run the dev server to see the logo.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { applicationAdmin, applicationReceived, listingLive } from "../lib/email/templates.ts";

const slug = process.argv[2] || "katrina-lai";
const out = process.argv[3] || "email-previews";
const origin = "http://localhost:3000";
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const res = await fetch(`${base}/rest/v1/vendors?slug=eq.${encodeURIComponent(slug)}&select=*,vendor_photos(path,position,width,height)`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
const [v] = await res.json();
if (!v) throw new Error(`No published vendor called ${slug}`);

const photos = [...v.vendor_photos]
  .sort((a, b) => a.position - b.position)
  .map((p) => ({ src: `${base}/storage/v1/object/public/vendor-photos/${p.path.replace(/\.jpg$/, "@1200.jpg")}`, width: p.width, height: p.height }));
const first = (v.person ?? "").trim().split(/\s+/)[0] ?? "";
const card = { name: v.name, line: v.discipline, photo: photos[0] };

const emails = {
  "1-admin-new-application": applicationAdmin({
    origin,
    business: v.name,
    person: v.person ?? "Someone",
    email: v.email ?? "vendor@example.com",
    phone: v.phone ?? "+61 4123 4567 8",
    discipline: v.discipline,
    services: v.services,
    languages: v.languages,
    based: v.based ?? undefined,
    travels: v.service_area.join(", "),
    website: v.website ?? undefined,
    instagram: v.instagram ?? undefined,
    facebook: v.facebook ?? undefined,
    story: v.story,
    notes: ["Applied through the website on 5 November 2026.", "Also works in: Hindi."],
    photos,
    photoCount: photos.length,
  }),
  "2-vendor-received": applicationReceived({ origin, first, card }),
  "3-vendor-live": listingLive({ origin, first, card, url: `${origin}/vendors/${v.slug}` }),
};

mkdirSync(out, { recursive: true });
for (const [name, e] of Object.entries(emails)) {
  writeFileSync(path.join(out, `${name}.html`), e.html);
  writeFileSync(path.join(out, `${name}.txt`), `Subject: ${e.subject}\n\n${e.text}`);
  console.log(path.join(out, `${name}.html`), "·", e.subject);
}
