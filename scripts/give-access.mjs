// Gives someone access to a vendor's listing in the portal: makes their account if it doesn't
// exist (confirmed, with no password) and links it to the listing. They then sign in from /login
// with "Set or reset your password", which emails them a link, or with Google or Microsoft if
// that address is a Google or Microsoft account. Nothing is emailed by this script.
//
//   node --env-file=.env.local scripts/give-access.mjs someone@example.com katrina-lai
//
// .env.local points at the staging database. For the live one, pull its settings first:
//   vercel env pull .env.production.local --environment production
//   node --env-file=.env.production.local scripts/give-access.mjs someone@example.com katrina-lai
//
// One listing per account. Run it again with another slug to move the account to that listing.

import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
const slug = process.argv[3]?.trim();
if (!email?.includes("@") || !slug) throw new Error("Usage: node --env-file=.env.local scripts/give-access.mjs <email> <vendor-slug>");

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];

const { data: vendor, error: vendorError } = await db.from("vendors").select("id, name, status").eq("slug", slug).maybeSingle();
if (vendorError) throw vendorError;
if (!vendor) throw new Error(`No listing with the address ${slug} in ${project}.`);

const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
if (error) throw error;
let user = data.users.find((u) => u.email?.toLowerCase() === email);
if (!user) {
  // An unguessable password nobody knows: they choose their own through the emailed link.
  const made = await db.auth.admin.createUser({ email, password: randomBytes(32).toString("base64url"), email_confirm: true, app_metadata: { emw_via: "team" } });
  if (made.error) throw made.error;
  user = made.data.user;
}

const team = await db.from("team_members").select("user_id").eq("user_id", user.id).maybeSingle();
if (team.data) throw new Error(`${email} is on the East Meets Wed team, so it can't also manage a listing.`);

await db.from("vendor_members").delete().eq("user_id", user.id);
const link = await db.from("vendor_members").insert({ vendor_id: vendor.id, user_id: user.id });
if (link.error) throw link.error;

console.log(`${email} now manages ${vendor.name} (${vendor.status}) in ${project}.`);
console.log(`Next: they open /login, choose "Set or reset your password" and follow the email.`);
