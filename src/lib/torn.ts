/** Deterministic "torn paper" polygon (same on server and client → no hydration mismatch). */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function tornPolygon(seed: number, steps = 16, depth = 3.5) {
  const r = rng(seed);
  const pts: string[] = [];
  const j = () => (r() * depth).toFixed(2);
  for (let i = 0; i <= steps; i++) pts.push(`${((i / steps) * 100).toFixed(2)}% ${j()}%`);
  for (let i = 1; i <= steps; i++) pts.push(`${(100 - +j()).toFixed(2)}% ${((i / steps) * 100).toFixed(2)}%`);
  for (let i = steps - 1; i >= 0; i--) pts.push(`${((i / steps) * 100).toFixed(2)}% ${(100 - +j()).toFixed(2)}%`);
  for (let i = steps - 1; i > 0; i--) pts.push(`${j()}% ${((i / steps) * 100).toFixed(2)}%`);
  return `polygon(${pts.join(",")})`;
}
