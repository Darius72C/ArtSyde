/**
 * Shared, mutable state for the hero's 3D tees. The hero writes the mouse position and GSAP the
 * scroll spread; the 3D scene reads them every frame (no React re-renders).
 */
export const heroState = {
  px: 0, // mouse over the hero, -1..1
  py: 0,
  spread: 1, // 1: side tees fanned out; lower: tucked in behind the front one (scroll)
};
