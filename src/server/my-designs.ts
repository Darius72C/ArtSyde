"use server";

import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { getMyCustomer } from "@/server/account";
import { deleteObject, keyFromPublicUrl, presign, r2Config } from "@/server/r2";
import { logActivity, logError } from "@/server/log";
import { DESIGN_SAVE_CREDITS, FREE_DESIGNS } from "@/lib/studio";

/*
 * The customer's own creations from the studio (SavedDesign): saved to their account, listed in /compte,
 * reopened in the studio (/studio?design=<id>). The images of a design are sent by the browser straight to
 * R2 under saved/<customer id>/ with a link signed here; the design keeps their links, its layout (position,
 * size, rotation of each image, the text) and a capture of the 3D t-shirt.
 */

export type SavedImage = { id: string; src: string; nw: number; nh: number; x: number; y: number; scale: number; rot: number };
export type SavedText = { value: string; font: "serif" | "italic" | "sans"; color: string; x: number; y: number; size: number; rot: number };
export type SavedSide = { images: SavedImage[]; text?: SavedText };
export type MyDesign = { id: string; name: string; teeColor: string; front: SavedSide; back: SavedSide; previewUrl: string | null; updatedAt: string };
export type MyDesignSummary = Omit<MyDesign, "front" | "back">;

const MAX_DESIGNS = 100; // per customer, paid ones included
const MAX_IMAGE = 20 * 1024 * 1024;
const MAX_PREVIEW = 200_000; // the 220×220 PNG capture, as a data URL
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

const prefixOf = (customerId: string) => `saved/${customerId}/`;

/** A signed link to send one image of a design (signed-in customers only). */
export async function presignMyDesignImage(input: { type: string; size: number }): Promise<{ ok: true; uploadUrl: string; publicUrl: string } | { ok: false; message: string }> {
  const me = await getMyCustomer();
  if (!me) return { ok: false, message: "Connecte-toi pour sauvegarder tes créations." };
  const cfg = r2Config();
  if (!cfg) return { ok: false, message: "Le stockage des fichiers n'est pas configuré." };
  const ext = TYPES[input?.type];
  const size = Number(input?.size);
  if (!ext || !Number.isInteger(size) || size <= 0 || size > MAX_IMAGE) return { ok: false, message: "Image refusée (PNG, JPG ou WEBP, 20 Mo max)." };
  const key = `${prefixOf(me.customer.id)}${randomUUID()}.${ext}`;
  const uploadUrl = presign(cfg, "PUT", key, { "content-type": input.type, "content-length": String(size) }, 600);
  return { ok: true, uploadUrl, publicUrl: `${cfg.publicUrl}/${key}` };
}

