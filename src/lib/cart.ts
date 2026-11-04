"use client";

import { useSyncExternalStore } from "react";
import type { Art } from "./products";

export type CartItem = {
  key: string; // unique line id (product + colour + size, or a custom design id)
  productId: number | null; // null = custom studio design
  name: string;
  price: number;
  color: string;
  size: string;
  qty: number;
  art?: Art;
  bg?: string;
  preview?: string; // small data-URL thumbnail for custom designs
};

const STORAGE = "cart:v1";
const EMPTY: CartItem[] = [];
let items: CartItem[] = EMPTY;
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) items = JSON.parse(raw);
  } catch {}
}
function commit(next: CartItem[]) {
  items = next;
  try {
    localStorage.setItem(STORAGE, JSON.stringify(items));
  } catch {}
  subs.forEach((s) => s());
}

export const cart = {
  add(item: Omit<CartItem, "qty" | "key"> & { key?: string; qty?: number }) {
    load();
    const key = item.key ?? `${item.productId}-${item.color}-${item.size}`;
    const existing = items.find((i) => i.key === key);
    if (existing) commit(items.map((i) => (i.key === key ? { ...i, qty: Math.min(i.qty + (item.qty ?? 1), 20) } : i)));
    else commit([...items, { ...item, key, qty: item.qty ?? 1 }]);
  },
  setQty(key: string, qty: number) {
    load();
    commit(qty <= 0 ? items.filter((i) => i.key !== key) : items.map((i) => (i.key === key ? { ...i, qty: Math.min(qty, 20) } : i)));
  },
  /** Change the size of a line in place (merges with an identical line if one exists). */
  setSize(key: string, size: string) {
    load();
    const line = items.find((i) => i.key === key);
    if (!line) return;
    const newKey = line.productId === null ? key : `${line.productId}-${line.color}-${size}`;
    const twin = items.find((i) => i.key === newKey && i.key !== key);
    if (twin) commit(items.filter((i) => i.key !== key).map((i) => (i.key === newKey ? { ...i, qty: Math.min(i.qty + line.qty, 20) } : i)));
    else commit(items.map((i) => (i.key === key ? { ...i, key: newKey, size } : i)));
  },
  remove(key: string) {
    load();
    commit(items.filter((i) => i.key !== key));
  },
  clear() {
    commit([]);
  },
};

function subscribe(cb: () => void) {
  subs.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE) {
      loaded = false;
      load();
      cb();
    }
  };
  window.addEventListener("storage", onStorage); // keep tabs in sync
  return () => {
    subs.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}
function snapshot() {
  load();
  return items;
}

/** Cart lines. Empty during SSR/hydration, then the saved cart. */
export function useCart() {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}
export function useCartCount() {
  return useCart().reduce((n, i) => n + i.qty, 0);
}
export const cartSubtotal = (list: CartItem[]) => list.reduce((s, i) => s + i.price * i.qty, 0);

export const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
