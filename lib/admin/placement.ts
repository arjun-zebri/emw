"use client";

import { useEffect, useState } from "react";
import { refreshListings } from "@/lib/listings-actions";
import { supabase } from "@/lib/supabase/browser";
import { imageUrl } from "@/lib/supabase/storage";

/*
 * Admin → Vendors: every published listing with the team's switches for it. Read and written in
 * Supabase as the signed-in team member; row level security and guard_vendor_update keep the
 * switches to the team.
 *
 *   featured       pinned to the home page's "Meet some of our vendors" row
 *   large_tile     a double-width tile in the directory
 *   stats_enabled  the vendor sees their profile stats (free in the launch year, paid later)
 */

export type PlacedVendor = {
  id: string;
  slug: string;
  name: string;
  discipline: string;
  cover?: { src: string; ratio: number };
  featured: boolean;
  largeTile: boolean;
  statsEnabled: boolean;
  /** Page views over the last 30 days. */
  views: number;
};

export type Switch = "featured" | "largeTile" | "statsEnabled";
const column = { featured: "featured", largeTile: "large_tile", statsEnabled: "stats_enabled" } as const;

type State = { vendors?: PlacedVendor[]; error?: string };

const db = () => supabase();
const melbourneDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(d);

async function load(): Promise<PlacedVendor[]> {
  const since = melbourneDay(new Date(Date.now() - 29 * 864e5));
  const [vendors, views] = await Promise.all([
    db()
      .from("vendors")
      .select("id, slug, name, discipline, featured, large_tile, stats_enabled, vendor_photos(path, width, height, position)")
      .eq("status", "published")
      .order("name"),
    db().from("vendor_views").select("vendor_id, views").gte("day", since),
  ]);
  if (vendors.error) throw new Error(vendors.error.message);
  const totals = new Map<string, number>();
  for (const r of views.data ?? []) totals.set(r.vendor_id, (totals.get(r.vendor_id) ?? 0) + r.views);
  return vendors.data.map((v) => {
    const first = [...v.vendor_photos].sort((a, b) => a.position - b.position)[0];
    return {
      id: v.id,
      slug: v.slug,
      name: v.name,
      discipline: v.discipline,
      cover: first && { src: imageUrl("vendor-photos", first.path), ratio: first.width && first.height ? first.width / first.height : 4 / 5 },
      featured: v.featured,
      largeTile: v.large_tile,
      statsEnabled: v.stats_enabled,
      views: totals.get(v.id) ?? 0,
    };
  });
}

export function usePlacement() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    let live = true;
    load().then(
      (vendors) => live && setState({ vendors }),
      (e: Error) => live && setState({ error: e.message }),
    );
    return () => {
      live = false;
    };
  }, []);

  /** Flip a switch for one vendor. Shows at once; goes back and throws if the database refuses. */
  const toggle = async (id: string, key: Switch, on: boolean) => {
    const patch = (value: boolean) => setState((s) => ({ ...s, vendors: s.vendors?.map((v) => (v.id === id ? { ...v, [key]: value } : v)) }));
    patch(on);
    const { error } = await db()
      .from("vendors")
      .update({ [column[key]]: on } as Record<(typeof column)[keyof typeof column], boolean>)
      .eq("id", id);
    if (error) {
      patch(!on);
      throw new Error(error.message);
    }
    if (key !== "statsEnabled") await refreshListings().catch(() => undefined);
  };

  return { ...state, toggle };
}
