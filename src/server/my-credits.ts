"use server";

import { db } from "@/server/db";
import { creditBalance, getMyCustomer } from "@/server/account";
import { logError } from "@/server/log";

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

export type SpendResult = { ok: true; balance: number } | { ok: false; reason: "signed-out" | "not-enough" | "error"; balance?: number };

export async function spendCredits(amount: number, reason: SpendReason): Promise<SpendResult> {
  if (!Number.isInteger(amount) || amount < 1 || amount > 50 || !REASONS.includes(reason)) return { ok: false, reason: "error" };
  const me = await getMyCustomer();
  if (!me) return { ok: false, reason: "signed-out" };
  try {
    return await db.$transaction(async (tx) => {
      const sum = await tx.creditEntry.aggregate({ where: { customerId: me.customer.id }, _sum: { amount: true } });
      const balance = sum._sum.amount ?? 0;
      if (balance < amount) return { ok: false as const, reason: "not-enough" as const, balance };
      await tx.creditEntry.create({ data: { customerId: me.customer.id, amount: -amount, reason } });
      return { ok: true as const, balance: balance - amount };
    });
  } catch (e) {
    await logError("spendCredits", e);
    return { ok: false, reason: "error" };
  }
}

/** Gives back credits spent on something that then failed (an export too heavy for the device). */
export async function refundCredits(amount: number): Promise<SpendResult> {
  if (!Number.isInteger(amount) || amount < 1 || amount > 50) return { ok: false, reason: "error" };
  const me = await getMyCustomer();
  if (!me) return { ok: false, reason: "signed-out" };
  await db.creditEntry.create({ data: { customerId: me.customer.id, amount, reason: "REFUND" } });
  return { ok: true, balance: await creditBalance(me.customer.id) };
}
