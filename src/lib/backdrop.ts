/**
 * Puts a transparent render (the studio's mannequin view) on a photo-studio backdrop: a soft light-grey
 * gradient in the site's tones, a glow behind the figure and a contact shadow on the floor under it,
 * so it doesn't float. Returns a PNG of the same size.
 */
export async function onBackdrop(blob: Blob): Promise<Blob> {
  const img = await createImageBitmap(blob);
  const { width: w, height: h } = img;
  const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas too large");

  // Where the figure stands: its lowest opaque row and its horizontal extent, read on a small copy.
  const sw = 200, sh = Math.max(1, Math.round((200 * h) / w));
  const probe = Object.assign(document.createElement("canvas"), { width: sw, height: sh }).getContext("2d", { willReadFrequently: true })!;
  probe.drawImage(img, 0, 0, sw, sh);
  const a = probe.getImageData(0, 0, sw, sh).data;
  let bottom = -1, left = sw, right = 0;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (a[(y * sw + x) * 4 + 3] <= 40) continue;
      bottom = y;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }
  if (bottom < 0) bottom = sh - 1;
  const floorY = ((bottom + 0.5) / sh) * h;
  const cx = right >= left ? (((left + right) / 2 + 0.5) / sw) * w : w / 2;
  const spread = right >= left ? ((right - left + 1) / sw) * w : w * 0.4;

  // The cove: lighter at the top, a touch deeper towards the floor, then the floor itself.
  const wall = ctx.createLinearGradient(0, 0, 0, h);
  wall.addColorStop(0, "#f7f7f9");
  wall.addColorStop(Math.min(0.98, floorY / h), "#e6e6eb");
  wall.addColorStop(1, "#dcdce2");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, w, h);
  // A soft light behind the figure.
  const glow = ctx.createRadialGradient(cx, h * 0.42, 0, cx, h * 0.42, Math.max(w, h) * 0.55);
  glow.addColorStop(0, "rgba(255,255,255,0.85)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  // Darker corners, like a lit studio.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.hypot(w, h) * 0.6);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.10)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  // Contact shadow on the floor, under the feet (or the seat).
  const rx = spread * 0.55, ry = Math.max(4, h * 0.018);
  for (const [k, alpha] of [[1.6, 0.10], [1, 0.16], [0.55, 0.22]] as const) {
    const g = ctx.createRadialGradient(cx, floorY, 0, cx, floorY, rx * k);
    g.addColorStop(0, `rgba(0,0,0,${alpha})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.translate(cx, floorY);
    ctx.scale(1, (ry * k) / (rx * k));
    ctx.translate(-cx, -floorY);
    ctx.fillStyle = g;
    ctx.fillRect(cx - rx * k, floorY - rx * k, rx * k * 2, rx * k * 2);
    ctx.restore();
  }
  ctx.drawImage(img, 0, 0);
  img.close();
  const out = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
  if (!out) throw new Error("canvas too large");
  return out;
}
