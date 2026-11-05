"use server";

import { db } from "@/server/db";
import { orderHref, orderKey } from "@/lib/orders";

export type TrackResult = { ok: true; href: string } | { ok: false; message: string };

const digits = (v: string) => v.replace(/\D/g, "");

/**
 * "Suivi de commande": finds an order by its reference and the phone number given at checkout, and returns
 * its tracking page (with the key the checkout gave). Both must match, so a reference alone reveals nothing.
 */
export async function findOrder(reference: string, phone: string): Promise<TrackResult> {
  const ref = String(reference ?? "").trim().toUpperCase();
  const tel = digits(String(phone ?? ""));
  if (!/^AS-\d{4}-\d{4,}$/.test(ref)) return { ok: false, message: "La référence ressemble à AS-2611-0143 : vérifie-la." };
  if (tel.length < 8) return { ok: false, message: "Entre le numéro donné à la commande." };
  const o = await db.order.findUnique({ where: { reference: ref }, select: { id: true, reference: true, customerPhone: true } }).catch(() => null);
  // The same answer whether the reference or the phone is wrong.
  if (!o || !digits(o.customerPhone).endsWith(tel.slice(-8))) return { ok: false, message: "Aucune commande avec cette référence et ce numéro." };
  return { ok: true, href: orderHref(o.reference, orderKey(o.id)) };
}
