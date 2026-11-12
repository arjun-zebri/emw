import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { after } from "next/server";
import type { Database, Json } from "@/lib/supabase/database.types";
import { sendAlert } from "./alert";
import { type Area, type Severity, scrub, scrubStack, signature } from "./scrub";

/*
 * The one way the server reports a failure (server only: it uses the secret key and node:crypto).
 * Each report is a structured log line, a row in error_issues / error_events, and, when
 * record_error says so, an email to the developer: once when an issue first appears, again if it
 * comes back, and with growing gaps while it continues (see the migration 20261113000000).
 *
 * It never throws and never makes anyone wait longer than it has to: use reportSoon() from a
 * request, which runs after the response; await report() only where the work is already in the
 * background (inside after(), onRequestError). If the database can't record it, the alert is sent
 * anyway, at most once an hour per issue from each server.
 */

export type Report = {
  area: Area;
  /** Urgent: couples or vendors can't do what they came for. */
  severity?: Severity;
  /** The address pattern, like "/vendors/[slug]". Never a real address with a query string. */
  route?: string;
  method?: string;
  digest?: string;
  source?: "server" | "client";
  browser?: string;
  /** Small facts that help, like an HTTP status. Never personal details. */
  context?: Record<string, string | number | boolean | null | undefined>;
};

const HINTS: Record<Area, string> = {
  page: "A page didn't render. Open it, then check Supabase status and the query it runs.",
  action: "A form or button failed on the server. Check the action named under Where.",
  route: "An API route failed. Check the route named under Where.",
  proxy: "Sign-in is failing for /admin or /account. Check Supabase Auth and the custom access token hook.",
  enquiry: "A couple's enquiry may not have been saved or reached the vendor. Check enquiries with no emailed_to.",
  email: "An email didn't send. Check the Resend dashboard: the API key, the domain and the logs.",
  apply: "An application may be incomplete. Check Approvals for a draft without photos.",
  account: "Someone couldn't create an account or get a password link. Check Supabase Auth and Resend.",
  auth: "A Google or Microsoft sign-in didn't finish. Usually a one-off; repeated, check the provider settings in Supabase.",
  throttle: "The form caps are off while this lasts (they let people through rather than turn them away).",
  analytics: "Visits aren't being counted. The site itself is unaffected.",
  browser: "Something broke in a visitor's browser. The stack shows where.",
};

const env = () => process.env.VERCEL_ENV ?? (process.env.NODE_ENV === "development" ? "development" : "local");
const release = () => process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local";

/** Errors sent when the database couldn't record them, so a broken database doesn't mean an email per request. */
const unrecorded = new Map<string, number>();

function describe(error: unknown) {
  if (error instanceof Error) return { name: error.name || "Error", message: error.message || "(no message)", stack: error.stack };
  if (error && typeof error === "object" && "message" in error) {
    const e = error as { message: unknown; name?: unknown; code?: unknown };
    return { name: typeof e.name === "string" ? e.name : typeof e.code === "string" ? `Error ${e.code}` : "Error", message: String(e.message), stack: undefined };
  }
  return { name: "Error", message: typeof error === "string" ? error : JSON.stringify(error) ?? String(error), stack: undefined };
}

export async function report(error: unknown, r: Report): Promise<void> {
  try {
    const { name, message, stack } = describe(error);
    const source = r.source ?? "server";
    const severity = r.severity ?? "normal";
    const title = scrub(`${name === "Error" ? "" : `${name}: `}${message}`);
    const cleanStack = scrubStack(stack);
    const fingerprint = createHash("sha256")
      .update(signature({ env: env(), source, area: r.area, name, message: scrub(message), route: r.route }))
      .digest("hex")
      .slice(0, 16);

    // The record of last resort, in Vercel's logs, whatever happens next.
    console.error(JSON.stringify({ level: "error", area: r.area, severity, fingerprint, title, route: r.route, digest: r.digest, release: release() }));

    // A local `next dev` points at staging: don't fill it with work in progress.
    if (env() === "development" && !process.env.OBSERVE_LOCAL) return;

    const base = { severity, env: env(), title, area: r.area, route: r.route, release: release(), digest: r.digest, browser: r.browser, fingerprint, stack: cleanStack, context: r.context, hint: HINTS[r.area] };

    let decided: { reason: "new" | "regressed" | "ongoing" | "storm"; count: number; first_seen: string; first_release: string | null; severity: Severity } | null;
    try {
      const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error: failed } = await db
        .rpc("record_error", {
          p_fingerprint: fingerprint,
          p_env: env(),
          p_source: source,
          p_area: r.area,
          p_severity: severity,
          p_title: title,
          p_route: r.route ?? "",
          p_stack: cleanStack ?? "",
          p_release: release(),
          p_method: r.method ?? "",
          p_digest: r.digest ?? "",
          p_browser: r.browser ?? "",
          p_context: (r.context ?? {}) as Json,
        })
        .abortSignal(AbortSignal.timeout(2500));
      if (failed) throw failed;
      decided = data as typeof decided;
    } catch (dbError) {
      const last = unrecorded.get(fingerprint) ?? 0;
      if (Date.now() - last < 3_600_000) return;
      unrecorded.set(fingerprint, Date.now());
      await sendAlert({ ...base, reason: "unrecorded", context: { ...r.context, "not recorded because": scrub(describe(dbError).message, 120) } });
      return;
    }

    if (!decided) return;
    await sendAlert({ ...base, reason: decided.reason, severity: decided.severity, count: decided.count, firstSeen: decided.first_seen, firstRelease: decided.first_release ?? undefined });
  } catch {
    // Reporting must never break what it's reporting on.
  }
}

/** Report once the response has gone, from a page, action, route or the proxy. */
export function reportSoon(error: unknown, r: Report) {
  try {
    after(() => report(error, r));
  } catch {
    // Outside a request (a script, a test): report now, without waiting.
    void report(error, r);
  }
}
