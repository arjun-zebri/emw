import { emailFrom, emailOrigin } from "@/lib/email/config";
import { type ErrorAlertData, errorAlert } from "@/lib/email/templates";

/*
 * The alert email, to the developer (ALERT_EMAIL), never to the client's inbox. It goes straight to
 * Resend and touches nothing else, so it still works when the database is what's broken. Not an
 * email the team can switch off in Admin → Notifications, and not subject to EMAIL_TEST_INBOX: it
 * was always going to the developer. It never reports its own failure (that would loop); a failed
 * alert is a log line.
 */

export async function sendAlert(d: Omit<ErrorAlertData, "origin">): Promise<boolean> {
  const to = process.env.ALERT_EMAIL?.trim();
  const key = process.env.RESEND_API_KEY;
  if (!to || !key) {
    console.error(JSON.stringify({ level: "error", msg: "[observe] Alert not sent: ALERT_EMAIL or RESEND_API_KEY isn't set", fingerprint: d.fingerprint }));
    return false;
  }
  const email = errorAlert({ ...d, origin: emailOrigin() });
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: emailFrom(), to: [to], subject: email.subject, html: email.html, text: email.text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error(JSON.stringify({ level: "error", msg: `[observe] Resend refused an alert: ${res.status}`, fingerprint: d.fingerprint }));
    return res.ok;
  } catch (e) {
    console.error(JSON.stringify({ level: "error", msg: `[observe] Couldn't send an alert: ${e instanceof Error ? e.message : String(e)}`, fingerprint: d.fingerprint }));
    return false;
  }
}
