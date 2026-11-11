/*
 * The print images of the 3D t-shirt, loaded once per page and kept: the product page starts them
 * as soon as it opens, so the design is ready when the 3D tab shows the tee, and switching tabs
 * back and forth doesn't load them again. No three.js here, so the page can import it freely.
 */

const loaded = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<HTMLImageElement | null>>();

/** The image if it's already loaded. */
export const loadedPrint = (url: string) => loaded.get(url);

/** Loads one print image (with CORS, so WebGL may use it). Resolves null on failure; a later call retries. */
export function loadPrint(url: string): Promise<HTMLImageElement | null> {
  const done = loaded.get(url);
  if (done) return Promise.resolve(done);
  let p = pending.get(url);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => {
        loaded.set(url, img);
        pending.delete(url);
        resolve(img);
      };
      img.onerror = () => {
        pending.delete(url);
        resolve(null);
      };
      img.src = url;
    });
    pending.set(url, p);
  }
  return p;
}

/**
 * Shrinks an image the admin uploads as a print: the 3D view draws it at most 1024 px wide, so a
 * larger file only slows the shop. Kept as is when already small enough or not decodable.
 */
export async function shrinkPrint(file: File, max = 1600): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = max / Math.max(bmp.width, bmp.height);
    if (scale >= 1 && file.size < 1.5 * 1024 * 1024) return (bmp.close(), file);
    const w = Math.round(bmp.width * Math.min(1, scale));
    const h = Math.round(bmp.height * Math.min(1, scale));
    const canvas = Object.assign(document.createElement("canvas"), { width: w, height: h });
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.9));
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}
