/** Seeded randomness, so the simulated figures are identical on the server and the client, and on every load. */
export function rng(seed: number | string) {
  let a = typeof seed === "number" ? seed : hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A value near 1, spread by ±amount. */
export const jitter = (r: () => number, amount: number) => 1 + (r() * 2 - 1) * amount;

export const pickOne = <T,>(r: () => number, list: readonly T[]) => list[Math.floor(r() * list.length)];
