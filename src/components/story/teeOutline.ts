/**
 * The t-shirt silhouette, in the 3D scene's units (y up). The 3D body is extruded from it, and the
 * studio's print area is exactly this shape: the whole front, or the whole back, sleeves included.
 */
type Cmd = ["M" | "L", number, number] | ["Q", number, number, number, number];

export const TEE_OUTLINE: Cmd[] = [
  ["M", -0.38, 1.3],
  ["Q", 0, 0.92, 0.38, 1.3], // collar
  ["L", 0.95, 1.18],
  ["L", 1.75, 0.55], // right sleeve
  ["L", 1.35, 0.1],
  ["L", 0.98, 0.4],
  ["L", 1.02, -1.22],
  ["Q", 1.03, -1.35, 0.9, -1.35], // hem
  ["L", -0.9, -1.35],
  ["Q", -1.03, -1.35, -1.02, -1.22],
  ["L", -0.98, 0.4],
  ["L", -1.35, 0.1], // left sleeve
  ["L", -1.75, 0.55],
  ["L", -0.95, 1.18],
];

/** The rectangle around the outline. The print canvas covers exactly this rectangle. */
export const TEE_BOUNDS = { minX: -1.75, maxX: 1.75, minY: -1.35, maxY: 1.3 } as const;
const { minX, maxX, minY, maxY } = TEE_BOUNDS;

/** Width / height of the print area (≈ 1.32: sleeve tip to sleeve tip is wider than collar to hem). */
export const TEE_ASPECT = (maxX - minX) / (maxY - minY);

/** The outline on a canvas of the print area's size (browser only: Path2D). */
export function teePath2D(w: number, h: number) {
  const x = (v: number) => ((v - minX) / (maxX - minX)) * w;
  const y = (v: number) => ((maxY - v) / (maxY - minY)) * h;
  const p = new Path2D();
  for (const c of TEE_OUTLINE) {
    if (c[0] === "Q") p.quadraticCurveTo(x(c[1]), y(c[2]), x(c[3]), y(c[4]));
    else if (c[0] === "M") p.moveTo(x(c[1]), y(c[2]));
    else p.lineTo(x(c[1]), y(c[2]));
  }
  p.closePath();
  return p;
}

/** The outline as an SVG path in 0–1 units, y down: for `clipPathUnits="objectBoundingBox"` or a 0 0 1 1 viewBox. */
export const TEE_PATH_01 = (() => {
  const x = (v: number) => +((v - minX) / (maxX - minX)).toFixed(4);
  const y = (v: number) => +((maxY - v) / (maxY - minY)).toFixed(4);
  return TEE_OUTLINE.map((c) => (c[0] === "Q" ? `Q${x(c[1])} ${y(c[2])} ${x(c[3])} ${y(c[4])}` : `${c[0]}${x(c[1])} ${y(c[2])}`)).join("") + "Z";
})();
