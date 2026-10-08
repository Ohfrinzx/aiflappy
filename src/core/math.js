export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (lo, hi) => lo + Math.random() * (hi - lo);
export const randInt = (lo, hi) => Math.floor(rand(lo, hi)); // [lo, hi)
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const DEG = Math.PI / 180;

// Picks from [{weight, ...}] lists; entries without weight count as 1.
export function weightedPick(list) {
  const total = list.reduce((s, e) => s + (e.weight ?? 1), 0);
  let r = Math.random() * total;
  for (const e of list) {
    r -= e.weight ?? 1;
    if (r <= 0) return e;
  }
  return list[list.length - 1];
}
