"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { logActivity } from "@/server/log";
import { CODE_PATTERN, normalizeCode, promoLabel } from "@/lib/promos";
import { requireAdmin } from "./auth";

/* Admin > Codes promo: creating, switching on and off, deleting the codes customers type at checkout. */

export type PromoInput = { code: string; kind: "percent" | "amount"; value: string; minSubtotal: string; maxUses: string; onePerCustomer: boolean; endsAt: string; note: string };
export type PromoSaveResult = { ok: true } | { ok: false; field?: keyof PromoInput; message: string };

const PATH = "/admin/promos";
const int = (v: string) => (String(v ?? "").trim() === "" ? null : Number(String(v).replace(/[\s.]/g, "")));

/** Creates a code. The end date is the last day it works (to midnight, Abidjan time). */
export async function createPromo(input: PromoInput): Promise<PromoSaveResult> {
  await requireAdmin();
  const code = normalizeCode(input?.code);
  if (!CODE_PATTERN.test(code)) return { ok: false, field: "code", message: "3 à 30 caractères : lettres, chiffres, - ou _." };
  const value = int(input?.value);
  const percent = input?.kind === "percent";
  if (value === null || !Number.isInteger(value) || value <= 0 || (percent ? value > 90 : value > 1_000_000))
    return { ok: false, field: "value", message: percent ? "Un pourcentage entre 1 et 90." : "Un montant en FCFA, plus grand que 0." };
  const minSubtotal = int(input?.minSubtotal) ?? 0;
  if (!Number.isInteger(minSubtotal) || minSubtotal < 0) return { ok: false, field: "minSubtotal", message: "Un montant en FCFA, ou vide." };
  const maxUses = int(input?.maxUses);
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) return { ok: false, field: "maxUses", message: "Un nombre de commandes, ou vide pour illimité." };
  let endsAt: Date | null = null;
  if (input?.endsAt) {
    endsAt = new Date(`${input.endsAt}T23:59:59Z`);
    if (Number.isNaN(endsAt.getTime())) return { ok: false, field: "endsAt", message: "Date invalide." };
    if (endsAt < new Date()) return { ok: false, field: "endsAt", message: "Cette date est déjà passée." };
  }
  if (await db.promoCode.findUnique({ where: { code }, select: { id: true } })) return { ok: false, field: "code", message: "Ce code existe déjà." };

  const rule = { percent: percent ? value : null, amountXof: percent ? null : value };
  await db.promoCode.create({
    data: { code, ...rule, minSubtotalXof: minSubtotal, maxUses, onePerCustomer: Boolean(input?.onePerCustomer), endsAt, note: String(input?.note ?? "").trim().slice(0, 120) || null },
  });
  await logActivity("promo.created", `Code promo ${code} créé (${promoLabel(rule)})`, { code }, "admin");
  revalidatePath(PATH);
  return { ok: true };
}

/** Switches a code on or off (off: refused at checkout, kept with its history). */
export async function setPromoActive(id: string, active: boolean): Promise<void> {
  await requireAdmin();
  const p = await db.promoCode.update({ where: { id: String(id) }, data: { active: Boolean(active) } }).catch(() => null);
  if (p) await logActivity(active ? "promo.enabled" : "promo.disabled", `Code promo ${p.code} ${active ? "réactivé" : "désactivé"}`, { code: p.code }, "admin");
  revalidatePath(PATH);
}

/** Deletes a code. The orders that used it keep its name and their discount. */
export async function deletePromo(id: string): Promise<void> {
  await requireAdmin();
  const p = await db.promoCode.delete({ where: { id: String(id) } }).catch(() => null);
  if (p) await logActivity("promo.deleted", `Code promo ${p.code} supprimé`, { code: p.code }, "admin");
  revalidatePath(PATH);
}
