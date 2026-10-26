import { useSyncExternalStore } from "react";

export type Toast = { id: number; message: string; action?: { label: string; run: () => void } };

let toasts: Toast[] = [];
let next = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** A short confirmation at the foot of the screen, optionally with an undo. */
export function toast(message: string, action?: Toast["action"]) {
  const id = next++;
  toasts = [...toasts.slice(-2), { id, message, action }];
  emit();
  setTimeout(() => dismiss(id), action ? 6000 : 3800);
}

export function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

const empty: Toast[] = [];

export const useToasts = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
    () => empty,
  );
