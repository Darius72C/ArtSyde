"use server";

import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { Prisma, ProductTag, Size } from "@/generated/prisma/client";
import { CATALOG_TAG } from "@/server/catalog";
import { PRINT_SIDES, parsePrint3D, productSlug, type Print3D } from "@/lib/products";
import { deleteObject, keyFromPublicUrl, presign, r2Config } from "@/server/r2";
import { requireAdmin } from "./auth";

/*
 * Catalogue edits from /admin/produits. Every action checks the admin session itself
 * (on top of proxy.ts) and expires the shop's cached catalogue, so the shop shows the change
 * on its next request.
 */

export type ProductFormState = {
  errors?: Partial<Record<"name" | "price" | "oldPrice" | "colors" | "sizes", string>>;
  message?: string;
  saved?: boolean;
  /** The new product's id, when the form still has photos to upload before leaving (`then=upload`). */
  created?: string;
};

// Any tee colour the workshop offers, picked with the colour selector: a #rrggbb code each.
const HEX = /^#[0-9a-f]{6}$/;
const MAX_COLORS = 24;
const PHOTO_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
const MAX_PHOTO = 20 * 1024 * 1024; // 20 Mo
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
  if (created) {
    // Photos picked in the form are uploaded by the browser now that the product exists; it then opens the product.
    if (form.get("then") === "upload") return { saved: true, created };
    redirect(`/admin/produits/${created}?nouveau=1`);
  }
  return { saved: true };
}

// ---------- Photos, mockups and 3D prints (Cloudflare R2) ----------

/**
 * A product's pictures, all stored on R2 under products/<id>/:
 * "photos" (the shop's photos, Product.mockups), "flats" (flat mockups, Product.flatMockups)
 * and "print" (an image printed on the 3D t-shirt, referenced by Product.print3d).
 */
export type MediaKind = "photos" | "flats" | "print";
type ListKind = Exclude<MediaKind, "print">;
const COLUMN = { photos: "mockups", flats: "flatMockups" } as const satisfies Record<ListKind, string>;
const LIMIT_MESSAGE: Record<ListKind, string> = { photos: `${MAX_PHOTOS} photos maximum par modèle.`, flats: `${MAX_PHOTOS} mockups maximum par modèle.` };

async function readList(productId: string, kind: ListKind): Promise<string[] | null> {
  const p = await db.product.findUnique({ where: { id: productId }, select: { mockups: true, flatMockups: true } });
  return p ? p[COLUMN[kind]] : null;
}
const writeList = (productId: string, kind: ListKind, list: string[]) => db.product.update({ where: { id: productId }, data: { [COLUMN[kind]]: list } });

/** The R2 key of a file of this product, or null if the URL is not one of its files. */
function ownKey(productId: string, url: string) {
  const cfg = r2Config();
  const key = cfg ? keyFromPublicUrl(cfg, url) : null;
  return cfg && key?.startsWith(`products/${productId}/`) ? { cfg, key } : null;
}
async function deleteFile(productId: string, url: string) {
  const own = ownKey(productId, url);
  if (own) await deleteObject(own.cfg, own.key);
}

export type PresignResult = { ok: true; uploadUrl: string; publicUrl: string; contentType: string } | { ok: false; message: string };

/** Step 1 of an upload: checks the file's type and size, then signs a PUT the browser sends straight to R2. */
export async function presignPhoto(productId: string, file: { type: string; size: number }, kind: MediaKind = "photos"): Promise<PresignResult> {
  await requireAdmin();
  const cfg = r2Config();
  if (!cfg) return { ok: false, message: "Le stockage des photos n'est pas configuré (variables R2_* dans .env)." };
  const ext = PHOTO_TYPES[file?.type as keyof typeof PHOTO_TYPES];
  if (!ext) return { ok: false, message: "Format accepté : JPG, PNG ou WebP." };
  const size = Number(file?.size);
  if (!Number.isInteger(size) || size <= 0 || size > MAX_PHOTO) return { ok: false, message: "20 Mo maximum par image." };
  if (kind === "print") {
    if (!(await db.product.findUnique({ where: { id: productId }, select: { id: true } }))) return { ok: false, message: "Ce modèle n'existe plus." };
  } else {
    const list = await readList(productId, kind);
    if (!list) return { ok: false, message: "Ce modèle n'existe plus." };
    if (list.length >= MAX_PHOTOS) return { ok: false, message: LIMIT_MESSAGE[kind] };
  }

  const key = `products/${productId}/${randomUUID()}.${ext}`;
  // Type and length are signed: R2 refuses any other file than the one checked here.
  const uploadUrl = presign(cfg, "PUT", key, { "content-type": file.type, "content-length": String(size) });
  return { ok: true, uploadUrl, publicUrl: `${cfg.publicUrl}/${key}`, contentType: file.type };
}

