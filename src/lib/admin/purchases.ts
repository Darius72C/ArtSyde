"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "./auth";

export type MarkPaidState = { error?: string; done?: boolean };

/**
 * "Marquer payé" on a credit purchase: in one transaction, mark it PAID, attach it to a
 * customer (found or created by phone), and give the credits (CreditEntry PURCHASE).
 * Idempotent: the UNPAID → PAID switch is a conditional update, so a second click (or two
 * admins at once) finds nothing to switch and credits nothing; the ledger line's unique
 * paymentRef (the purchase reference) is a second lock.
 */
export async function markPurchasePaid(_prev: MarkPaidState, form: FormData): Promise<MarkPaidState> {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  if (!id) return { error: "Achat introuvable." };

  try {
    await db.$transaction(async (tx) => {
      const p = await tx.creditPurchase.findUnique({ where: { id } });
      if (!p) throw new Error("Achat introuvable.");

      const switched = await tx.creditPurchase.updateMany({ where: { id, paymentStatus: "UNPAID" }, data: { paymentStatus: "PAID", paidAt: new Date() } });
      if (switched.count === 0) return; // already paid: nothing to give

      let customerId = p.customerId;
      if (!customerId) {
        // Keep the e-mail only if no other customer already uses it (it is unique).
        const emailTaken = p.customerEmail ? await tx.customer.findFirst({ where: { email: p.customerEmail, NOT: { phone: p.customerPhone } }, select: { id: true } }) : null;
        const email = p.customerEmail && !emailTaken ? p.customerEmail : undefined;
        const c = await tx.customer.upsert({
          where: { phone: p.customerPhone },
          create: { name: p.customerName, phone: p.customerPhone, email },
          update: {},
          select: { id: true },
        });
        customerId = c.id;
        await tx.creditPurchase.update({ where: { id }, data: { customerId } });
      }

      await tx.creditEntry.create({
        data: { customerId, amount: p.credits, reason: "PURCHASE", pack: p.pack, priceXof: p.priceXof, paymentRef: p.reference },
      });
    });
  } catch (e) {
    return { error: e instanceof Error && e.message === "Achat introuvable." ? e.message : "Le paiement n'a pas pu être enregistré. Réessaie." };
  }

  revalidatePath("/admin/credits");
  revalidatePath("/admin/studio");
  return { done: true };
}
