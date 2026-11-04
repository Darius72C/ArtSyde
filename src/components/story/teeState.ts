/**
 * Shared, mutable animation state. GSAP writes to it on scroll,
 * the 3D scene reads it every frame (no React re-renders).
 */
export const teeState = {
  rotY: 0,
  colorT: 0, // float index into TEE_COLORS
  hex: null as string | null, // free colour (studio picker); overrides colorT when set
  design: 0, // 0..1 front design visibility
  scrollRot: 0, // extra rotation driven by page scroll
  scale: 1,
  texVersion: 0, // bumped by the studio after redrawing the print canvases
  parallax: 1, // how much the mouse tilts the tee (lower in the studio)
  pointerX: 0,
  pointerY: 0,
};
