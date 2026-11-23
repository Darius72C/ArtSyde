import qrcode from "qrcode-generator";
import { onBackdrop } from "./backdrop";
import { optimizedSrc } from "./imageUrl";

/**
 * The image shared from the "Porté" view: the mannequin on the studio backdrop, with the product's name and
 * price and the shop's address at the bottom.
 */
export async function shareCard(render: Blob, lines: { title: string; price: string; site: string }): Promise<Blob> {
  const img = await createImageBitmap(await onBackdrop(render));
  const { width: w, height: h } = img;
  const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas too large");
  ctx.drawImage(img, 0, 0);
  img.close();
  await document.fonts?.ready;
  const u = w / 1000; // sizes below are for a 1000 px wide card
  const font = '"Inter Display", Inter, system-ui, sans-serif';
  // A soft white band at the bottom for the text.
  const g = ctx.createLinearGradient(0, h - 260 * u, 0, h);
  g.addColorStop(0, "rgba(247,247,249,0)");
  g.addColorStop(0.45, "rgba(247,247,249,0.92)");
  g.addColorStop(1, "rgba(247,247,249,0.98)");
  ctx.fillStyle = g;
  ctx.fillRect(0, h - 260 * u, w, 260 * u);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#1d1d1f";
  ctx.font = `700 ${58 * u}px ${font}`;
  ctx.fillText(lines.title, 56 * u, h - 112 * u, w - 112 * u);
  ctx.fillStyle = "#6e6e73";
  ctx.font = `500 ${36 * u}px ${font}`;
  ctx.fillText(lines.price, 56 * u, h - 60 * u);
  ctx.textAlign = "right";
  ctx.fillStyle = "#1d1d1f";
  ctx.font = `600 ${36 * u}px ${font}`;
  ctx.fillText(lines.site, w - 56 * u, h - 60 * u);
  const out = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
  if (!out) throw new Error("canvas too large");
  return out;
}

/** Shares a file with the system sheet (WhatsApp, Instagram…) where it can, else downloads it. */
export async function shareOrDownload(blob: Blob, name: string, text: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], name, { type: blob.type });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    }
  }
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return "downloaded";
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // the storage allows the site: the canvas stays exportable
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

/** Draws `img` to cover the box, cut to rounded corners. */
function cover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.max(w / img.width, h / img.height), sw = w / k, sh = h / k;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  ctx.restore();
}

/** A transparent render cut around what it shows (a small margin, at the panel's `aspect` w/h). */
async function cropToSubject(blob: Blob, aspect: number): Promise<Blob> {
  const img = await createImageBitmap(blob);
  const sw = 160, sh = Math.max(1, Math.round((160 * img.height) / img.width));
  const probe = Object.assign(document.createElement("canvas"), { width: sw, height: sh }).getContext("2d", { willReadFrequently: true })!;
  probe.drawImage(img, 0, 0, sw, sh);
  const a = probe.getImageData(0, 0, sw, sh).data;
  let x0 = sw, y0 = sh, x1 = -1, y1 = -1;
  for (let y = 0; y < sh; y++)
    for (let x = 0; x < sw; x++)
      if (a[(y * sw + x) * 4 + 3] > 30) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) return blob;
  const k = img.width / sw;
  let h = (y1 - y0 + 1) * k * 1.12, w = (x1 - x0 + 1) * k * 1.12;
  if (w / h < aspect) w = h * aspect;
  else h = w / aspect;
  const cx = ((x0 + x1 + 1) / 2) * k, cy = ((y0 + y1 + 1) / 2) * k;
  const out = Object.assign(document.createElement("canvas"), { width: Math.round(w), height: Math.round(h) });
  out.getContext("2d")!.drawImage(img, cx - w / 2, cy - h / 2, w, h, 0, 0, w, h);
  img.close();
  return (await new Promise<Blob | null>((r) => out.toBlob(r, "image/png"))) ?? blob;
}

/**
 * The image shared from the "Porté" view: the mannequin front and back on the studio backdrop, the product's
 * photo, its name, price and sizes, and a QR code with the link to the product.
 */
export async function wornShareCard(o: { front: Blob; back: Blob; photo?: string; title: string; price: string; sizes: string; link: string; labels?: { front: string; back: string; scan: string } }): Promise<Blob> {
  const labels = o.labels ?? { front: "Devant", back: "Dos", scan: "Scanne pour le commander" };
  const W = 1080, H = 1290, M = 40, G = 20;
  const c = Object.assign(document.createElement("canvas"), { width: W, height: H });
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas too large");
  const [front, back, photo] = await Promise.all([
    cropToSubject(o.front, 0.8).then(onBackdrop).then(createImageBitmap),
    cropToSubject(o.back, 0.8).then(onBackdrop).then(createImageBitmap),
    o.photo ? loadImage(optimizedSrc(o.photo, 828)) : Promise.resolve(null),
  ]);
  await document.fonts?.ready;
  const font = '"Inter Display", Inter, system-ui, sans-serif';
  ctx.fillStyle = "#f7f7f9";
  ctx.fillRect(0, 0, W, H);

  // Front and back, side by side.
  const pw = (W - 2 * M - G) / 2, ph = Math.round(pw * 1.25);
  ([[front, labels.front], [back, labels.back]] as const).forEach(([img, label], i) => {
    const x = M + i * (pw + G);
    cover(ctx, img, x, M, pw, ph, 28);
    ctx.font = `600 26px ${font}`;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.roundRect(x + 20, M + 20, tw + 36, 48, 24);
    ctx.fill();
    ctx.fillStyle = "#1d1d1f";
    ctx.fillText(label, x + 38, M + 53);
  });
  front.close();
  back.close();

  // The photo, then the name, price and sizes, then the QR code.
  const y = M + ph + G, bh = H - y - M - 90 - G;
  let tx = M;
  if (photo) {
    cover(ctx, photo, M, y, Math.round(bh * 0.8), bh, 24);
    tx = M + Math.round(bh * 0.8) + 32;
  }
  const qrSize = 220, qx = W - M - qrSize, qy = y + (bh - qrSize) / 2;
  ctx.fillStyle = "#1d1d1f";
  ctx.font = `800 64px ${font}`;
  ctx.fillText(o.title, tx, y + 84, qx - tx - 24);
  ctx.font = `600 38px ${font}`;
  ctx.fillText(o.price, tx, y + 144, qx - tx - 24);
  ctx.fillStyle = "#6e6e73";
  ctx.font = `500 28px ${font}`;
  ctx.fillText(o.sizes, tx, y + 194, qx - tx - 24);
  ctx.fillText(labels.scan, tx, y + bh - 16, qx - tx - 24);
  const qr = qrcode(0, "M");
  qr.addData(o.link);
  qr.make();
  const n = qr.getModuleCount(), cell = Math.floor(qrSize / (n + 4)), off = (qrSize - cell * n) / 2;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(qx, qy, qrSize, qrSize, 16);
  ctx.fill();
  ctx.fillStyle = "#1d1d1f";
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (qr.isDark(r, col)) ctx.fillRect(qx + off + col * cell, qy + off + r * cell, cell, cell);

  // The address, in a bar at the bottom.
  ctx.beginPath();
  ctx.roundRect(M, H - M - 90, W - 2 * M, 90, 45);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `600 34px ${font}`;
  ctx.textAlign = "center";
  ctx.fillText(o.link.replace(/^https?:\/\/(www\.)?/, "").replace(/\?.*$/, ""), W / 2, H - M - 33);
  const out = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
  if (!out) throw new Error("canvas too large");
  return out;
}
