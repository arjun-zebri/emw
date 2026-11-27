"use client";

import { useEffect, useState } from "react";
import type { Service } from "@/data/types";
import { refreshListings } from "@/lib/listings-actions";
import { supabase } from "@/lib/supabase/browser";
import { cropOf } from "@/lib/crop";
import { imageUrl } from "@/lib/supabase/storage";

/*
 * Admin → Vendors: every listing that's on the site, or was and has been hidden, with the team's
 * switches for it. Read and written in Supabase as the signed-in team member; row level security and
 * guard_vendor_update keep the switches to the team.
 *
 *   featured       pinned to the home page's "Meet some of our vendors" row
 *   large_tile     a double-width tile in the directory
 *   stats_enabled  the vendor sees their profile stats (free in the launch year, paid later)
 *   status         published, or hidden by the team (decide_vendor 'hidden' / 'shown', recorded)
 *
 * vendor_changes says which live vendors have changed their own listing since the team last checked.
 */

export type ChangePart = "words" | "details" | "contact" | "photos";
export const changeLabels: Record<ChangePart, string> = { photos: "photos", words: "words", details: "details", contact: "contact details" };

export type PlacedVendor = {
  id: string;
  slug: string;
  name: string;
  discipline: string;
  services: Service[];
  cover?: { src: string; ratio: number; focus?: string; zoom?: number };
  featured: boolean;
  largeTile: boolean;
  statsEnabled: boolean;
  /** Taken off the site by the team: who and when, from the decision that hid it. */
  hidden?: { at: string; by?: string };
  /** Changes the vendor made to their own listing that nobody on the team has checked yet. */
  changes?: { parts: ChangePart[]; at: string };
  /** Page views over the last 30 days. */
  views: number;
};

export type Switch = "featured" | "largeTile" | "statsEnabled";
const column = { featured: "featured", largeTile: "large_tile", statsEnabled: "stats_enabled" } as const;

type State = { vendors?: PlacedVendor[]; error?: string };

const db = () => supabase();
const melbourneDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(d);
const partOrder: ChangePart[] = ["photos", "words", "details", "contact"];

async function load(): Promise<PlacedVendor[]> {
  const since = melbourneDay(new Date(Date.now() - 29 * 864e5));
  const [vendors, views, changes] = await Promise.all([
    db()
      .from("vendors")
      .select(
        "id, slug, name, discipline, services, status, featured, large_tile, stats_enabled, vendor_photos(path, width, height, focus_x, focus_y, focus_zoom, position), vendor_decisions(verdict, created_at, team_members(name))",
      )
      .in("status", ["published", "hidden"])
      .order("name")
      .order("created_at", { referencedTable: "vendor_decisions", ascending: false })
      .limit(1, { referencedTable: "vendor_decisions" }),
    db().from("vendor_views").select("vendor_id, views").gte("day", since),
    db().from("vendor_changes").select("vendor_id, parts, last_at"),
  ]);
  if (vendors.error) throw new Error(vendors.error.message);
  const totals = new Map<string, number>();
  for (const r of views.data ?? []) totals.set(r.vendor_id, (totals.get(r.vendor_id) ?? 0) + r.views);
  const changed = new Map((changes.data ?? []).map((c) => [c.vendor_id, c]));
  return vendors.data.flatMap((v) => {
    const last = v.vendor_decisions[0];
    // A hidden listing here is one the team took off the site; a declined draft never went live.
    if (v.status === "hidden" && last?.verdict !== "hidden") return [];
    const first = [...v.vendor_photos].sort((a, b) => a.position - b.position)[0];
    const c = changed.get(v.id);
    return [
      {
        id: v.id,
        slug: v.slug,
        name: v.name,
        discipline: v.discipline,
        services: v.services as Service[],
        cover: first && {
          src: imageUrl("vendor-photos", first.path),
          ratio: first.width && first.height ? first.width / first.height : 4 / 5,
          focus: cropOf(first).position,
          zoom: cropOf(first).zoom,
        },
        featured: v.featured,
        largeTile: v.large_tile,
        statsEnabled: v.stats_enabled,
        hidden: v.status === "hidden" ? { at: last.created_at, by: last.team_members?.name ?? undefined } : undefined,
        changes: c && { parts: partOrder.filter((p) => c.parts.includes(p)), at: c.last_at },
        views: totals.get(v.id) ?? 0,
      },
    ];
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

  const patch = (id: string, fn: (v: PlacedVendor) => PlacedVendor) => setState((s) => ({ ...s, vendors: s.vendors?.map((v) => (v.id === id ? fn(v) : v)) }));

  /** Flip a switch for one vendor. Shows at once; goes back and throws if the database refuses. */
  const toggle = async (id: string, key: Switch, on: boolean) => {
    patch(id, (v) => ({ ...v, [key]: on }));
    const { error } = await db()
      .from("vendors")
      .update({ [column[key]]: on } as Record<(typeof column)[keyof typeof column], boolean>)
      .eq("id", id);
    if (error) {
      patch(id, (v) => ({ ...v, [key]: !on }));
      throw new Error(error.message);
    }
    if (key !== "statsEnabled") await refreshListings().catch(() => undefined);
  };

  /** Take a listing off the site, or put it back. Nothing is deleted; the vendor's account still works. */
  const setShown = async (id: string, shown: boolean) => {
    const before = state.vendors?.find((v) => v.id === id)?.hidden;
    patch(id, (v) => ({ ...v, hidden: shown ? undefined : { at: new Date().toISOString() } }));
    const { error } = await db().rpc("decide_vendor", { vendor: id, verdict: shown ? "shown" : "hidden", note: "" });
    if (error) {
      patch(id, (v) => ({ ...v, hidden: before }));
      throw new Error(error.message);
    }
    await refreshListings().catch(() => undefined);
  };

  /** The team has looked over a vendor's own changes: the tag comes off until they change something again. */
  const markChecked = async (id: string) => {
    const before = state.vendors?.find((v) => v.id === id)?.changes;
    patch(id, (v) => ({ ...v, changes: undefined }));
    const { error } = await db().from("vendor_changes").delete().eq("vendor_id", id);
    if (error) {
      patch(id, (v) => ({ ...v, changes: before }));
      throw new Error(error.message);
    }
  };

  return { ...state, toggle, setShown, markChecked };
}
