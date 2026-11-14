import { onBackdrop } from "./backdrop";

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
