/**
 * Protection of the studio's downloads.
 *
 * No watermark is impossible to remove, so the free (Standard) download is protected three ways:
 * - it is a small preview (see STANDARD_PREVIEW_PX in studio.ts), useless for printing even if cleaned;
 * - its watermark is hard to erase: several layers across the whole image (design included), each
 *   download with its own size, angle and offset, plus a fine noise that throws off cleaning tools;
 * - every download, HD and Ultra HD included, carries an invisible trace in its pixels (readTrace),
 *   so a design found online without its watermark can be shown to come from the studio.
 */

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Repeats `text` over the whole canvas, rotated by `angle` (deg), rows offset like bricks. */
function tile(ctx: CanvasRenderingContext2D, w: number, h: number, text: string, size: number, angle: number, stepX: number, stepY: number, style: (row: number) => void) {
  ctx.save();
  ctx.font = `700 ${size}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(w / 2 + rand(-stepX, stepX) / 2, h / 2 + rand(-stepY, stepY) / 2);
  ctx.rotate((angle * Math.PI) / 180);
  const reach = Math.hypot(w, h) / 2 + stepX;
  for (let y = -reach, row = 0; y <= reach; y += stepY, row++) {
    style(row);
    for (let x = -reach + (row % 2) * (stepX / 2); x <= reach; x += stepX) {
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    }
  }
  ctx.restore();
}

/** The Standard watermark, drawn over everything already on the canvas. */
export function stampWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // 1. Large wordmark, alternately light and dark so it reads on any colour, outlined.
  const big = Math.max(16, Math.round((w / 20) * rand(0.9, 1.15)));
  tile(ctx, w, h, "ARTSYDE · APERÇU", big, rand(-30, -18), big * 11, big * 4.2, (row) => {
    ctx.fillStyle = row % 2 ? "rgba(255,255,255,0.34)" : "rgba(0,0,0,0.3)";
    ctx.strokeStyle = row % 2 ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.18)";
    ctx.lineWidth = Math.max(1, big / 16);
  });

  // 2. A finer layer at another angle, so erasing one direction leaves the other.
  const small = Math.max(9, Math.round(w / 64));
  tile(ctx, w, h, "artsyde · studio", small, rand(12, 24), small * 12, small * 3.4, () => {
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 1;
  });

  // 3. Thin crossing lines over the whole image.
  ctx.save();
  ctx.strokeStyle = "rgba(128,128,128,0.16)";
  ctx.lineWidth = Math.max(1, w / 900);
  const gap = w / rand(9, 12);
  ctx.translate(w / 2, h / 2);
  ctx.rotate((rand(35, 55) * Math.PI) / 180);
  const reach = Math.hypot(w, h);
  ctx.beginPath();
  for (let x = -reach; x <= reach; x += gap) {
    ctx.moveTo(x, -reach);
    ctx.lineTo(x, reach);
  }
  ctx.stroke();
  ctx.restore();

  // 4. Fine noise on the visible pixels: cleaning tools lean on smooth areas to rebuild what is under a mark.
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const n = (Math.random() - 0.5) * 14;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

// ---------- Invisible trace ----------

const MAGIC = "ASY1"; // marks the start of a trace
const STRIP = 64; // rows read at a time: big files (Ultra HD) are never read whole

/**
 * The trace is written in the lowest bit of the blue channel of fully opaque pixels (the only ones canvases
 * store exactly), in reading order from three starting rows: the top, a third and two thirds down. A cropped
 * or partly edited image still keeps one copy.
 */
const starts = (h: number) => [0, Math.floor(h / 3), Math.floor((2 * h) / 3)];

/** Visits the first `count` opaque pixels from row `y0`, strip by strip; `visit` may change the blue value. */
function eachOpaque(ctx: CanvasRenderingContext2D, w: number, h: number, y0: number, count: number, visit: (n: number, blue: number) => number | void) {
  let n = 0;
  for (let y = y0; y < h && n < count; y += STRIP) {
    const rows = Math.min(STRIP, h - y);
    const img = ctx.getImageData(0, y, w, rows);
    const d = img.data;
    let changed = false;
    for (let i = 0; i < d.length && n < count; i += 4) {
      if (d[i + 3] !== 255) continue;
      const v = visit(n++, d[i + 2]);
      if (v !== undefined && v !== d[i + 2]) {
        d[i + 2] = v;
        changed = true;
      }
    }
    if (changed) ctx.putImageData(img, 0, y);
  }
  return n;
}

/** Hides `text` (e.g. "2026-11-05|hd|k3f9") in the canvas's pixels. Invisible: at most ±1 on one colour. */
export function embedTrace(ctx: CanvasRenderingContext2D, w: number, h: number, text: string) {
  const bytes = new TextEncoder().encode(MAGIC + text);
  const payload = new Uint8Array([bytes.length, ...bytes]);
  const bits = payload.length * 8;
  for (const y0 of starts(h)) eachOpaque(ctx, w, h, y0, bits, (b, blue) => (blue & 0xfe) | ((payload[b >> 3] >> (7 - (b & 7))) & 1));
}

/** Reads the trace back from an image drawn on a canvas, or null if there is none. */
export function readTrace(ctx: CanvasRenderingContext2D, w: number, h: number): string | null {
  for (const y0 of starts(h)) {
    const head: number[] = [];
    eachOpaque(ctx, w, h, y0, 8, (_, blue) => void head.push(blue & 1));
    const len = head.reduce((v, bit) => (v << 1) | bit, 0);
    if (!len) continue;
    const bits: number[] = [];
    eachOpaque(ctx, w, h, y0, (len + 1) * 8, (n, blue) => void (n >= 8 && bits.push(blue & 1)));
    if (bits.length < len * 8) continue;
    const bytes = Uint8Array.from({ length: len }, (_, k) => bits.slice(k * 8, k * 8 + 8).reduce((v, bit) => (v << 1) | bit, 0));
    const text = new TextDecoder().decode(bytes);
    if (text.startsWith(MAGIC)) return text.slice(MAGIC.length);
  }
  return null;
}

/** Redraws an image (a downloaded view) on a canvas so it can be stamped and traced, then encodes it as PNG. */
export async function protectImage(blob: Blob, opts: { watermark: boolean; trace: string; width?: number }): Promise<Blob> {
  const src = await createImageBitmap(blob);
  const scale = opts.width ? Math.min(1, opts.width / src.width) : 1;
  const w = Math.round(src.width * scale);
  const h = Math.round(src.height * scale);
  const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas too large");
  ctx.drawImage(src, 0, 0, w, h);
  src.close();
  if (opts.watermark) stampWatermark(ctx, w, h);
  embedTrace(ctx, w, h, opts.trace);
  const out = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
  if (!out) throw new Error("canvas too large");
  return out;
}
