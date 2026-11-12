"use server";

import { db } from "@/server/db";
import { creditBalance, getMyCustomer } from "@/server/account";
import { logActivity, logError } from "@/server/log";
import { allow } from "@/server/rate-limit";
import { Prisma } from "@/generated/prisma/client";
import { CREDIT_REASON } from "@/lib/admin/labels";

/*
 * The studio's credits, for the signed-in customer: read, spend, give back. The balance is the sum of the
 * customer's ledger (CreditEntry); spending is one negative line, checked inside a transaction so the
 * balance can't go below zero even with two tabs open.
 */

export type MyCredits = { signedIn: false } | { signedIn: true; balance: number; name: string };

export async function getMyCredits(): Promise<MyCredits> {
  const me = await getMyCustomer();
  if (!me) return { signedIn: false };
  return { signedIn: true, balance: await creditBalance(me.customer.id), name: me.user.name };
}

/** What the studio spends credits on. */
type SpendReason = "IMAGE_UPLOAD" | "HD_PREVIEW" | "DESIGN_SAVE";
const REASONS: SpendReason[] = ["IMAGE_UPLOAD", "HD_PREVIEW", "DESIGN_SAVE"];

/** `entryId`: the ledger line of this spending, which a refund names (see refundSpend). */
export type SpendResult = { ok: true; balance: number; entryId: string } | { ok: false; reason: "signed-out" | "not-enough" | "error"; balance?: number };
export type RefundResult = { ok: true; balance: number } | { ok: false; reason: "signed-out" | "error" };

export async function spendCredits(amount: number, reason: SpendReason): Promise<SpendResult> {
  if (!Number.isInteger(amount) || amount < 1 || amount > 50 || !REASONS.includes(reason)) return { ok: false, reason: "error" };
  const me = await getMyCustomer();
  if (!me) return { ok: false, reason: "signed-out" };
  try {
    const r = await db.$transaction(async (tx) => {
      const sum = await tx.creditEntry.aggregate({ where: { customerId: me.customer.id }, _sum: { amount: true } });
      const balance = sum._sum.amount ?? 0;
      if (balance < amount) return { ok: false as const, reason: "not-enough" as const, balance };
      const entry = await tx.creditEntry.create({ data: { customerId: me.customer.id, amount: -amount, reason }, select: { id: true } });
      return { ok: true as const, balance: balance - amount, entryId: entry.id };
    });
    if (r.ok) await logActivity("credits.spent", `${me.user.name || me.user.email} : ${amount} crédit${amount > 1 ? "s" : ""} — ${CREDIT_REASON[reason]} (reste ${r.balance})`, { amount, reason }, `client:${me.customer.id}`);
    return r;
  } catch (e) {
    await logError("spendCredits", e);
    return { ok: false, reason: "error" };
  }
}

/*
 * Refunds. Anyone can call a server action directly, so a refund never takes an amount: it names one spending
 * (the `entryId` spendCredits returned), which must be this customer's own, a studio spending, recent, and not
 * refunded before. The refund line carries "refund:<entryId>" in paymentRef, a unique column: a second refund
 * of the same spending is refused by the database itself, even sent twice at once.
 */
const REFUND_WINDOW = {
  /** Something that then failed (an export too heavy for the device, a print file that didn't upload). */
  failed: 15 * 60 * 1000,
  /** The studio's "Annuler" right after adding images (shown 15 s; a little slack for a slow network). */
  undo: 30 * 1000,
} as const;
const UNDOS_PER_DAY = 20;

export async function refundSpend(entryId: string, why: keyof typeof REFUND_WINDOW): Promise<RefundResult> {
  if (typeof entryId !== "string" || !entryId || entryId.length > 64 || !(why in REFUND_WINDOW)) return { ok: false, reason: "error" };
  const me = await getMyCustomer();
  if (!me) return { ok: false, reason: "signed-out" };
  const spent = await db.creditEntry.findFirst({ where: { id: entryId, customerId: me.customer.id }, select: { amount: true, reason: true, createdAt: true } });
  const studio = spent && spent.amount < 0 && (REASONS as string[]).includes(spent.reason);
  const recent = spent && Date.now() - spent.createdAt.getTime() <= REFUND_WINDOW[why];
  if (!spent || !studio || !recent || (why === "undo" && spent.reason !== "IMAGE_UPLOAD")) return { ok: false, reason: "error" };
  // An undo is a convenience for a wrong image, not a way to use the studio for free: a few a day.
  if (why === "undo" && !(await allow(`credit-undo:${me.customer.id}`, UNDOS_PER_DAY, 24 * 60 * 60 * 1000))) return { ok: false, reason: "error" };
  const amount = -spent.amount;
  try {
    await db.creditEntry.create({ data: { customerId: me.customer.id, amount, reason: "REFUND", paymentRef: `refund:${entryId}` } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, reason: "error" }; // already refunded
    await logError("refundSpend", e, { entryId });
    return { ok: false, reason: "error" };
  }
  const balance = await creditBalance(me.customer.id);
  const what = why === "undo" ? "après une annulation dans le studio" : "après un échec dans le studio";
  await logActivity("credits.refunded", `${me.user.name || me.user.email} : ${amount} crédit${amount > 1 ? "s" : ""} rendu${amount > 1 ? "s" : ""} ${what} (solde ${balance})`, { amount, entryId, why }, `client:${me.customer.id}`);
  return { ok: true, balance };
}
