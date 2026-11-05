import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/server/db";
import type { StockMap } from "@/lib/stock";

/** Cache tag of the shop's stock: stock changes in the admin and paid / cancelled orders expire it. */
export const STOCK_TAG = "stock";

async function readStock(): Promise<StockMap> {
  "use cache";
  cacheTag(STOCK_TAG);
  cacheLife("minutes");
  return toMap(await db.colorStock.findMany({ select: { colorHex: true, size: true, quantity: true } }));
}

export function toMap(rows: { colorHex: string; size: string; quantity: number }[]): StockMap {
  const map: StockMap = {};
  for (const r of rows) (map[r.colorHex.toLowerCase()] ??= {})[r.size] = r.quantity;
  return map;
}

/** Blank t-shirts left, by colour and size (cached). If the database can't be read: empty, every colour counts as available. */
export async function getStock(): Promise<StockMap> {
  try {
    return await readStock();
  } catch (e) {
    console.error("Stock unavailable", e);
    return {};
  }
}

/** The blank colours in stock (at least one t-shirt left), with their names, for the studio's palette. */
export async function getStockColours(): Promise<{ name: string; hex: string }[]> {
  try {
    return await readStockColours();
  } catch {
    return [];
  }
}
async function readStockColours() {
  "use cache";
  cacheTag(STOCK_TAG);
  cacheLife("minutes");
  const rows = await db.colorStock.findMany({ where: { quantity: { gt: 0 } }, select: { colorHex: true, colorName: true }, orderBy: { colorName: "asc" } });
  const seen = new Map<string, string>();
  for (const r of rows) if (!seen.has(r.colorHex.toLowerCase())) seen.set(r.colorHex.toLowerCase(), r.colorName);
  return [...seen].map(([hex, name]) => ({ hex, name }));
}

/** The same, read now (not cached): for the checkout's last check. */
export async function readStockNow(): Promise<StockMap> {
  return toMap(await db.colorStock.findMany({ select: { colorHex: true, size: true, quantity: true } }));
}
