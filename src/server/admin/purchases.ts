"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth";
import { logError } from "@/server/log";
import { payCreditPurchase } from "@/server/payments/settle";

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
    const r = await payCreditPurchase(id, { by: "admin" });
    // Already paid (a second click, or paid online meanwhile): nothing more to do.
    if (!r.ok && r.message !== "Cet achat est déjà payé.") return { error: r.message };
  } catch (e) {
    await logError("markPurchasePaid", e, { id });
    return { error: "Le paiement n'a pas pu être enregistré. Réessaie." };
  }
  revalidatePath("/admin/credits");
  revalidatePath("/admin/studio");
  return { done: true };
}
