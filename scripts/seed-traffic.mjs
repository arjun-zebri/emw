// Fills Admin → Traffic and Admin → Enquiries on the staging database with 60 days of made-up
// visits and enquiries, so the pages can be seen as they will look once the site has been live a
// while. Staging only.
//
//   node --env-file=.env.local scripts/seed-traffic.mjs            add the test visits
//   node --env-file=.env.local scripts/seed-traffic.mjs --remove   take every one of them out again
//
// Every made-up visitor's code starts with 5eed5eed5eed, which real codes (random) never do in
// practice, and every made-up enquiry is from an @example.com address (a domain reserved for
// examples, so no real couple has one), so --remove deletes exactly these and nothing real. Running it again first removes the
// last batch. Vendor profile stats (vendor_views) are left alone, so no vendor's own dashboard
// shows made-up views. The figures are fictional: they must never reach the public site or the
// production database.

import { createClient } from "@supabase/supabase-js";

const STAGING = "nntjkiknekpolkftejnm";
const MARK = "5eed5eed5eed";
const DAYS = 60;

if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes(STAGING)) throw new Error("Test traffic is for the staging database only.");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

async function remove() {
  for (const t of ["page_views", "site_searches", "site_filters"]) {
    const { count, error } = await db.from(t).delete({ count: "exact" }).like("visitor", `${MARK}%`);
    if (error) throw error;
    console.log(`Removed ${count} test rows from ${t}`);
  }
  const { count, error } = await db.from("enquiries").delete({ count: "exact" }).like("email", "%@example.com");
  if (error) throw error;
  console.log(`Removed ${count} test enquiries`);
}

await remove();
if (process.argv.includes("--remove")) process.exit(0);

// ── The made-up world ───────────────────────────────────────────────────

let seed = 20261116;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pickWeighted = (items) => {
  const total = items.reduce((a, i) => a + i.w, 0);
  let r = rnd() * total;
  for (const i of items) if ((r -= i.w) <= 0) return i;
  return items.at(-1);
};
const hex = (n) => Array.from({ length: n }, () => Math.floor(rnd() * 16).toString(16)).join("");

const places = [
  { country: "AU", region: "VIC", city: "Melbourne", lat: -37.8, lon: 145.0, w: 30 },
  { country: "AU", region: "VIC", city: "Geelong", lat: -38.1, lon: 144.4, w: 3 },
  { country: "AU", region: "VIC", city: "Ballarat", lat: -37.6, lon: 143.9, w: 1.5 },
  { country: "AU", region: "VIC", city: "Bendigo", lat: -36.8, lon: 144.3, w: 1 },
  { country: "AU", region: "NSW", city: "Sydney", lat: -33.9, lon: 151.2, w: 20 },
  { country: "AU", region: "NSW", city: "Newcastle", lat: -32.9, lon: 151.8, w: 2 },
  { country: "AU", region: "NSW", city: "Wollongong", lat: -34.4, lon: 150.9, w: 1.5 },
  { country: "AU", region: "QLD", city: "Brisbane", lat: -27.5, lon: 153.0, w: 9 },
  { country: "AU", region: "QLD", city: "Gold Coast", lat: -28.0, lon: 153.4, w: 3 },
  { country: "AU", region: "QLD", city: "Cairns", lat: -16.9, lon: 145.8, w: 0.7 },
  { country: "AU", region: "QLD", city: "Townsville", lat: -19.3, lon: 146.8, w: 0.5 },
  { country: "AU", region: "WA", city: "Perth", lat: -31.9, lon: 115.9, w: 7 },
  { country: "AU", region: "SA", city: "Adelaide", lat: -34.9, lon: 138.6, w: 5 },
  { country: "AU", region: "ACT", city: "Canberra", lat: -35.3, lon: 149.1, w: 3 },
  { country: "AU", region: "TAS", city: "Hobart", lat: -42.9, lon: 147.3, w: 1.2 },
  { country: "AU", region: "TAS", city: "Launceston", lat: -41.4, lon: 147.1, w: 0.5 },
  { country: "AU", region: "NT", city: "Darwin", lat: -12.5, lon: 130.8, w: 0.8 },
  { country: "NZ", region: "AUK", city: "Auckland", lat: -36.8, lon: 174.8, w: 1.5 },
  { country: "SG", region: "", city: "Singapore", lat: 1.3, lon: 103.8, w: 1 },
  { country: "GB", region: "ENG", city: "London", lat: 51.5, lon: -0.1, w: 0.8 },
  { country: "US", region: "CA", city: "Los Angeles", lat: 34.1, lon: -118.2, w: 0.6 },
  { country: "VN", region: "SG", city: "Ho Chi Minh City", lat: 10.8, lon: 106.7, w: 0.6 },
];

