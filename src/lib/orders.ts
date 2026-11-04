import type { DeliveryMethod, OrderStatus } from "@/generated/prisma/client";
import type { CartItem } from "./cart";

/*
 * What the checkout and the order page share, on both sides of the wire.
 * Orders themselves live in the database: written by `placeOrder` (src/app/commande/actions.ts),
 * read by `getPublicOrder` (src/lib/orders-db.ts).
 */

export const DELIVERY: Record<DeliveryMethod, { label: string; note: string; price: number }> = {
  STANDARD: { label: "Livraison standard", note: "3 à 5 jours ouvrés", price: 1500 },
  EXPRESS: { label: "Livraison express", note: "24 à 48 h", price: 3000 },
  RETRAIT: { label: "Retrait à l'atelier", note: "Gratuit, dès que c'est prêt", price: 0 },
};
export const DELIVERY_METHODS = Object.keys(DELIVERY) as DeliveryMethod[];

export type CheckoutFields = { name: string; phone: string; email: string; city: string; address: string; notes: string };

/** Field errors, in the shop's voice. Runs in the browser for instant feedback, and again on the server. */
export function checkFields(f: CheckoutFields, delivery: DeliveryMethod) {
  const err: Partial<Record<keyof CheckoutFields, string>> = {};
  if (f.name.trim().length < 2) err.name = "Indique ton nom complet.";
  if (!/^\+?[\d\s]{8,}$/.test(f.phone.trim())) err.phone = "Numéro invalide.";
  if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) err.email = "E-mail invalide.";
  if (delivery !== "RETRAIT" && f.city.trim().length < 2) err.city = "Indique ta ville.";
  if (delivery !== "RETRAIT" && f.address.trim().length < 4) err.address = "Indique une adresse ou un repère.";
  return err;
}

/** What the browser sends: which items, never what they cost. */
export type CheckoutLine = Pick<CartItem, "productId" | "color" | "size" | "qty" | "price" | "preview">;
export type CheckoutInput = { fields: CheckoutFields; delivery: DeliveryMethod; lines: CheckoutLine[] };
export type PlaceOrderResult =
  | { ok: true; reference: string; key: string }
  | { ok: false; errors: Partial<Record<keyof CheckoutFields, string>>; message?: string };

/** The order as the customer sees it on /commande/[reference]. */
export type PublicOrder = {
  reference: string;
  status: OrderStatus;
  delivery: DeliveryMethod;
  firstName: string;
  phone: string;
  city: string;
  address: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
};

/**
 * The order page link. `key` is the random tail of the order's id: references are
 * sequential, so the reference alone would let anyone read other people's orders.
 */
export const orderKey = (id: string) => id.slice(-8);
export const orderHref = (reference: string, key: string) => `/commande/${reference}?k=${key}`;

/** The tracking bar the customer sees, and how far along their order is (-1: cancelled). */
export function tracking(status: OrderStatus, delivery: DeliveryMethod) {
  const steps = ["Commande reçue", "En atelier", delivery === "RETRAIT" ? "Prête à l'atelier" : "Expédiée", delivery === "RETRAIT" ? "Retirée" : "Livrée"];
  const at: Record<OrderStatus, number> = { PENDING_PAYMENT: 0, PAID: 0, IN_DESIGN: 1, IN_PRODUCTION: 1, SHIPPED: 2, DELIVERED: 3, CANCELLED: -1 };
  return { steps, step: at[status] };
}
