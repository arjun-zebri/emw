import { useSyncExternalStore } from "react";

/*
 * Calendar days in Melbourne, as "YYYY-MM-DD" strings; day numbers count from the Unix epoch.
 * Pages are prerendered, and Cache Components keeps the clock out of the prerendered shell, so
 * read today with useToday() while rendering, and today() only in effects and event handlers.
 */
const DAY = 86_400_000;

/** Today in Melbourne. Not while rendering: use useToday() there. */
export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });

const never = () => () => {};
/** Today for rendering: "" in the prerendered shell, then today once the page is in the browser. */
export const useToday = () => useSyncExternalStore(never, today, () => "");

export const dayNumber = (iso: string) => Math.floor(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / DAY);
export const isoDay = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);
export const addMonths = (iso: string, months: number) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
};
/** Hours since a timestamp. For data that only renders in the browser (fetched after load). */
export const hoursSince = (iso: string) => (Date.now() - Date.parse(iso)) / 3_600_000;