/** Step 2: once R2 has the file, adds its URL to the product's photos or mockups (last). */
export async function addPhoto(productId: string, publicUrl: string, kind: ListKind = "photos") {
  await requireAdmin();
  if (!ownKey(productId, publicUrl)) return { ok: false as const, message: "Image refusée." };
  const list = await readList(productId, kind);
  if (!list) return { ok: false as const, message: "Ce modèle n'existe plus." };
  if (!list.includes(publicUrl)) await writeList(productId, kind, [...list, publicUrl].slice(0, MAX_PHOTOS));
  updateTag(CATALOG_TAG);
  return { ok: true as const };
}

/** Moves a photo or mockup one place earlier (-1) or later (+1). The first photo is the one the shop shows. */
export async function movePhoto(productId: string, url: string, by: -1 | 1, kind: ListKind = "photos") {
  await requireAdmin();
  const list = await readList(productId, kind);
  if (!list) return;
  const i = list.indexOf(url);
  const j = i + by;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await writeList(productId, kind, list);
  updateTag(CATALOG_TAG);
}

/** Removes a photo or mockup from the product, then deletes the file from R2. */
export async function removePhoto(productId: string, url: string, kind: ListKind = "photos") {
  await requireAdmin();
  const list = await readList(productId, kind);
  if (!list || !list.includes(url)) return;
  await writeList(productId, kind, list.filter((m) => m !== url));
  updateTag(CATALOG_TAG);
  await deleteFile(productId, url);
}

/**
 * Saves the print on the 3D t-shirt (front and back). Only images uploaded to this product are
 * accepted; an image that is no longer used is deleted from R2.
 */
export async function savePrint3d(productId: string, value: Print3D): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireAdmin();
  const next = parsePrint3D(value);
  for (const side of PRINT_SIDES) {
    const s = next[side];
    if (s && !ownKey(productId, s.url)) return { ok: false, message: "Image refusée." };
  }
  const p = await db.product.findUnique({ where: { id: productId }, select: { print3d: true } });
  if (!p) return { ok: false, message: "Ce modèle n'existe plus." };
  const before = parsePrint3D(p.print3d);
  await db.product.update({ where: { id: productId }, data: { print3d: Object.keys(next).length ? next : Prisma.DbNull } });
  updateTag(CATALOG_TAG);
  const kept = new Set(PRINT_SIDES.map((s) => next[s]?.url));
  for (const side of PRINT_SIDES) {
    const old = before[side]?.url;
    if (old && !kept.has(old)) await deleteFile(productId, old);
  }
  return { ok: true };
}

export type DeleteProductResult = { ok: false; message: string };

/**
 * Deletes a product and its pictures on R2 (photos, mockups, 3D prints), then goes back to the list.
 * A product that was already ordered is kept: its order lines would lose which t-shirt they were. Hide it
 * from the shop instead (uncheck "En ligne dans la boutique").
 */
export async function deleteProduct(productId: string): Promise<DeleteProductResult> {
  await requireAdmin();
  const p = await db.product.findUnique({ where: { id: productId }, select: { mockups: true, flatMockups: true, print3d: true, _count: { select: { orderItems: true } } } });
  if (!p) redirect("/admin/produits");
  if (p._count.orderItems > 0)
    return { ok: false, message: `Ce modèle a déjà été commandé (${p._count.orderItems} article${p._count.orderItems > 1 ? "s" : ""}) : décoche « En ligne dans la boutique » pour le masquer.` };
  try {
    await db.product.delete({ where: { id: productId } });
  } catch (e) {
    console.error("deleteProduct failed", e);
    return { ok: false, message: "Le modèle n'a pas pu être supprimé. Réessaie." };
  }
  updateTag(CATALOG_TAG);
  const print = parsePrint3D(p.print3d);
  const files = [...p.mockups, ...p.flatMockups, ...PRINT_SIDES.map((s) => print[s]?.url).filter((u): u is string => Boolean(u))];
  await Promise.all(files.map((url) => deleteFile(productId, url).catch(() => {})));
  redirect("/admin/produits?supprime=1");
}
