"use server";

import type { PromoCheck } from "@/lib/promos";
import { evaluatePromo } from "@/server/promo-rules";
import { logError } from "@/server/log";

/**
 * The checkout's "Appliquer": whether the code works on a basket of this amount, and how much it takes off.
 * Only an estimate for the screen: placeOrder checks the code again against the real prices.
 */
export async function checkPromo(code: string, subtotal: number): Promise<PromoCheck> {
  const amount = Number(subtotal);
  if (!Number.isFinite(amount) || amount < 0) return { ok: false, message: "Panier invalide." };
  try {
    return await evaluatePromo(code, Math.round(amount));
  } catch (e) {
    await logError("checkPromo", e);
    return { ok: false, message: "On n'a pas pu vérifier le code. Réessaie dans un instant." };
  }
}
