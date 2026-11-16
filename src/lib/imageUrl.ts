/**
 * Images from the storage (R2) go through the site's image optimizer (/_next/image): resized to the width
 * asked, converted to WebP and cached by the CDN, instead of the original file (some are 10+ MB PNGs). Local
 * paths and data URLs are left as they are. Widths must be in next.config's deviceSizes (the defaults).
 */
export const IMAGE_WIDTHS = [640, 828, 1200, 1920] as const;

const remote = (src?: string) => !!src && /^https:\/\//.test(src);

/** One optimized size of `src` (`w` one of 640, 750, 828, 1080, 1200, 1920, 2048, 3840). */
export function optimizedSrc(src: string, w = 1080): string {
  return remote(src) ? `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75` : src;
}

/** `srcSet` for an <img>: the browser picks the size that fits the screen. Undefined for non-storage images. */
export function optimizedSrcSet(src?: string): string | undefined {
  return src && remote(src) ? IMAGE_WIDTHS.map((w) => `${optimizedSrc(src, w)} ${w}w`).join(", ") : undefined;
}
