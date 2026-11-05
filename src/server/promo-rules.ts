import "server-only";
import { db } from "@/server/db";
import { formatFCFA } from "@/lib/products";
import { CODE_PATTERN, normalizeCode, promoDiscount, promoLabel, type PromoCheck } from "@/lib/promos";

/**
 * Whether a code works for these items (and this phone number, once known), and what it takes off.
 * Used by the checkout's "Appliquer" (no phone yet) and again by placeOrder (with the phone), which trusts
 * nothing the browser computed. Uses are the orders placed with the code that were not cancelled.
 */
export async function evaluatePromo(input: unknown, subtotal: number, phone?: string): Promise<PromoCheck> {
  const code = normalizeCode(input);
  const unknown = { ok: false as const, message: "Ce code n'existe pas. Vérifie l'orthographe." };
  if (!CODE_PATTERN.test(code)) return unknown;
  const promo = await db.promoCode.findUnique({ where: { code } });
  if (!promo || !promo.active) return unknown;
  const now = new Date();
  if (promo.startsAt && promo.startsAt > now) return { ok: false, message: "Ce code n'est pas encore valable." };
  if (promo.endsAt && promo.endsAt < now) return { ok: false, message: "Ce code a expiré." };
  if (subtotal < promo.minSubtotalXof) return { ok: false, message: `Ce code marche à partir de ${formatFCFA(promo.minSubtotalXof)} d'articles.` };
  if (promo.maxUses !== null) {
    const used = await db.order.count({ where: { promoCode: code, status: { not: "CANCELLED" } } });
    if (used >= promo.maxUses) return { ok: false, message: "Ce code a déjà été utilisé le nombre de fois prévu." };
  }
  if (promo.onePerCustomer && phone) {
    const mine = await db.order.count({ where: { promoCode: code, customerPhone: phone, status: { not: "CANCELLED" } } });
    if (mine > 0) return { ok: false, message: "Tu as déjà utilisé ce code sur une commande." };
  }
  const discount = promoDiscount(promo, subtotal);
  if (discount <= 0) return { ok: false, message: "Ce code ne donne pas de remise sur ce panier." };
  return { ok: true, code, label: promoLabel(promo), discount };
}
