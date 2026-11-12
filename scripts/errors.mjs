// The site's errors, from the terminal (there's no admin page for them; see lib/observe). Reads
// whichever database .env.local points at: staging, or production with production's keys.
//
//   node --env-file=.env.local --experimental-strip-types scripts/errors.mjs              open issues, newest first
//   node --env-file=.env.local --experimental-strip-types scripts/errors.mjs --all        resolved ones too
//   node --env-file=.env.local --experimental-strip-types scripts/errors.mjs --show <fp>  one issue: stack and recent occurrences
//   node --env-file=.env.local --experimental-strip-types scripts/errors.mjs --resolve <fp>
//        mark it fixed; if it happens again it alerts as "Back again"
//   ALERT_EMAIL=you@example.com node --env-file=.env.local --experimental-strip-types scripts/errors.mjs --test
//        record a test issue and send its alert, through the same function and template as the site
//
// <fp> is the fingerprint at the end of each alert email; its first few characters are enough.

import { createClient } from "@supabase/supabase-js";
import { errorAlert } from "../lib/email/templates.ts";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const [flag, arg] = process.argv.slice(2);
const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};
const when = (t) => (t ? new Date(t).toLocaleString("en-AU", { timeZone: "Australia/Melbourne", dateStyle: "medium", timeStyle: "short" }) : "");

async function find(prefix) {
  if (!prefix) throw new Error("Give the fingerprint (or its first few characters).");
  const rows = must(await db.from("error_issues").select("*").like("fingerprint", `${prefix}%`).limit(2));
  if (rows.length !== 1) throw new Error(rows.length ? `More than one issue starts with ${prefix}; give more of it.` : `No issue starts with ${prefix}.`);
  return rows[0];
}

if (flag === "--show") {
  const i = await find(arg);
  const events = must(await db.from("error_events").select("*").eq("fingerprint", i.fingerprint).order("at", { ascending: false }).limit(10));
  console.log(`${i.severity === "urgent" ? "URGENT  " : ""}${i.title}`);
  console.log(`${i.area} · ${i.source} · ${i.env} · ${i.route ?? ""}`);
  console.log(`${i.count} times, ${when(i.first_seen)} to ${when(i.last_seen)} · releases ${i.first_release} to ${i.last_release}`);
  console.log(i.resolved_at ? `Resolved ${when(i.resolved_at)}` : `Open · ${i.alerts_sent} alerts, last ${when(i.last_alerted_at)}`);
  if (i.sample_stack) console.log(`\n${i.sample_stack}`);
  console.log("\nRecent:");
  for (const e of events) console.log(`  ${when(e.at)}  ${e.method ?? ""} ${e.route ?? ""}  ${e.release ?? ""}  ${e.browser ?? ""}  ${e.digest ?? ""}  ${JSON.stringify(e.context)}`);
} else if (flag === "--resolve") {
  const i = await find(arg);
  must(await db.from("error_issues").update({ resolved_at: new Date().toISOString() }).eq("fingerprint", i.fingerprint));
  console.log(`Resolved: ${i.title}`);
} else if (flag === "--test") {
  const to = process.env.ALERT_EMAIL;
  if (!to || !process.env.RESEND_API_KEY) throw new Error("Set ALERT_EMAIL (and RESEND_API_KEY) to send the test alert.");
  const fingerprint = `test${Date.now().toString(16)}`.slice(0, 16);
  const decided = must(
    await db.rpc("record_error", {
      p_fingerprint: fingerprint,
      p_env: "test",
      p_source: "server",
      p_area: "page",
      p_severity: "normal",
      p_title: "Test alert from scripts/errors.mjs",
      p_route: "/vendors/[slug]",
      p_stack: "Error: Test alert from scripts/errors.mjs\n    at scripts/errors.mjs",
      p_release: "local",
      p_method: "GET",
      p_digest: "",
      p_browser: "",
      p_context: { test: true },
    }),
  );
  if (decided?.reason !== "new") throw new Error(`record_error answered ${JSON.stringify(decided)}, expected a new issue`);
  const email = errorAlert({
    origin: "https://eastmeetswed.com",
    reason: "test",
    severity: "normal",
    env: "test",
    title: "Test alert from scripts/errors.mjs",
    area: "page",
    route: "/vendors/[slug]",
    count: decided.count,
    firstSeen: decided.first_seen,
    release: "local",
    fingerprint,
    stack: "Error: Test alert from scripts/errors.mjs\n    at scripts/errors.mjs",
    context: { test: true },
    hint: "If this reached you, alerts work: the database decided to send it and Resend delivered it.",
  });
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || "East Meets Wed <admin@eastmeetswed.com>", to: [to], subject: email.subject, html: email.html, text: email.text }),
  });
  if (!res.ok) throw new Error(`Resend refused it: ${res.status} ${await res.text()}`);
  must(await db.from("error_issues").delete().eq("fingerprint", fingerprint));
  console.log("Recorded, decided and sent. Check your inbox; the test issue has been removed.");
} else {
  let q = db.from("error_issues").select("fingerprint, severity, title, area, route, count, last_seen, last_release, resolved_at").order("last_seen", { ascending: false }).limit(50);
  if (flag !== "--all") q = q.is("resolved_at", null);
  const rows = must(await q);
  if (!rows.length) console.log("No open issues.");
  for (const r of rows)
    console.log(`${r.fingerprint.slice(0, 8)}  ${r.severity === "urgent" ? "URGENT " : "       "}${String(r.count).padStart(6)}×  ${when(r.last_seen).padEnd(22)} ${r.last_release ?? ""}  ${r.resolved_at ? "(resolved) " : ""}${r.title.slice(0, 90)}  ${r.route ?? ""}`);
}
