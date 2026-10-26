"use client";

import { useRef, useState } from "react";
import type { LangRow } from "../languages-options/types";

/*
 * Shared behaviour for the poster variations: a language is chosen by clicking (or tapping) it,
 * never by hovering, and nothing changes on its own. The directory is reached through the
 * vendor links and "View all", so the languages themselves are buttons.
 */
export function usePoster(rows: LangRow[]) {
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  /** Props for each language's button. */
  const bind = (i: number) => ({
    type: "button" as const,
    "aria-pressed": i === active,
    onClick: () => setActive(i),
  });

  const current = rows[active];
  // The ref is returned apart from the state, so reading the state in render isn't a ref access.
  return [root, { active, current, bind, withPhotos: current.vendors.filter((v) => v.cover) }] as const;
}

export type PosterState = ReturnType<typeof usePoster>[1];
