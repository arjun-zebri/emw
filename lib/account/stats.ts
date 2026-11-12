"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";

/*
 * A vendor's profile stats for their dashboard: whether the team has them switched on
 * (vendors.stats_enabled), and their page views per day for the last 30 days (vendor_views, counted
 * by the vendor page). Row level security returns views only while stats are on.
 */

export const STATS_DAYS = 30;

export type ProfileStats =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "off" }
  | { status: "on"; days: { day: string; views: number }[]; total: number };

const melbourneDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(d);

/** The last `STATS_DAYS` days, oldest first, as YYYY-MM-DD in Melbourne. */
export function lastDays(now = new Date()) {
  return Array.from({ length: STATS_DAYS }, (_, i) => melbourneDay(new Date(now.getTime() - (STATS_DAYS - 1 - i) * 864e5)));
}

export function useProfileStats(slug: string | null) {
  const [state, setState] = useState<{ slug: string; stats: ProfileStats }>();

  useEffect(() => {
    if (!slug) return;
    let live = true;
    (async (): Promise<ProfileStats> => {
      const db = supabase();
      const vendor = await db.from("vendors").select("id, stats_enabled").eq("slug", slug).single();
      if (vendor.error) return { status: "error", error: vendor.error.message };
      if (!vendor.data.stats_enabled) return { status: "off" };
      const days = lastDays();
      const views = await db.from("vendor_views").select("day, views").eq("vendor_id", vendor.data.id).gte("day", days[0]);
      if (views.error) return { status: "error", error: views.error.message };
      const byDay = new Map(views.data.map((r) => [r.day, r.views]));
      const series = days.map((day) => ({ day, views: byDay.get(day) ?? 0 }));
      return { status: "on", days: series, total: series.reduce((n, d) => n + d.views, 0) };
    })().then((stats) => live && setState({ slug, stats }));
    return () => {
      live = false;
    };
  }, [slug]);

  return state && state.slug === slug ? state.stats : ({ status: "loading" } as ProfileStats);
}
