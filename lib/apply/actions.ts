"use server";

import { createClient } from "@supabase/supabase-js";
import { sendApplicationEmails } from "@/lib/email/send";
import { normaliseStory, splitStory } from "@/lib/story";
import type { Database } from "@/lib/supabase/database.types";
import { createClient as createServer } from "@/lib/supabase/server";
import { type Application, fullPhone, LIMITS, photoPaths, problems, slugify, socialUrl, withScheme } from "./application";

/*
 * Vendor applications from /list-your-business/apply. The public can't write to the database, so
 * these run on the server with the secret key and do their own checking: the application is
 * validated in full, bots are turned away (a hidden field, a minimum time on the form, a cap per
 * hour), and it needs a confirmed account (lib/apply/account.ts), which can apply once a week.
 *
 * An application becomes a draft vendor, exactly like an imported one, so it lands in Admin →
 * Approvals and stays private until the team approves it. Who applied, and how to reach them, goes
 * in the team-only review notes. Photos are resized in the browser and uploaded straight to
 * storage with one-off signed links (they're too large to pass through here), then recorded by
 * finishApplication once they've arrived, which is also when the team and the vendor are emailed.
 */

const SOURCE = "Website application";
const PER_HOUR = 20;
const MIN_SECONDS = 30;
const FRESH_HOURS = 3;

type Upload = { path: string; token: string };
export type Submitted =
  | { status: "ok"; id: string; uploads: { full: Upload; w1200: Upload; w480: Upload }[] }
  | { status: "invalid"; problems: string[] }
  | { status: "duplicate" | "busy" | "error" | "signed-out" };

/** The signed-in applicant, if their address is confirmed (Google and Microsoft ones always are). */
async function applicant() {
  const { data } = await (await createServer()).auth.getUser();
  return data.user?.email_confirmed_at ? data.user : null;
}

const admin = () =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const today = () => new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Melbourne" });
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

