/**
 * Bridge from the studio page to its 3D scene: renders the tee (colour, design) at a chosen width
 * and returns it as a transparent PNG. With `face`, the tee is shown straight on, front or back,
 * whatever angle it has on screen. Set by the studio's TeeScene while it is mounted, null otherwise.
 */
export type TeeFace = "front" | "back";
export const teeSnapshot: { current: ((width: number, face?: TeeFace) => Promise<Blob | null>) | null } = { current: null };

/**
 * Same for the "Porté" view (studio download, product page share): renders the mannequin shown there, wearing
 * the design, straight on (front or back), unzoomed, at a chosen width. Set by MannequinTryOn while it is mounted.
 */
export const wornSnapshot: { current: ((width: number, face: TeeFace) => Promise<Blob | null>) | null } = { current: null };
