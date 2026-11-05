"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireAdmin } from "./auth";

export type AdjustCreditsState = {
  errors?: Partial<Record<"phone" | "name" | "amount", string>>;
  message?: string; // a failure for the whole form
  done?: string; // what was done, said back to the admin
};

const MAX_ADJUST = 1000;

/**
 * Gift or take back studio credits by hand, from /admin/clients. One ledger line (ADJUSTMENT,
 * or REFUND to give back credits a customer spent), so the balance stays the sum of the ledger.
 * The customer is found by phone, or created when a name is given, so credits can be gifted
 * before someone has ordered. A removal never takes the balance below zero.
 */
export async function adjustCredits(_prev: AdjustCreditsState, form: FormData): Promise<AdjustCreditsState> {
  await requireAdmin();
  // The customer is found by phone, or by e-mail (an account opened with Google may have no phone yet).
  const phone = String(form.get("phone") ?? "").trim().replace(/\s+/g, " ");
  const byEmail = phone.includes("@");
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const direction = form.get("direction") === "remove" ? -1 : 1;
  const reason = form.get("reason") === "REFUND" && direction > 0 ? "REFUND" : "ADJUSTMENT";
  const n = Number(String(form.get("amount") ?? "").trim());

  const errors: AdjustCreditsState["errors"] = {};
  if (byEmail ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(phone) : !/^\+?[\d\s]{8,}$/.test(phone)) errors.phone = "Numéro ou e-mail invalide.";
  if (!Number.isInteger(n) || n < 1 || n > MAX_ADJUST) errors.amount = `Un nombre entier entre 1 et ${MAX_ADJUST}.`;
  if (Object.keys(errors).length) return { errors };

  try {
    const result = await db.$transaction(async (tx) => {
      let customer = await tx.customer.findUnique({ where: byEmail ? { email: phone.toLowerCase() } : { phone }, select: { id: true, name: true } });
      if (!customer) {
        if (direction < 0 || byEmail) return { errors: { phone: byEmail ? "Aucun client avec cet e-mail." : "Aucun client avec ce numéro." } };
        if (name.length < 2) return { errors: { name: "Nouveau client : indique son nom." } };
        customer = await tx.customer.create({ data: { name, phone }, select: { id: true, name: true } });
      }
      const sum = await tx.creditEntry.aggregate({ where: { customerId: customer.id }, _sum: { amount: true } });
      const balance = sum._sum.amount ?? 0;
      if (direction < 0 && n > balance) return { errors: { amount: `${customer.name} n'a que ${balance} crédit${balance > 1 ? "s" : ""}.` } };
      await tx.creditEntry.create({ data: { customerId: customer.id, amount: direction * n, reason } });
      const after = balance + direction * n;
      const what = `${n} crédit${n > 1 ? "s" : ""}`;
      return { done: `${direction > 0 ? `${what} offert${n > 1 ? "s" : ""} à` : `${what} retiré${n > 1 ? "s" : ""} à`} ${customer.name}. Solde : ${after}.` };
    });
    if (result.done) {
      revalidatePath("/admin/clients");
      revalidatePath("/admin/studio");
    }
    return result;
  } catch {
    return { message: "Les crédits n'ont pas pu être enregistrés. Réessaie." };
  }
}
