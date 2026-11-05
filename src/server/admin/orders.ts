"use server";

import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/server/db";
import type { OrderStatus } from "@/generated/prisma/client";
import { moveStock, payOrder } from "@/server/payments/settle";
import { STOCK_TAG } from "@/server/stock";
import { requireAdmin } from "./auth";
import { logActivity, logError } from "@/server/log";

/*
 * Moving an order along, from its admin page. Stock of blank t-shirts follows the money:
 * marking an order paid takes its t-shirts out of the stock, cancelling a paid order puts them back.
 * Both are conditional updates inside a transaction, so a double click or two admins at once
 * never count a t-shirt twice.
 */

export type OrderActionResult = { ok: true; message?: string; warnings?: string[] } | { ok: false; message: string };

const STEP_LABEL: Partial<Record<OrderStatus, string>> = { IN_DESIGN: "en conception", IN_PRODUCTION: "en impression", SHIPPED: "expédiée / prête", DELIVERED: "livrée" };

/** The workshop's steps once an order is paid, in order. */
const STEPS: OrderStatus[] = ["PAID", "IN_DESIGN", "IN_PRODUCTION", "SHIPPED", "DELIVERED"];

function refresh(reference: string) {
  revalidatePath(`/admin/commandes/${encodeURIComponent(reference)}`);
  revalidatePath("/admin/commandes");
  revalidatePath("/admin");
  revalidatePath("/admin/produits");
  updateTag(STOCK_TAG);
}

/** Payment received (mobile money confirmed by hand): the order is paid, its t-shirts leave the stock. */
export async function markOrderPaid(orderId: string): Promise<OrderActionResult> {
  await requireAdmin();
  try {
    const r = await payOrder(orderId, { by: "admin" });
    if (!r.ok) return r;
    refresh(r.reference);
    return { ok: true, message: "Commande payée. Les t-shirts sont sortis du stock.", warnings: r.warnings };
  } catch (e) {
    await logError("markOrderPaid", e);
    return { ok: false, message: "Le paiement n'a pas pu être enregistré. Réessaie." };
  }
}

/** The next workshop step (in design, in production, shipped / ready, delivered). Only for a paid order. */
export async function setOrderStep(orderId: string, status: OrderStatus): Promise<OrderActionResult> {
  await requireAdmin();
  if (!STEPS.includes(status) || status === "PAID") return { ok: false, message: "Étape inconnue." };
  const o = await db.order.findUnique({ where: { id: orderId }, select: { reference: true, status: true, paymentStatus: true } });
  if (!o) return { ok: false, message: "Commande introuvable." };
  if (o.paymentStatus !== "PAID" || !STEPS.includes(o.status)) return { ok: false, message: "Marque d'abord la commande comme payée." };
  await db.order.update({ where: { id: orderId }, data: { status } });
  await logActivity("order.step", `Commande ${o.reference} : ${STEP_LABEL[status] ?? status}`, { reference: o.reference, status }, "admin");
  refresh(o.reference);
  return { ok: true };
}

/** Cancels an order. If it was paid, its t-shirts go back into the stock and the payment is marked refunded. */
export async function cancelOrder(orderId: string): Promise<OrderActionResult> {
  await requireAdmin();
  try {
    const r = await db.$transaction(async (tx) => {
      const o = await tx.order.findUnique({ where: { id: orderId }, select: { reference: true, status: true, paymentStatus: true, items: { select: { color: true, size: true, quantity: true } } } });
      if (!o) return { ok: false as const, message: "Commande introuvable." };
      if (o.status === "CANCELLED") return { ok: false as const, message: "Cette commande est déjà annulée." };
      if (o.status === "DELIVERED") return { ok: false as const, message: "Une commande livrée ne s'annule pas." };
      const wasPaid = o.paymentStatus === "PAID";
      const switched = await tx.order.updateMany({
        where: { id: orderId, status: o.status, paymentStatus: o.paymentStatus },
        data: { status: "CANCELLED", ...(wasPaid ? { paymentStatus: "REFUNDED" as const } : {}) },
      });
      if (!switched.count) return { ok: false as const, message: "La commande a changé entre-temps. Recharge la page." };
      if (wasPaid) await moveStock(tx, o.items, 1);
      return { ok: true as const, reference: o.reference, wasPaid };
    });
    if (!r.ok) return r;
    await logActivity("order.cancelled", `Commande ${r.reference} annulée${r.wasPaid ? " : t-shirts remis en stock" : ""}`, { reference: r.reference, wasPaid: r.wasPaid }, "admin");
    refresh(r.reference);
    return { ok: true, message: r.wasPaid ? "Commande annulée. Les t-shirts sont revenus dans le stock ; pense à rembourser le client." : "Commande annulée." };
  } catch (e) {
    await logError("cancelOrder", e);
    return { ok: false, message: "La commande n'a pas pu être annulée. Réessaie." };
  }
}
