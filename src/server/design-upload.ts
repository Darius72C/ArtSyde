"use server";

import { randomUUID } from "node:crypto";
import { presign, r2Config } from "@/server/r2";

/*
 * The studio's print files: when a custom t-shirt goes into the cart, the browser draws each printed side
 * at the chosen quality (no watermark) and sends it straight to R2 under designs/, with a link signed here.
 * The order then points to these files (placeOrder checks they are ours) and the admin downloads them.
 */

export type DesignUpload = { ok: true; uploadUrl: string; publicUrl: string } | { ok: false; message: string };

const MAX_SIZE = 80 * 1024 * 1024; // an Ultra HD side is a ~7 600 × 8 400 px PNG

export async function presignDesignFile(input: { side: "front" | "back"; size: number }): Promise<DesignUpload> {
  const cfg = r2Config();
  if (!cfg) return { ok: false, message: "Le stockage des fichiers n'est pas configuré." };
  const side = input?.side === "back" ? "back" : input?.side === "front" ? "front" : null;
  const size = Number(input?.size);
  if (!side || !Number.isInteger(size) || size <= 0 || size > MAX_SIZE) return { ok: false, message: "Fichier d'impression refusé." };
  const month = new Date().toISOString().slice(0, 7);
  const key = `designs/${month}/${randomUUID()}-${side === "front" ? "devant" : "dos"}.png`;
  // Type and length are signed: R2 refuses any other file than this PNG.
  const uploadUrl = presign(cfg, "PUT", key, { "content-type": "image/png", "content-length": String(size) }, 600);
  return { ok: true, uploadUrl, publicUrl: `${cfg.publicUrl}/${key}` };
}
