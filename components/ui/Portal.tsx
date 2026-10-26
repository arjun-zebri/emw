"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const noop = () => () => {};

/**
 * Renders its children on document.body. Overlays (drawers, the lightbox) need this: inside the page
 * they sit in the page's stacking context (view transitions and reveal transforms create one), so
 * no z-index can lift them above the fixed header.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  // Only on the client, after hydration, so the server and first client render agree.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  return mounted ? createPortal(children, document.body) : null;
}
