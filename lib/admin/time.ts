/*
 * The demo runs on a fixed clock so every figure is stable. All dates are UTC calendar days as
 * "YYYY-MM-DD" strings, and day numbers count from the Unix epoch.
 */
export const TODAY = "2026-10-26";
const DAY = 86_400_000;

export const dayNumber = (iso: string) => Math.floor(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / DAY);
export const isoDay = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);
export const TODAY_N = dayNumber(TODAY);
/** n days before (negative) or after today. */
export const daysFromToday = (n: number) => isoDay(TODAY_N + n);
export const daysUntil = (iso: string) => dayNumber(iso) - TODAY_N;
export const addMonths = (iso: string, months: number) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
};
export const monthKey = (iso: string) => iso.slice(0, 7);
/** The last `count` months, oldest first, ending with the current one. */
export const lastMonths = (count: number) => Array.from({ length: count }, (_, i) => monthKey(addMonths(`${TODAY.slice(0, 7)}-01`, i - count + 1)));
/** Monday of the week the day falls in. */
export const weekStart = (iso: string) => {
  const n = dayNumber(iso);
  const dow = (new Date(n * DAY).getUTCDay() + 6) % 7;
  return isoDay(n - dow);
};
/** An ISO timestamp `hours` before the fixed "now" (09:40 on TODAY, Melbourne morning). */
export const NOW = `${TODAY}T09:40:00+11:00`;
export const hoursAgo = (hours: number) => new Date(Date.parse(NOW) - hours * 3_600_000).toISOString();
export const hoursSince = (iso: string) => (Date.parse(NOW) - Date.parse(iso)) / 3_600_000;