const num = (v: unknown, min: number, max: number, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** Keeps only a well-formed side whose images are this customer's own files. */
function cleanSide(raw: unknown, ownPrefix: string): SavedSide | null {
  const cfg = r2Config();
  const s = (raw ?? {}) as { images?: unknown; text?: unknown };
  const images: SavedImage[] = [];
  for (const i of Array.isArray(s.images) ? s.images.slice(0, 8) : []) {
    const src = str(i?.src, 600);
    if (!cfg || !keyFromPublicUrl(cfg, src)?.startsWith(ownPrefix)) return null;
    images.push({
      id: str(i.id, 60) || randomUUID(),
      src,
      nw: Math.round(num(i.nw, 1, 20000, 1000)),
      nh: Math.round(num(i.nh, 1, 20000, 1000)),
      x: num(i.x, 0, 1, 0.5),
      y: num(i.y, 0, 1, 0.4),
      scale: num(i.scale, 0.01, 3, 0.34),
      rot: num(i.rot, -360, 360, 0),
    });
  }
  const t = s.text as Partial<SavedText> | undefined;
  const text: SavedText | undefined =
    t && typeof t.value === "string" && t.value
      ? {
          value: t.value.slice(0, 200),
          font: t.font === "serif" || t.font === "sans" ? t.font : "italic",
          color: /^#[0-9a-f]{3,8}$/i.test(t.color ?? "") ? t.color! : "#efe9df",
          x: num(t.x, 0, 1, 0.5),
          y: num(t.y, 0, 1, 0.27),
          size: num(t.size, 0.01, 1, 0.085),
          rot: num(t.rot, -360, 360, 0),
        }
      : undefined;
  return { images, ...(text ? { text } : {}) };
}

const asSide = (v: unknown): SavedSide => {
  const s = (v ?? {}) as SavedSide;
  return { images: Array.isArray(s.images) ? s.images : [], ...(s.text ? { text: s.text } : {}) };
};

export type SaveResult =
  | { ok: true; id: string; name: string; spent: number; balance?: number }
  | { ok: false; message: string; reason?: "pay" | "not-enough"; cost?: number; balance?: number };

/**
 * Saves a new design, or updates one of the customer's own (`id`, always free). The first FREE_DESIGNS
 * are free; past them a new one costs DESIGN_SAVE_CREDITS, taken only when the browser says `pay` (after
 * asking the customer), in the same transaction that creates it.
 */
export async function saveMyDesign(input: { id?: string; name: string; teeColor: string; front: unknown; back: unknown; preview?: string; pay?: boolean }): Promise<SaveResult> {
  const me = await getMyCustomer();
  if (!me) return { ok: false, message: "Connecte-toi pour sauvegarder tes créations." };
  const own = prefixOf(me.customer.id);
  const front = cleanSide(input?.front, own);
  const back = cleanSide(input?.back, own);
  if (!front || !back) return { ok: false, message: "Une image de la création n'a pas pu être enregistrée. Réessaie." };
  if (!front.images.length && !front.text && !back.images.length && !back.text) return { ok: false, message: "Ajoute une image ou un texte avant de sauvegarder." };
  const name = str(input?.name, 60).trim() || "Ma création";
  const teeColor = /^#[0-9a-f]{6}$/i.test(input?.teeColor ?? "") ? input.teeColor.toLowerCase() : "#f4f2ec";
  const preview = typeof input?.preview === "string" && input.preview.startsWith("data:image/") && input.preview.length <= MAX_PREVIEW ? input.preview : undefined;
  const data = { name, teeColor, front, back, ...(preview ? { previewUrl: preview } : {}) };
  try {
    if (input?.id) {
      const mine = await db.savedDesign.findFirst({ where: { id: input.id, customerId: me.customer.id }, select: { id: true } });
      if (mine) {
        await db.savedDesign.update({ where: { id: mine.id }, data });
        await logActivity("design.updated", `${me.user.name || me.user.email} a mis à jour sa création « ${name} »`, { designId: mine.id }, `client:${me.customer.id}`);
        return { ok: true, id: mine.id, name, spent: 0 };
      }
    }
    const customerId = me.customer.id;
    const r = await db.$transaction(async (tx): Promise<SaveResult> => {
      const count = await tx.savedDesign.count({ where: { customerId } });
      if (count >= MAX_DESIGNS) return { ok: false, message: `${MAX_DESIGNS} créations maximum : supprime-en une dans ton compte.` };
      const cost = count >= FREE_DESIGNS ? DESIGN_SAVE_CREDITS : 0;
      let balance: number | undefined;
      if (cost) {
        balance = (await tx.creditEntry.aggregate({ where: { customerId }, _sum: { amount: true } }))._sum.amount ?? 0;
        const why = `Tes ${FREE_DESIGNS} créations gratuites sont utilisées : une de plus coûte ${cost} crédit${cost > 1 ? "s" : ""}.`;
        if (balance < cost) return { ok: false, reason: "not-enough", cost, balance, message: `${why} Recharge tes crédits ou supprime une création dans ton compte.` };
        if (!input?.pay) return { ok: false, reason: "pay", cost, balance, message: why };
      }
      const row = await tx.savedDesign.create({ data: { ...data, customerId }, select: { id: true } });
      if (cost) {
        await tx.creditEntry.create({ data: { customerId, amount: -cost, reason: "DESIGN_SAVE", designId: row.id } });
        balance = balance! - cost;
      }
      return { ok: true, id: row.id, name, spent: cost, balance };
    });
    if (r.ok) {
      const paid = r.spent ? ` (${r.spent} crédit${r.spent > 1 ? "s" : ""}, au-delà des ${FREE_DESIGNS} gratuites)` : "";
      await logActivity("design.saved", `${me.user.name || me.user.email} a sauvegardé une création : « ${name} »${paid}`, { designId: r.id, spent: r.spent }, `client:${customerId}`);
    }
    return r;
  } catch (e) {
    await logError("saveMyDesign", e);
    return { ok: false, message: "La création n'a pas pu être sauvegardée. Réessaie." };
  }
}

/** The customer's creations, newest first (without their layers). */
export async function listMyDesigns(): Promise<MyDesignSummary[]> {
  const me = await getMyCustomer();
  if (!me) return [];
  const rows = await db.savedDesign.findMany({ where: { customerId: me.customer.id }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, teeColor: true, previewUrl: true, updatedAt: true } });
  return rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }));
}

/** One of the customer's creations, to reopen it in the studio. */
export async function getMyDesign(id: string): Promise<MyDesign | null> {
  const me = await getMyCustomer();
  if (!me || typeof id !== "string") return null;
  const r = await db.savedDesign.findFirst({ where: { id, customerId: me.customer.id } });
  return r ? { id: r.id, name: r.name, teeColor: r.teeColor, front: asSide(r.front), back: asSide(r.back), previewUrl: r.previewUrl, updatedAt: r.updatedAt.toISOString() } : null;
}

/** Deletes one of the customer's creations, and its images no other creation of theirs uses. */
export async function deleteMyDesign(id: string): Promise<{ ok: boolean }> {
  const me = await getMyCustomer();
  if (!me || typeof id !== "string") return { ok: false };
  const r = await db.savedDesign.findFirst({ where: { id, customerId: me.customer.id } });
  if (!r) return { ok: false };
  const srcs = (d: { front: unknown; back: unknown }) => [...asSide(d.front).images, ...asSide(d.back).images].map((i) => i.src);
  const others = await db.savedDesign.findMany({ where: { customerId: me.customer.id, id: { not: r.id } }, select: { front: true, back: true } });
  const kept = new Set(others.flatMap(srcs));
  await db.savedDesign.delete({ where: { id: r.id } });
  const cfg = r2Config();
  if (cfg) {
    for (const src of new Set(srcs(r))) {
      const key = keyFromPublicUrl(cfg, src);
      if (key?.startsWith(prefixOf(me.customer.id)) && !kept.has(src)) await deleteObject(cfg, key);
    }
  }
  await logActivity("design.deleted", `${me.user.name || me.user.email} a supprimé sa création « ${r.name} »`, { designId: r.id }, `client:${me.customer.id}`);
  return { ok: true };
}
