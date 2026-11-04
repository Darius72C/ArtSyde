/**
 * Bridge from the studio page to its 3D scene: renders the tee exactly as it is on screen (angle,
 * colour, design) at a chosen width, and returns it as a transparent PNG. Set by the studio's
 * TeeScene while it is mounted, null otherwise.
 */
export const teeSnapshot: { current: ((width: number) => Promise<Blob | null>) | null } = { current: null };
