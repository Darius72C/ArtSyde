/**
 * Promo codes: what the checkout and the admin share. A code takes a percentage or a fixed amount off the
 * items (never the delivery), with optional limits. Checked in src/server/promo.ts, at checkout and again when
 * the order is placed.
 */

/** A code as typed: upper case, no spaces, letters, digits, - and _ only. */
export const normalizeCode = (s: unknown) =>
  String(s ?? "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 30);
export const CODE_PATTERN = /^[A-Z0-9_-]{3,30}$/;

/** The rule part of a code (as stored). */
export type PromoRule = { percent: number | null; amountXof: number | null };

/** What a code takes off these items, in FCFA: never more than the items themselves. */
export function promoDiscount(rule: PromoRule, subtotal: number) {
  const off = rule.percent ? Math.round((subtotal * rule.percent) / 100) : (rule.amountXof ?? 0);
  return Math.max(0, Math.min(subtotal, off));
}

/** "-20 %" or "-2 000 FCFA", for the admin's list and the checkout. */
export const promoLabel = (rule: PromoRule) => (rule.percent ? `-${rule.percent} %` : `-${(rule.amountXof ?? 0).toLocaleString("fr-FR")} FCFA`);

/** The checkout's answer when a code is tried. */
export type PromoCheck = { ok: true; code: string; label: string; discount: number } | { ok: false; message: string };
