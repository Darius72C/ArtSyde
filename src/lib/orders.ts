"use client";

import type { CartItem } from "./cart";

// Mock order storage in the browser — will be replaced by the API (POST /orders, GET /orders/:id).
export type Customer = { name: string; phone: string; email?: string; city: string; address: string; notes?: string };
export type Order = {
  id: string;
  createdAt: string;
  items: CartItem[];
  customer: Customer;
  delivery: "standard" | "express" | "retrait";
  subtotal: number;
  shipping: number;
  total: number;
};

const KEY = "orders:v1";

export const DELIVERY = {
  standard: { label: "Livraison standard", note: "3 à 5 jours ouvrés", price: 1500 },
  express: { label: "Livraison express", note: "24 à 48 h", price: 3000 },
  retrait: { label: "Retrait à l'atelier", note: "Gratuit, dès que c'est prêt", price: 0 },
} as const;

function readAll(): Order[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveOrder(o: Omit<Order, "id" | "createdAt">): Order {
  const id = Math.random().toString(36).slice(2, 8).toUpperCase();
  const order: Order = { ...o, id, createdAt: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify([order, ...readAll()].slice(0, 20)));
  } catch {}
  return order;
}

export function getOrder(id: string): Order | undefined {
  return readAll().find((o) => o.id === id);
}
