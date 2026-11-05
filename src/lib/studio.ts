import type { PrintQuality } from "@/generated/prisma/client";

export type { PrintQuality };

/** Physical width of the print area: sleeve tip to sleeve tip on the oversized tee, as measured on the 3D model. */
export const PRINT_WIDTH_CM = 64;

/** Output width in pixels for a resolution across the whole print area. */
export const pxFor = (dpi: number) => Math.round((PRINT_WIDTH_CM / 2.54) * dpi);

/**
 * Output quality of a studio design: the image the customer downloads, and the print file sent to the
 * workshop with the order. All of them reach 150 DPI, the studio's print threshold. The height follows
 * the tee's shape.
 */
// `view`: width in pixels of the two 3D views (the tee straight on, front and back) included in the download.
export const PRINT_QUALITY: Record<PrintQuality, { label: string; dpi: number; px: number; view: number; credits: number }> = {
  STANDARD: { label: "Standard", dpi: 150, px: pxFor(150), view: 1600, credits: 0 },
  HD: { label: "HD", dpi: 225, px: pxFor(225), view: 2560, credits: 1 },
  ULTRA_HD: { label: "Ultra HD", dpi: 300, px: pxFor(300), view: 3840, credits: 2 },
};
export const PRINT_QUALITIES = Object.keys(PRINT_QUALITY) as PrintQuality[];

/**
 * Width of the free (Standard) download: a watermarked preview, too small to print even if the watermark
 * were removed. The Standard print file sent with an order keeps its 150 DPI (PRINT_QUALITY.STANDARD.px).
 */
export const STANDARD_PREVIEW_PX = 1200;

/** Width of each downloaded image: the preview in Standard, the full file in HD and Ultra HD. */
export const downloadWidth = (q: PrintQuality) => (q === "STANDARD" ? { print: STANDARD_PREVIEW_PX, view: STANDARD_PREVIEW_PX } : { print: PRINT_QUALITY[q].px, view: PRINT_QUALITY[q].view });