const sources = [
  { ref: "google.com.au", w: 30 },
  { ref: "google.com", w: 10 },
  { ref: "bing.com", w: 2 },
  { ref: "duckduckgo.com", w: 1 },
  { ref: "instagram.com", w: 14, tags: ["insta-bio", "nov-reel"] },
  { ref: "facebook.com", w: 6, tags: ["fb-group"] },
  { ref: "pinterest.com", w: 4 },
  { ref: "pinterest.com.au", w: 1 },
  { ref: "tiktok.com", w: 2 },
  { ref: "mail.google.com", w: 1, tags: ["nov-newsletter"] },
  { ref: "easyweddings.com.au", w: 3 },
  { ref: "hellomay.com.au", w: 2 },
  { ref: "", w: 20 },
];

const searches = [
  { q: "photographer", m: 6, w: 8 },
  { q: "tea ceremony", m: 3, w: 6 },
  { q: "vietnamese", m: 5, w: 5 },
  { q: "lion dance", m: 1, w: 4 },
  { q: "celebrant", m: 4, w: 4 },
  { q: "makeup", m: 3, w: 3 },
  { q: "korean hanbok", m: 0, w: 3 },
  { q: "mehndi", m: 0, w: 3 },
  { q: "ao dai", m: 0, w: 2 },
  { q: "cantonese mc", m: 1, w: 2 },
  { q: "dumpling catering", m: 0, w: 2 },
  { q: "qipao", m: 0, w: 1.5 },
  { q: "harp", m: 1, w: 1 },
  { q: "filipino band", m: 0, w: 1 },
];

const filterChoices = {
  language: ["Vietnamese", "Cantonese", "Mandarin", "Korean", "Filipino", "Indonesian", "Japanese", "Thai", "Teochew", "Hakka", "Other"],
  category: ["photo-film", "beauty-attire", "ceremony", "music-performance", "venues-hire", "food-cake", "flowers-paper", "planning-styling"],
  location: ["VIC", "NSW", "QLD", "WA", "SA", "ACT", "TAS", "NT", "AUS"],
  service: ["Photographer", "Videographer", "Hair & Makeup", "Celebrant", "MC", "Florist", "Venue", "Catering", "Cakes and Desserts", "Music"],
};

const vendors = must(await db.from("vendors").select("id, slug").eq("status", "published").order("slug"));
// A few listings get most of the attention, as on any directory.
const popular = vendors.map((v, i) => ({ ...v, w: 1 / Math.pow(((i * 7) % vendors.length) + 1, 0.8) }));

// ── 60 days of visits ───────────────────────────────────────────────────

