"use server";

import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Prisma, ProductTag, Size } from "@/generated/prisma/client";
import { CATALOG_TAG } from "@/lib/catalog";
import { productSlug } from "@/lib/products";
import { deleteObject, keyFromPublicUrl, presign, r2Config } from "@/lib/r2";
import { requireAdmin } from "./auth";

/*
 * Catalogue edits from /admin/produits. Every action checks the admin session itself
 * (on top of proxy.ts) and expires the shop's cached catalogue, so the shop shows the change
 * on its next request.
 */

export type ProductFormState = { errors?: Partial<Record<"name" | "price" | "oldPrice" | "colors" | "sizes", string>>; message?: string; saved?: boolean };

// Any tee colour the workshop offers, picked with the colour selector: a #rrggbb code each.
const HEX = /^#[0-9a-f]{6}$/;
const MAX_COLORS = 24;
const PHOTO_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
const MAX_PHOTO = 8 * 1024 * 1024; // 8 Mo
const MAX_PHOTOS = 12;

const price = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/[\s ]/g, ""));
  return Number.isInteger(n) ? n : NaN;
};

export async function saveProduct(_prev: ProductFormState, form: FormData): Promise<ProductFormState> {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const priceXof = price(form.get("price"));
  const oldRaw = String(form.get("oldPrice") ?? "").trim();
  const oldPriceXof = oldRaw ? price(oldRaw) : null;
  const tagRaw = String(form.get("tag") ?? "");
  const tag = Object.values(ProductTag).find((t) => t === tagRaw) ?? null;
  const colors = [...new Set(form.getAll("colors").map((v) => String(v).trim().toLowerCase()))].filter((v) => HEX.test(v)).slice(0, MAX_COLORS);
  const sizes = Object.values(Size).filter((s) => form.getAll("sizes").includes(s));
  const active = form.get("active") === "on";

  const errors: ProductFormState["errors"] = {};
  if (name.length < 2) errors.name = "Donne un nom au modèle.";
  if (!(priceXof >= 500 && priceXof <= 500_000)) errors.price = "Un prix entre 500 et 500 000 FCFA.";
  if (oldPriceXof !== null && !(oldPriceXof > priceXof && oldPriceXof <= 1_000_000)) errors.oldPrice = "Le prix barré doit être plus élevé que le prix.";
  if (!colors.length) errors.colors = "Ajoute au moins une couleur.";
  if (!sizes.length) errors.sizes = "Choisis au moins une taille.";
  if (Object.keys(errors).length) return { errors };

  const data = { name, priceXof, oldPriceXof, tag, colors, sizes, active };
  let created: string | null = null;
  try {
    if (id) {
      await db.product.update({ where: { id }, data });
    } else {
      // A slug from the name, made unique ("horizon", "horizon-2", …).
      const base = productSlug(name) || "modele";
      const taken = new Set((await db.product.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } })).map((p) => p.slug));
      let slug = base;
      for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
      created = (await db.product.create({ data: { ...data, slug }, select: { id: true } })).id;
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") return { message: "Ce modèle n'existe plus." };
    console.error("saveProduct failed", e);
    return { message: "Le modèle n'a pas pu être enregistré. Réessaie." };
  }
  updateTag(CATALOG_TAG);
  if (created) redirect(`/admin/produits/${created}?nouveau=1`);
  return { saved: true };
}

// ---------- Photos (Cloudflare R2) ----------

export type PresignResult = { ok: true; uploadUrl: string; publicUrl: string; contentType: string } | { ok: false; message: string };

/** Step 1 of an upload: checks the file's type and size, then signs a PUT the browser sends straight to R2. */
export async function presignPhoto(productId: string, file: { type: string; size: number }): Promise<PresignResult> {
  await requireAdmin();
  const cfg = r2Config();
  if (!cfg) return { ok: false, message: "Le stockage des photos n'est pas configuré (variables R2_* dans .env)." };
  const ext = PHOTO_TYPES[file?.type as keyof typeof PHOTO_TYPES];
  if (!ext) return { ok: false, message: "Format accepté : JPG, PNG ou WebP." };
  const size = Number(file?.size);
  if (!Number.isInteger(size) || size <= 0 || size > MAX_PHOTO) return { ok: false, message: "8 Mo maximum par photo." };
  const product = await db.product.findUnique({ where: { id: productId }, select: { mockups: true } });
  if (!product) return { ok: false, message: "Ce modèle n'existe plus." };
  if (product.mockups.length >= MAX_PHOTOS) return { ok: false, message: `${MAX_PHOTOS} photos maximum par modèle.` };

  const key = `products/${productId}/${randomUUID()}.${ext}`;
  // Type and length are signed: R2 refuses any other file than the one checked here.
  const uploadUrl = presign(cfg, "PUT", key, { "content-type": file.type, "content-length": String(size) });
  return { ok: true, uploadUrl, publicUrl: `${cfg.publicUrl}/${key}`, contentType: file.type };
}

/** Step 2: once R2 has the file, adds its URL to the product's photos (last). */
export async function addPhoto(productId: string, publicUrl: string) {
  await requireAdmin();
  const cfg = r2Config();
  const key = cfg ? keyFromPublicUrl(cfg, publicUrl) : null;
  if (!key?.startsWith(`products/${productId}/`)) return { ok: false as const, message: "Photo refusée." };
  const p = await db.product.findUnique({ where: { id: productId }, select: { mockups: true } });
  if (!p) return { ok: false as const, message: "Ce modèle n'existe plus." };
  if (!p.mockups.includes(publicUrl)) await db.product.update({ where: { id: productId }, data: { mockups: [...p.mockups, publicUrl].slice(0, MAX_PHOTOS) } });
  updateTag(CATALOG_TAG);
  return { ok: true as const };
}

/** Moves a photo one place earlier (-1) or later (+1). The first photo is the one the shop shows. */
export async function movePhoto(productId: string, url: string, by: -1 | 1) {
  await requireAdmin();
  const p = await db.product.findUnique({ where: { id: productId }, select: { mockups: true } });
  if (!p) return;
  const list = [...p.mockups];
  const i = list.indexOf(url);
  const j = i + by;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await db.product.update({ where: { id: productId }, data: { mockups: list } });
  updateTag(CATALOG_TAG);
}

/** Removes a photo from the product, then deletes the file from R2. */
export async function removePhoto(productId: string, url: string) {
  await requireAdmin();
  const p = await db.product.findUnique({ where: { id: productId }, select: { mockups: true } });
  if (!p || !p.mockups.includes(url)) return;
  await db.product.update({ where: { id: productId }, data: { mockups: p.mockups.filter((m) => m !== url) } });
  updateTag(CATALOG_TAG);
  const cfg = r2Config();
  const key = cfg ? keyFromPublicUrl(cfg, url) : null;
  if (cfg && key?.startsWith(`products/${productId}/`)) await deleteObject(cfg, key);
}
