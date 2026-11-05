"use server";

import { db } from "@/server/db";
import { orderKey } from "@/lib/orders";
import { PAYMENT_METHOD_IDS } from "@/lib/credits";
import { logError } from "@/server/log";
import { settle, startCreditPayment, startOrderPayment, type SettleStatus, type StartResult } from "@/server/payments/settle";

/*
 * The customer's side of online payment: back from GeniusPay's page (check it now, without waiting for the
 * webhook), or paying again. An order is only reached with its reference AND its key, as its tracking page.
 */

async function orderFor(reference: string, key: string) {
  const o = await db.order.findUnique({ where: { reference: String(reference ?? "") }, select: { id: true, paymentRef: true } });
  return o && orderKey(o.id) === String(key ?? "") ? o : null;
}

/** Back from GeniusPay: how the order's payment stands now (asked of GeniusPay). */
export async function checkOrderPayment(reference: string, key: string): Promise<SettleStatus | "none"> {
  const o = await orderFor(reference, key);
  if (!o?.paymentRef) return "none";
  try {
    return await settle(o.paymentRef);
  } catch (e) {
    await logError("geniuspay.check", e, { order: reference });
    return "pending";
  }
}

/** "Payer maintenant": a new GeniusPay page for an order still waiting for its payment. */
export async function payOrderNow(reference: string, key: string, method?: string): Promise<StartResult> {
  const o = await orderFor(reference, key);
  if (!o) return { ok: false, message: "Commande introuvable." };
  return startOrderPayment(o.id, PAYMENT_METHOD_IDS.find((m) => m === method));
}

/** Back from GeniusPay after buying credits: how that purchase's payment stands now. */
export async function checkCreditPayment(reference: string): Promise<SettleStatus | "none"> {
  const p = await db.creditPurchase.findUnique({ where: { reference: String(reference ?? "") }, select: { paymentRef: true, paymentStatus: true } });
  if (!p) return "none";
  if (p.paymentStatus === "PAID") return "paid";
  if (!p.paymentRef) return "none";
  try {
    return await settle(p.paymentRef);
  } catch (e) {
    await logError("geniuspay.check", e, { purchase: reference });
    return "pending";
  }
}

/** Paying again for a credit purchase whose payment failed. */
export async function payCreditsNow(reference: string, method?: string): Promise<StartResult> {
  const p = await db.creditPurchase.findUnique({ where: { reference: String(reference ?? "") }, select: { id: true } });
  if (!p) return { ok: false, message: "Achat introuvable." };
  return startCreditPayment(p.id, PAYMENT_METHOD_IDS.find((m) => m === method));
}