const melToday = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
const dayAt = (n) => new Date(Date.parse(`${melToday}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);
// Melbourne is 11 hours ahead of UTC in November.
const when = (day, hour, minute) => new Date(Date.parse(`${day}T00:00:00Z`) + ((hour - 11) * 60 + minute) * 60_000).toISOString();

const nowHour = Number(new Date().toLocaleTimeString("en-AU", { timeZone: "Australia/Melbourne", hour: "numeric", hour12: false }));

const views = [];
const searchRows = [];
const filterRows = [];

for (let d = DAYS - 1; d >= 0; d--) {
  const day = dayAt(d);
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  const growth = 22 + (DAYS - d) * 0.75;
  const weekend = weekday === 0 ? 1.35 : weekday === 6 ? 1.2 : 1;
  const visits = Math.round(growth * weekend * (0.8 + rnd() * 0.4));
  for (let v = 0; v < visits; v++) {
    const visitor = MARK + hex(20);
    const place = pickWeighted(places);
    const source = pickWeighted(sources);
    const campaign = source.tags && rnd() < 0.3 ? source.tags[Math.floor(rnd() * source.tags.length)] : null;
    const device = rnd() < 0.68 ? "phone" : rnd() < 0.15 ? "tablet" : "desktop";
    // Evenings are busiest.
    let hour = Math.floor(7 + Math.pow(rnd(), 0.6) * 16);
    const minute = Math.floor(rnd() * 50);
    // Today's visits all happened before now (and not in the last 10 minutes, so "on the site now" stays real).
    if (d === 0) hour = Math.min(hour, Math.max(0, nowHour - 1));
    const r = rnd();
    const landing = r < 0.32 ? "/" : r < 0.55 ? "/vendors" : r < 0.57 ? "/list-your-business" : `/vendors/${pickWeighted(popular).slug}`;
    const pages = [landing];
    const more = Math.floor(Math.pow(rnd(), 1.4) * 6);
    for (let p = 0; p < more; p++) pages.push(rnd() < 0.8 ? `/vendors/${pickWeighted(popular).slug}` : "/vendors");
    pages.forEach((path, i) => {
      const vendor = path.startsWith("/vendors/") ? vendors.find((x) => x.slug === path.slice(9)) : null;
      views.push({
        at: when(day, hour, Math.min(59, minute + i * 2)),
        day,
        path,
        vendor_id: vendor?.id ?? null,
        visitor,
        new_visit: i === 0,
        referrer: source.ref || null,
        campaign,
        country: place.country,
        region: place.region || null,
        city: place.city,
        device,
        lat: place.lat,
        lon: place.lon,
      });
    });
    if (rnd() < 0.25) {
      const s = pickWeighted(searches);
      searchRows.push({ at: when(day, hour, minute + 1), day, query: s.q, matches: s.m, visitor });
    }
    for (const [kind, odds] of [["language", 0.35], ["category", 0.3], ["location", 0.2], ["service", 0.1]]) {
      if (rnd() < odds) {
        const list = filterChoices[kind];
        const value = list[Math.floor(Math.pow(rnd(), 1.6) * list.length)];
        filterRows.push({ at: when(day, hour, minute + 1), day, visitor, kind, value });
      }
    }
  }
}

const insert = async (table, rows) => {
  for (let i = 0; i < rows.length; i += 500) must(await db.from(table).insert(rows.slice(i, i + 500)));
  console.log(`Added ${rows.length} test rows to ${table}`);
};
// ── Enquiries ───────────────────────────────────────────────────────────
// Never emailed (they go straight into the table), and no vendor on staging has an account, so
// they reach no one. Spread over the same 60 days, to the listings couples view most.

const couples = ["Linh & James", "Priya & Tom", "Mei & Daniel", "Sarah & Kenji", "Anh & Michael", "Grace & Ravi", "Jess & Hyun-woo", "Mai & Liam", "Chloe & Arjun", "Nina & Sam", "Hana & Oliver", "Ruby & Wei", "Isla & Rohan", "Kim & Ethan", "Thao & Ben"];
const messages = [
  "We're planning a two-day wedding with a tea ceremony in the morning and a reception at night. Would love to know if you're free and what your packages look like.",
  "Hi, we loved your work on the site. Could you send through pricing for a half day? Our families speak Cantonese and English.",
  "We're having a small ceremony followed by a banquet. Are you available on our date?",
  "Looking for someone who understands both of our traditions. Can we set up a call?",
  "Could you let us know your availability and rough costs? Thank you.",
];
const cultures = ["Chinese", "Vietnamese", "Indian", "Korean", "Filipino", "Australian", "Japanese", "Malaysian", "European"];
const enquiries = [];
for (let d = DAYS - 1; d >= 0; d--) {
  const day = dayAt(d);
  const n = Math.round((0.6 + (DAYS - d) * 0.045) * (0.5 + rnd()));
  for (let i = 0; i < n; i++) {
    const couple = couples[Math.floor(rnd() * couples.length)];
    const vendor = pickWeighted(popular);
    const wedding = new Date(Date.parse(`${day}T00:00:00Z`) + (120 + Math.floor(rnd() * 420)) * 86_400_000).toISOString().slice(0, 10);
    const src = pickWeighted([
      { s: "search", w: 25, detail: ["photographer", "tea ceremony", "celebrant", "makeup"] },
      { s: "directory", w: 30, detail: ["Photography & Film", "Beauty & Attire", "Music & Performance"] },
      { s: "home", w: 10 },
      { s: "listing", w: 8 },
      { s: "elsewhere", w: 15, detail: ["Instagram", "Google", "Facebook", "Pinterest"] },
      { s: "direct", w: 12 },
    ]);
    const hour = d === 0 ? Math.min(19, Math.max(0, nowHour - 1)) : 8 + Math.floor(rnd() * 14);
    const two = [cultures[Math.floor(rnd() * cultures.length)], cultures[Math.floor(rnd() * cultures.length)]];
    enquiries.push({
      vendor_id: vendor.id,
      name: couple,
      email: `${couple.toLowerCase().replace(/[^a-z]+/g, ".")}.${hex(4)}@example.com`,
      wedding_date: wedding,
      region: pickWeighted([{ r: "VIC", w: 45 }, { r: "NSW", w: 25 }, { r: "QLD", w: 12 }, { r: "WA", w: 8 }, { r: "SA", w: 5 }, { r: "ACT", w: 5 }]).r,
      venue: ["A garden venue in the Yarra Valley", "Banquet hall in the city", "Family home, then a restaurant", "Winery near Geelong", "Beachside reception"][Math.floor(rnd() * 5)],
      cultures: [...new Set(two)],
      guests: String(40 + Math.floor(rnd() * 300)),
      message: messages[Math.floor(rnd() * messages.length)],
      source: src.s,
      source_detail: src.detail ? src.detail[Math.floor(rnd() * src.detail.length)] : null,
      read_at: d > 3 || rnd() < 0.4 ? when(day, hour + 2, 0) : null,
      created_at: when(day, hour, Math.floor(rnd() * 59)),
    });
  }
}

await insert("page_views", views);
await insert("site_searches", searchRows);
await insert("site_filters", filterRows);
await insert("enquiries", enquiries);
console.log(`\n${DAYS} days of test traffic and enquiries, ${dayAt(DAYS - 1)} to ${melToday}. Remove them with --remove.`);
