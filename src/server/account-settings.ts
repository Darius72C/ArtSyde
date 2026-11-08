"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { getMyCustomer } from "@/server/account";
import { logActivity, logError } from "@/server/log";
import { deleteObject, keyFromPublicUrl, r2Config } from "@/server/r2";

/*
 * The signed-in customer's settings (/compte/parametres): name and phone, and the password
 * (change it, or set one on an account opened with Google). Each action works on the session's
 * own account only.
 */

export type SettingsResult = { ok: true; message: string } | { ok: false; field?: string; message: string };

const PHONE = /^\+?[\d\s]{8,}$/;
/** Better Auth's error code, when it threw one. */
const codeOf = (e: unknown) => (e as { body?: { code?: string } })?.body?.code;

export async function updateProfile(input: { name: string; phone: string }): Promise<SettingsResult> {
  const me = await getMyCustomer();
  if (!me) return { ok: false, message: "Ta session a expiré : reconnecte-toi." };
  const name = String(input?.name ?? "").trim().slice(0, 120);
  const phone = String(input?.phone ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2) return { ok: false, field: "name", message: "Indique ton nom." };
  if (phone && !PHONE.test(phone)) return { ok: false, field: "phone", message: "Numéro invalide." };
  if (phone) {
    const taken = await db.customer.findFirst({ where: { phone, NOT: { id: me.customer.id } }, select: { id: true } });
    if (taken) return { ok: false, field: "phone", message: "Ce numéro est déjà utilisé par un autre compte. Écris-nous si c'est le tien." };
  }
  try {
    await auth.api.updateUser({ body: { name }, headers: await headers() });
    await db.customer.update({ where: { id: me.customer.id }, data: { name, phone: phone || null } });
  } catch (e) {
    await logError("updateProfile", e);
    return { ok: false, message: "Tes informations n'ont pas pu être enregistrées. Réessaie." };
  }
  revalidatePath("/compte");
  await logActivity("account.updated", `Profil mis à jour : ${name}`, { phone: Boolean(phone) }, `client:${me.customer.id}`);
  return { ok: true, message: "Enregistré." };
}

export async function changeMyPassword(input: { current: string; next: string }): Promise<SettingsResult> {
  if (String(input?.next ?? "").length < 8) return { ok: false, field: "next", message: "8 caractères minimum." };
  try {
    // The other devices are signed out: whoever knew the old password loses access.
    await auth.api.changePassword({ body: { currentPassword: String(input.current ?? ""), newPassword: input.next, revokeOtherSessions: true }, headers: await headers() });
    return { ok: true, message: "Mot de passe changé. Tes autres appareils ont été déconnectés." };
  } catch (e) {
    const code = codeOf(e);
    if (code === "INVALID_PASSWORD") return { ok: false, field: "current", message: "Mot de passe actuel incorrect." };
    if (code === "PASSWORD_TOO_SHORT") return { ok: false, field: "next", message: "8 caractères minimum." };
    if (code === "PASSWORD_TOO_LONG") return { ok: false, field: "next", message: "Mot de passe trop long." };
    if (code === "CREDENTIAL_ACCOUNT_NOT_FOUND") return { ok: false, message: "Ton compte n'a pas encore de mot de passe : crée-le d'abord." };
    await logError("changeMyPassword", e);
    return { ok: false, message: "Le mot de passe n'a pas pu être changé. Réessaie." };
  }
}

/** The word the customer types to confirm the deletion of their account. */
const DELETE_WORD = "SUPPRIMER";

/**
 * Deletes the signed-in customer's account: their sign-in (user, sessions, Google link), their saved
 * creations and their remaining credits. Their customer record stays as an archive (orders, credit history,
 * e-mail): the workshop keeps its accounting, and someone who signs up again with the same e-mail is linked
 * back to it by linkCustomer, which sees the signup credits already given and doesn't give them twice.
 */
