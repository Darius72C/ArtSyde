import type { PrintSide } from "@/lib/products";

/** A studio piece's print files, by side (from their placement, else their layer: 0 front, 1 back). */
export function studioFiles(designs: { fileUrl: string; layer: number; placement: unknown }[]): { side: PrintSide; url: string }[] {
  return designs.flatMap((d) => {
    const s = (d.placement as { side?: string } | null)?.side;
    const side = s === "front" || s === "back" ? s : d.layer === 0 ? "front" : d.layer === 1 ? "back" : null;
    return side ? [{ side, url: d.fileUrl }] : [];
  });
}
