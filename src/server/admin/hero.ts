"use server";

import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { db } from "@/server/db";
import { HERO_SLOTS, HERO_TAG } from "@/server/hero";
import { deleteObject, keyFromPublicUrl, presign, r2Config } from "@/server/r2";
import { requireAdmin } from "./auth";
import { logActivity } from "@/server/log";

/*
 * The home page's hero cards, from /admin/accueil: ad visuals, one image per place (front, left, right),
 * stored on R2 under hero/. Every action checks the admin session itself.
 */

const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
const MAX_SIZE = 20 * 1024 * 1024; // 20 Mo, like the product photos

const validSlot = (slot: unknown): slot is number => HERO_SLOTS.some((s) => s === slot);

/** The R2 key of a hero image, or null if the URL is not one. */
function heroKey(url: string) {
  const cfg = r2Config();
  const key = cfg ? keyFromPublicUrl(cfg, url) : null;
  return cfg && key?.startsWith("hero/") ? { cfg, key } : null;
}
async function deleteHeroFile(url: string | undefined) {
  const own = url ? heroKey(url) : null;
  if (own) await deleteObject(own.cfg, own.key).catch(() => {});
}

export type HeroPresign = { ok: true; uploadUrl: string; publicUrl: string; contentType: string } | { ok: false; message: string };

/** Step 1 of an upload: checks the file, then signs a PUT the browser sends straight to R2. */
export async function presignHeroImage(slot: number, file: { type: string; size: number }): Promise<HeroPresign> {
  await requireAdmin();
  if (!validSlot(slot)) return { ok: false, message: "Carte inconnue." };
  const cfg = r2Config();
  if (!cfg) return { ok: false, message: "Le stockage des photos n'est pas configuré (variables R2_* dans .env)." };
  const ext = TYPES[file?.type as keyof typeof TYPES];
  if (!ext) return { ok: false, message: "Format accepté : JPG, PNG ou WebP." };
  const size = Number(file?.size);
  if (!Number.isInteger(size) || size <= 0 || size > MAX_SIZE) return { ok: false, message: "20 Mo maximum par image." };
  const key = `hero/${randomUUID()}.${ext}`;
  const uploadUrl = presign(cfg, "PUT", key, { "content-type": file.type, "content-length": String(size) });
  return { ok: true, uploadUrl, publicUrl: `${cfg.publicUrl}/${key}`, contentType: file.type };
}

/** Step 2: the uploaded image becomes this card's; the previous one is deleted from R2. */
export async function setHeroImage(slot: number, imageUrl: string): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  if (!validSlot(slot) || !heroKey(imageUrl)) return { ok: false, message: "Image refusée." };
  const before = await db.heroCard.findUnique({ where: { slot } });
  await db.heroCard.upsert({ where: { slot }, create: { slot, imageUrl }, update: { imageUrl } });
  updateTag(HERO_TAG);
  await logActivity("hero.updated", `Carte d'accueil ${slot + 1} changée`, { slot }, "admin");
  if (before && before.imageUrl !== imageUrl) await deleteHeroFile(before.imageUrl);
  return { ok: true };
}

/** Empties a card and deletes its image. */
export async function clearHeroCard(slot: number): Promise<void> {
  await requireAdmin();
  if (!validSlot(slot)) return;
  const card = await db.heroCard.findUnique({ where: { slot } });
  if (!card) return;
  await db.heroCard.delete({ where: { slot } });
  updateTag(HERO_TAG);
  await deleteHeroFile(card.imageUrl);
}
