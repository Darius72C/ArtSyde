"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, ADMIN_MAX_AGE, ADMIN_SIGN_IN, safeAdminPath, signAdminToken } from "./token";

export type SignInState = { error?: string };

const digest = (s: string) => createHash("sha256").update(s).digest();

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return { error: "ADMIN_PASSWORD n'est pas réglé sur le serveur." };
  const pw = String(form.get("pw") ?? "");
  if (!pw) return { error: "Entre le mot de passe." };
  if (!timingSafeEqual(digest(pw), digest(secret))) {
    // Slows down guessing.
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Mot de passe incorrect." };
  }
  (await cookies()).set(ADMIN_COOKIE, await signAdminToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_MAX_AGE,
  });
  redirect(safeAdminPath(form.get("de")));
}

export async function signOut() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect(ADMIN_SIGN_IN);
}
