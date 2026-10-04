// Own easing functions (t in 0..1). Formulas match tween.js so the feel is the same as the reference.
export type EasingFn = (k: number) => number;

export const QuinticInOut: EasingFn = (k) => {
  k *= 2;
  if (k < 1) return 0.5 * k ** 5;
  k -= 2;
  return 0.5 * (k ** 5 + 2);
};

export const ExponentialOut: EasingFn = (k) => (k === 1 ? 1 : 1 - 2 ** (-10 * k));

/** CSS-style cubic bezier from (0,0) to (1,1) with control points (x1,y1) and (x2,y2). */
export function bezier(x1: number, y1: number, x2: number, y2: number): EasingFn {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  // Solve sx(t) = x for t: Newton first, bisection as the fallback.
  const solve = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(t) - x;
      if (Math.abs(err) < 1e-6) return t;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0, hi = 1;
    t = x;
    while (lo < hi) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (x > v) lo = t; else hi = t;
      const next = (hi - lo) / 2 + lo;
      if (next === t) break;
      t = next;
    }
    return t;
  };

  return (k) => (k <= 0 ? 0 : k >= 1 ? 1 : sy(solve(k)));
}
