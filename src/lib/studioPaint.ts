import { teePath2D } from "@/components/story/teeOutline";
import { optimizedSrc } from "@/lib/imageUrl";

/*
 * How a studio design is drawn: each side's images and text, placed in fractions of the print area
 * (the rectangle around the tee's silhouette) and cut to the silhouette. Shared by the studio (live
 * preview, downloads, print files) and the admin (saved creations in 2D and 3D). Browser only.
 */

export type StudioImage = { id: string; src: string; nw: number; nh: number; x: number; y: number; scale: number; rot: number };
export type StudioText = { value: string; font: "serif" | "italic" | "sans"; color: string; x: number; y: number; size: number; rot: number };
/** One side of a design: images in stacking order (the last one on top), then the text. */
export type StudioSide = { images: StudioImage[]; text?: StudioText };

export const hasStudioContent = (d: StudioSide) => Boolean(d.images.length || d.text?.value);

/** Reads a saved side (SavedDesign.front / back, JSON) safely. */
export function asStudioSide(v: unknown): StudioSide {
  const s = (v ?? {}) as Partial<StudioSide>;
  return { images: Array.isArray(s.images) ? s.images : [], ...(s.text?.value ? { text: s.text } : {}) };
}

function fontFamily(f: StudioText["font"]) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(f === "sans" ? "--font-body" : "--font-display").trim();
  return v || (f === "sans" ? "sans-serif" : "serif");
}

/** Paints one side's layers on a canvas of any size (live preview, download, print file), cut to the tee. */
export function paint(ctx: CanvasRenderingContext2D, d: StudioSide, w: number, h: number, images: Map<string, HTMLImageElement>) {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.clip(teePath2D(w, h));
  for (const img of d.images) {
    const el = images.get(img.src);
    if (!el) continue;
    const iw = img.scale * w;
    const ih = (iw * img.nh) / img.nw;
    ctx.save();
    ctx.translate(img.x * w, img.y * h);
    ctx.rotate((img.rot * Math.PI) / 180);
    ctx.drawImage(el, -iw / 2, -ih / 2, iw, ih);
    ctx.restore();
  }
  if (d.text?.value) {
    const t = d.text;
    ctx.save();
    ctx.translate(t.x * w, t.y * h);
    ctx.rotate((t.rot * Math.PI) / 180);
    ctx.font = `${t.font === "italic" ? "italic " : ""}${t.font === "sans" ? 500 : 400} ${t.size * w}px ${fontFamily(t.font)}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = t.color;
    t.value.split("\n").forEach((line, i, all) => ctx.fillText(line, 0, (i - (all.length - 1) / 2) * t.size * w * 1.05));
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Loads a design's images, keyed by their stored link. With `width`, a resized copy from the site's image
 * optimizer (same origin, so the painted canvas stays usable by WebGL); without it, the original with CORS.
 * Failed ones are left out.
 */
export async function loadStudioImages(srcs: string[], width?: number, into = new Map<string, HTMLImageElement>()) {
  await Promise.all(
    [...new Set(srcs)].filter((src) => !into.has(src)).map(
      (src) =>
        new Promise<void>((done) => {
          const el = new Image();
          el.crossOrigin = "anonymous";
          el.onload = () => (into.set(src, el), done());
          el.onerror = () => done();
          el.src = width ? optimizedSrc(src, width) : src;
        }),
    ),
  );
  return into;
}
