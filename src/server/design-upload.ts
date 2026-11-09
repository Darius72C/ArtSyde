"use server";

import { randomUUID } from "node:crypto";
import { presign, r2Config } from "@/server/r2";
import { allow, clientIp } from "@/server/rate-limit";
import { logActivity } from "@/server/log";

/*
 * The studio's print files: when a custom t-shirt goes into the cart, the browser draws each printed side
 * at the chosen quality (no watermark) and sends it straight to R2 under designs/, with a link signed here.
 * The order then points to these files (placeOrder checks they are ours) and the admin downloads them.
 */

/*
 * Anyone can call this action directly (it is a public address), not only the studio. So the links it signs are
 * limited: per visitor, enough for several t-shirts (2 sides each, and a retry), and for the whole site per day,
 * so a script can't fill the storage. Files no order uses are deleted later (src/app/api/cron/nettoyage).
 */
const PER_VISITOR = { max: 12, windowMs: 60 * 60 * 1000 }; // 12 links an hour
const SITE_PER_DAY = { max: 400, windowMs: 24 * 60 * 60 * 1000 };

export type DesignUpload = { ok: true; uploadUrl: string; publicUrl: string } | { ok: false; message: string };

const MAX_SIZE = 80 * 1024 * 1024; // an Ultra HD side is a ~7 600 × 8 400 px PNG

export async function presignDesignFile(input: { side: "front" | "back"; size: number }): Promise<DesignUpload> {
  const cfg = r2Config();
  if (!cfg) return { ok: false, message: "Le stockage des fichiers n'est pas configuré." };
  const side = input?.side === "back" ? "back" : input?.side === "front" ? "front" : null;
  const size = Number(input?.size);
  if (!side || !Number.isInteger(size) || size <= 0 || size > MAX_SIZE) return { ok: false, message: "Fichier d'impression refusé." };
  const ip = await clientIp();
  if (!(await allow(`print-upload:ip:${ip}`, PER_VISITOR.max, PER_VISITOR.windowMs))) {
    return { ok: false, message: "Trop d'envois en peu de temps. Réessaie dans une heure, ou écris-nous si ça bloque ta commande." };
  }
  if (!(await allow("print-upload:site", SITE_PER_DAY.max, SITE_PER_DAY.windowMs))) {
    // Written once a day in the journal, not at every refused file.
    if (await allow("print-upload:cap-noted", 1, SITE_PER_DAY.windowMs)) await logActivity("studio.upload_cap", `Plafond quotidien des fichiers d'impression atteint (${SITE_PER_DAY.max}) : envois bloqués jusqu'à demain`, { ip }, "système");
    return { ok: false, message: "Les envois sont momentanément suspendus. Réessaie plus tard, ou écris-nous." };
  }
  const month = new Date().toISOString().slice(0, 7);
  const key = `designs/${month}/${randomUUID()}-${side === "front" ? "devant" : "dos"}.png`;
  // Type and length are signed: R2 refuses any other file than this PNG.
  const uploadUrl = presign(cfg, "PUT", key, { "content-type": "image/png", "content-length": String(size) }, 600);
  return { ok: true, uploadUrl, publicUrl: `${cfg.publicUrl}/${key}` };
}