export async function submitApplication(a: Application, meta: { photos: number; startedAt: number; trap: string }): Promise<Submitted> {
  // Bots fill the hidden field, or race through. Answer as if it worked so they learn nothing.
  if (meta.trap || Date.now() - meta.startedAt < MIN_SECONDS * 1000) return { status: "duplicate" };

  const user = await applicant();
  if (!user) return { status: "signed-out" };

  const issues = problems(a);
  if (!Number.isInteger(meta.photos) || meta.photos < 1 || meta.photos > LIMITS.photosMax) issues.push("Add at least one photo.");
  if (issues.length) return { status: "invalid", problems: issues };

  const db = admin();
  const email = a.email.trim().toLowerCase();

  const recent = await db.from("vendor_review_notes").select("vendor_id", { count: "exact", head: true }).like("source", `${SOURCE}%`).gte("created_at", hoursAgo(1));
  if (recent.error) return { status: "error" };
  if ((recent.count ?? 0) >= PER_HOUR) return { status: "busy" };

  // Once a week, whether by account or by email address.
  const since = hoursAgo(24 * 7);
  const recentFor = () => db.from("vendor_review_notes").select("vendor_id", { count: "exact", head: true }).like("source", `${SOURCE}%`).gte("created_at", since);
  const [byAccount, byEmail] = await Promise.all([recentFor().eq("applicant_id", user.id), recentFor().ilike("registered_emails", email.replace(/[%_\\]/g, "\\$&"))]);
  if (byAccount.error || byEmail.error) return { status: "error" };
  const again = { count: (byAccount.count ?? 0) + (byEmail.count ?? 0) };
  if ((again.count ?? 0) > 0) return { status: "duplicate" };

  // A free address: the name's slug, or the first numbered one after it.
  const base = slugify(a.name);
  const taken = await db.from("vendors").select("slug, legacy_slug").or(`slug.like.${base}%,legacy_slug.like.${base}%`);
  if (taken.error) return { status: "error" };
  const used = new Set(taken.data.flatMap((v) => [v.slug, v.legacy_slug]));
  let slug = base;
  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;

  const phone = fullPhone(a);
  const { data: vendor, error } = await db
    .from("vendors")
    .insert({
      slug,
      name: clean(a.name),
      person: clean(a.person),
      discipline: clean(a.discipline),
      services: a.services,
      based: clean(a.based) || null,
      service_area: a.serviceArea,
      languages: a.languages,
      story: normaliseStory(splitStory(a.story)),
      email,
      phone: phone || null,
      website: withScheme(a.website) || null,
      instagram: socialUrl(a.instagram, "instagram") || null,
      facebook: socialUrl(a.facebook, "facebook") || null,
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !vendor) return { status: "error" };

  const notes = [
    `Applied through the website on ${today()}.`,
    `Applicant: ${clean(a.person)}, ${email}${phone ? `, ${phone}` : ""}.`,
    user.email && user.email.toLowerCase() !== email && `Signed in as ${user.email}.`,
    a.otherCraft.trim() && `Also does: ${clean(a.otherCraft)}.`,
    a.otherLanguages.trim() && `Also works in: ${clean(a.otherLanguages)}.`,
    "They confirmed the photos are theirs to share, or that they have permission.",
  ].filter(Boolean);
  const note = await db.from("vendor_review_notes").insert({ vendor_id: vendor.id, applicant_id: user.id, notes: notes.join("\n"), registered_emails: email, source: `${SOURCE}, ${today()}` });
  if (note.error) {
    await db.from("vendors").delete().eq("id", vendor.id);
    return { status: "error" };
  }

  const bucket = db.storage.from("vendor-photos");
  const sign = async (path: string): Promise<Upload> => {
    const { data, error } = await bucket.createSignedUploadUrl(path);
    if (error) throw error;
    return { path: data.path, token: data.token };
  };
  try {
    const uploads = await Promise.all(
      Array.from({ length: meta.photos }, async (_, i) => {
        const p = photoPaths(vendor.id, i);
        const [full, w1200, w480] = await Promise.all([sign(p.full), sign(p.w1200), sign(p.w480)]);
        return { full, w1200, w480 };
      }),
    );
    return { status: "ok", id: vendor.id, uploads };
  } catch {
    // The application is saved; the team will see it in Approvals without photos.
    return { status: "error" };
  }
}

/**
 * Record the photos once they're in storage. Only for a fresh application that has none yet, and
 * only for files that are really there, so this can't be used to attach photos to anyone else.
 */
export async function finishApplication(id: string, photos: { width: number; height: number }[]): Promise<{ ok: boolean }> {
  if (!/^[0-9a-f-]{36}$/.test(id) || !Array.isArray(photos) || photos.length < 1 || photos.length > LIMITS.photosMax) return { ok: false };

  const user = await applicant();
  if (!user) return { ok: false };

  const db = admin();
  const { data: vendor } = await db
    .from("vendors")
    .select("id, name, status, created_at, vendor_review_notes(source, applicant_id), vendor_photos(id)")
    .eq("id", id)
    .maybeSingle();
  if (
    !vendor ||
    vendor.status !== "draft" ||
    vendor.created_at < hoursAgo(FRESH_HOURS) ||
    !vendor.vendor_review_notes?.source.startsWith(SOURCE) ||
    vendor.vendor_review_notes.applicant_id !== user.id ||
    vendor.vendor_photos.length > 0
  ) {
    return { ok: false };
  }

  const { data: files, error } = await db.storage.from("vendor-photos").list(id, { limit: 100 });
  if (error) return { ok: false };
  const there = new Set(files.map((f) => `${id}/${f.name}`));

  const size = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.min(10000, Math.max(1, Math.round(n))) : null);
  const rows = photos.flatMap((p, i) => {
    const paths = photoPaths(id, i);
    if (![paths.full, paths.w1200, paths.w480].every((k) => there.has(k))) return [];
    return [{ vendor_id: id, path: paths.full, width: size(p.width), height: size(p.height), alt: i === 0 ? vendor.name : `${vendor.name}, photo ${i + 1}`, position: i }];
  });
  const insert = rows.length ? await db.from("vendor_photos").insert(rows) : { error: null };

  // Once per application, whether or not every photo made it: the team still needs to know.
  const { data: claimed } = await db
    .from("vendor_review_notes")
    .update({ source: `${vendor.vendor_review_notes!.source} (emailed)` })
    .eq("vendor_id", id)
    .not("source", "like", "%(emailed)")
    .select("vendor_id");
  if (claimed?.length) await sendApplicationEmails(id);

  return { ok: rows.length > 0 && !insert.error };
}
