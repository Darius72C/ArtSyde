"use server";

import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/server/db";
import { Size } from "@/generated/prisma/client";
import { STOCK_TAG } from "@/server/stock";
import { requireAdmin } from "./auth";
import { logActivity } from "@/server/log";

/*
 * Stock of blank t-shirts, by colour and size (ColorStock), from /admin/produits.
 * Colours are matched without regard to case ("#1C1C1E" and "#1c1c1e" are the same blank).
 * Every action checks the admin session and refreshes the admin page and the shop's stock.
 */

export type StockResult = { ok: true; message?: string } | { ok: false; message: string };

const HEX = /^#[0-9a-f]{6}$/i;
const MAX_QTY = 100_000;
const sizeOf = (v: unknown) => Object.values(Size).find((s) => s === v);
const wholeNumber = (v: unknown, min: number, max: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

function refresh() {
  revalidatePath("/admin/produits");
  revalidatePath("/admin");
  updateTag(STOCK_TAG);
}

/** The stock line of a colour and size, whatever the case of the colour code. */
const findLine = (hex: string, size: Size) => db.colorStock.findFirst({ where: { colorHex: { equals: hex, mode: "insensitive" }, size } });

/** Sets one line's quantity (a count, a correction). */
export async function setStockQuantity(id: string, quantity: number): Promise<StockResult> {
  await requireAdmin();
  const q = wholeNumber(quantity, 0, MAX_QTY);
  if (q === null) return { ok: false, message: `Un nombre entier entre 0 et ${MAX_QTY.toLocaleString("fr-FR")}.` };
  try {
    await db.colorStock.update({ where: { id }, data: { quantity: q } });
  } catch {
    return { ok: false, message: "Cette ligne de stock n'existe plus." };
  }
  await logActivity("stock.set", `Stock corrigé à ${q}`, { id, quantity: q }, "admin");
  refresh();
  return { ok: true };
}

/** A delivery: adds `quantity` t-shirts of a colour and size (the line is created if it is new). */
export async function receiveStock(input: { hex: string; name?: string; size: string; quantity: number }): Promise<StockResult> {
  await requireAdmin();
  const hex = String(input?.hex ?? "").trim();
  const size = sizeOf(input?.size);
  const add = wholeNumber(input?.quantity, 1, MAX_QTY);
  if (!HEX.test(hex)) return { ok: false, message: "Choisis une couleur." };
  if (!size) return { ok: false, message: "Choisis une taille." };
  if (add === null) return { ok: false, message: `Un nombre entier entre 1 et ${MAX_QTY.toLocaleString("fr-FR")}.` };
  const line = await findLine(hex, size);
  if (line) await db.colorStock.update({ where: { id: line.id }, data: { quantity: { increment: add } } });
  else {
    const name = String(input?.name ?? "").trim().slice(0, 40);
    if (name.length < 2) return { ok: false, message: "Nouvelle couleur : donne-lui un nom." };
    await db.colorStock.create({ data: { colorHex: hex.toLowerCase(), colorName: name, size, quantity: add } });
  }
  await logActivity("stock.received", `Arrivage : +${add} ${line?.colorName ?? input.name ?? hex} ${size}`, { hex, size, quantity: add }, "admin");
  refresh();
  return { ok: true, message: `+${add} ${size} enregistrés.` };
}

/** The "low stock" threshold of every size of a colour. */
export async function setColourThreshold(hex: string, lowAt: number): Promise<StockResult> {
  await requireAdmin();
  const n = wholeNumber(lowAt, 0, 1000);
  if (!HEX.test(hex) || n === null) return { ok: false, message: "Un seuil entre 0 et 1 000." };
  await db.colorStock.updateMany({ where: { colorHex: { equals: hex, mode: "insensitive" } }, data: { lowAt: n } });
  refresh();
  return { ok: true };
}

/** A new blank colour, with a line at 0 for each chosen size. */
export async function addStockColour(input: { hex: string; name: string; sizes: string[] }): Promise<StockResult> {
  await requireAdmin();
  const hex = String(input?.hex ?? "").trim().toLowerCase();
  const name = String(input?.name ?? "").trim().slice(0, 40);
  const sizes = Object.values(Size).filter((s) => input?.sizes?.includes(s));
  if (!HEX.test(hex)) return { ok: false, message: "Choisis une couleur." };
  if (name.length < 2) return { ok: false, message: "Donne un nom à la couleur." };
  if (!sizes.length) return { ok: false, message: "Choisis au moins une taille." };
  const existing = await db.colorStock.findMany({ where: { colorHex: { equals: hex, mode: "insensitive" } }, select: { size: true } });
  const missing = sizes.filter((s) => !existing.some((e) => e.size === s));
  if (!missing.length) return { ok: false, message: "Cette couleur a déjà ces tailles." };
  await db.colorStock.createMany({ data: missing.map((size) => ({ colorHex: hex, colorName: name, size, quantity: 0 })) });
  await logActivity("stock.colour_added", `Couleur ${name} ajoutée au stock (${missing.join(", ")})`, { hex, sizes: missing }, "admin");
  refresh();
  return { ok: true, message: `${name} ajoutée.` };
}

/** Removes a colour from the stock (all its sizes). */
export async function removeStockColour(hex: string): Promise<StockResult> {
  await requireAdmin();
  if (!HEX.test(hex)) return { ok: false, message: "Couleur inconnue." };
  await db.colorStock.deleteMany({ where: { colorHex: { equals: hex, mode: "insensitive" } } });
  await logActivity("stock.colour_removed", `Couleur ${hex} retirée du stock`, { hex }, "admin");
  refresh();
  return { ok: true };
}
