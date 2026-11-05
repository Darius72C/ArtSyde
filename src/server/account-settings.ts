"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { getMyCustomer } from "@/server/account";

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
    console.error("updateProfile failed", e);
    return { ok: false, message: "Tes informations n'ont pas pu être enregistrées. Réessaie." };
  }
  revalidatePath("/compte");
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
    console.error("changeMyPassword failed", e);
    return { ok: false, message: "Le mot de passe n'a pas pu être changé. Réessaie." };
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
    console.error("setMyPassword failed", e);
    return { ok: false, message: "Le mot de passe n'a pas pu être créé. Réessaie." };
  }
}
