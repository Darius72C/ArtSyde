/**
 * The t-shirt seen from the front, traced from the 3D model (public/models/tshirt.glb, front = +z)
 * and simplified. Points are in 0–1 units of the model's front bounding box, x to the right, y down.
 *
 * The studio's print area is this rectangle: the 3D scene projects the print canvases onto the
 * model across the same box (front from the front, back from the back), so what is placed in
 * the 2D box lands at the same spot on the 3D tee. If the model changes, trace it again.
 */
export const TEE_OUTLINE_01: [number, number][] = [
  [0.6127, 0.0], [0.6285, 0.0008], [0.6425, 0.0108], [0.6844, 0.03], [0.7877, 0.0676], [0.8175, 0.0867], [0.8566, 0.1234],
  [0.8734, 0.1435], [0.8939, 0.1818], [0.9497, 0.3253], [1.0, 0.4212], [0.9944, 0.4304], [0.987, 0.4362], [0.9358, 0.4629],
  [0.8883, 0.4837], [0.8305, 0.4996], [0.8212, 0.4996], [0.8166, 0.4954], [0.7952, 0.457], [0.7924, 0.4562], [0.7933, 0.8048],
  [0.7877, 0.955], [0.7849, 0.9875], [0.7821, 0.9917], [0.7533, 0.9958], [0.6965, 0.9975], [0.352, 0.9992], [0.2291, 0.9992],
  [0.2114, 0.9967], [0.2067, 0.9908], [0.1965, 0.8599], [0.189, 0.6889], [0.189, 0.4454], [0.1825, 0.4545], [0.1788, 0.4696],
  [0.1639, 0.5013], [0.1601, 0.5046], [0.1518, 0.5046], [0.0959, 0.4887], [0.04, 0.4662], [0.0037, 0.4512], [0.0, 0.4487],
  [0.0, 0.4429], [0.0326, 0.3761], [0.0512, 0.3269], [0.0698, 0.2711], [0.0745, 0.2377], [0.0857, 0.1985], [0.1052, 0.1601],
  [0.135, 0.1159], [0.1555, 0.0917], [0.1704, 0.0801], [0.203, 0.0626], [0.2868, 0.0334], [0.2989, 0.0259], [0.3212, 0.0175],
  [0.3389, 0.005], [0.3715, 0.0067], [0.4441, 0.0158], [0.4963, 0.0167], [0.5493, 0.0125],
];

/** Width / height of the print area: the model's front bounding box (sleeve tip to sleeve tip × collar to hem). */
export const TEE_ASPECT = 0.8962;

/** The outline on a canvas of the print area's size (browser only: Path2D). */
export function teePath2D(w: number, h: number) {
  const p = new Path2D();
  TEE_OUTLINE_01.forEach(([x, y], i) => (i ? p.lineTo(x * w, y * h) : p.moveTo(x * w, y * h)));
  p.closePath();
  return p;
}

/** The outline as an SVG path in 0–1 units, y down: for `clipPathUnits="objectBoundingBox"` or a 0 0 1 1 viewBox. */
export const TEE_PATH_01 = TEE_OUTLINE_01.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("") + "Z";