export async function deleteMyAccount(input: { confirm: string }): Promise<SettingsResult> {
  if (String(input?.confirm ?? "").trim().toUpperCase() !== DELETE_WORD) return { ok: false, field: "confirm", message: `Écris ${DELETE_WORD} pour confirmer.` };
  const me = await getMyCustomer();
  if (!me) return { ok: false, message: "Ta session a expiré : reconnecte-toi." };
  const { user, customer } = me;
  try {
    const designs = await db.savedDesign.findMany({ where: { customerId: customer.id }, select: { front: true, back: true } });
    const left = await db.$transaction(async (tx) => {
      const balance = (await tx.creditEntry.aggregate({ where: { customerId: customer.id }, _sum: { amount: true } }))._sum.amount ?? 0;
      // Remaining credits are lost with the account (written in the ledger, so the history adds up).
      if (balance > 0) await tx.creditEntry.create({ data: { customerId: customer.id, amount: -balance, reason: "ADJUSTMENT" } });
      await tx.savedDesign.deleteMany({ where: { customerId: customer.id } });
      await tx.customer.update({ where: { id: customer.id }, data: { userId: null } });
      await tx.user.delete({ where: { id: user.id } }); // sessions and sign-in methods go with it
      return balance;
    });
    // The images of the saved creations, from the storage (best effort: the account is already gone).
    const cfg = r2Config();
    if (cfg) {
      const srcs = new Set(designs.flatMap((d) => [d.front, d.back]).flatMap((s) => ((s as { images?: { src?: string }[] } | null)?.images ?? []).map((i) => String(i?.src ?? ""))));
      for (const src of srcs) {
        const key = keyFromPublicUrl(cfg, src);
        if (key?.startsWith(`saved/${customer.id}/`)) await deleteObject(cfg, key);
      }
    }
    // The session no longer exists: its cookies go too, so the browser is signed out right away.
    const jar = await cookies();
    for (const c of jar.getAll()) if (c.name.includes("better-auth")) jar.delete(c.name);
    await logActivity(
      "account.deleted",
      `Compte supprimé : ${user.name || user.email} (${user.email})${designs.length ? `, ${designs.length} création${designs.length > 1 ? "s" : ""} effacée${designs.length > 1 ? "s" : ""}` : ""}${left > 0 ? `, ${left} crédit${left > 1 ? "s" : ""} perdu${left > 1 ? "s" : ""}` : ""}. Fiche client archivée : pas de crédits offerts s'il revient avec cet e-mail.`,
      { userId: user.id, customerId: customer.id, credits: left, designs: designs.length },
      `client:${customer.id}`,
    );
    return { ok: true, message: "Ton compte a été supprimé." };
  } catch (e) {
    await logError("deleteMyAccount", e, { userId: user.id });
    return { ok: false, message: "Ton compte n'a pas pu être supprimé. Réessaie ou écris-nous." };
  }
}

/** For an account opened with Google: adds a password, so it can also sign in with its e-mail. */
export async function setMyPassword(input: { next: string }): Promise<SettingsResult> {
  if (String(input?.next ?? "").length < 8) return { ok: false, field: "next", message: "8 caractères minimum." };
  try {
    await auth.api.setPassword({ body: { newPassword: input.next }, headers: await headers() });
    revalidatePath("/compte/parametres");
    return { ok: true, message: "Mot de passe créé : tu peux aussi te connecter avec ton e-mail." };
  } catch (e) {
    const code = codeOf(e);
    if (code === "PASSWORD_ALREADY_SET") return { ok: false, message: "Ton compte a déjà un mot de passe : change-le plutôt." };
    if (code === "PASSWORD_TOO_SHORT") return { ok: false, field: "next", message: "8 caractères minimum." };
    await logError("setMyPassword", e);
    return { ok: false, message: "Le mot de passe n'a pas pu être créé. Réessaie." };
  }
}
