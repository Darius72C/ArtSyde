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
// `view`: width in pixels of the 3D view (the tee as posed in the studio) included in the download.
export const PRINT_QUALITY: Record<PrintQuality, { label: string; dpi: number; px: number; view: number; credits: number }> = {
  STANDARD: { label: "Standard", dpi: 150, px: pxFor(150), view: 1600, credits: 0 },
  HD: { label: "HD", dpi: 225, px: pxFor(225), view: 2560, credits: 1 },
  ULTRA_HD: { label: "Ultra HD", dpi: 300, px: pxFor(300), view: 3840, credits: 2 },
};
export const PRINT_QUALITIES = Object.keys(PRINT_QUALITY) as PrintQuality[];
