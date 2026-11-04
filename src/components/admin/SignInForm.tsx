"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FadeUp } from "../Reveal";
import { signIn, type SignInState } from "@/server/admin/actions";
import { DUR, EASE } from "@/lib/motion";

/** The admin password form, set like the shop's LoginView fields (label, field, red shake on error, full-width btn). */
export function SignInForm({ from, configured }: { from: string; configured: boolean }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});
  const [show, setShow] = useState(false);
  const error = state.error;

  return (
    <FadeUp delay={0.2} className="tile mt-10 p-8">
      {!configured && (
        <p className="mb-6 text-sm text-danger" role="alert">
          ADMIN_PASSWORD n&apos;est pas réglé : ajoute-le aux variables d&apos;environnement puis redémarre le serveur.
        </p>
      )}
      <form action={action} noValidate className="space-y-8">
        <input type="hidden" name="de" value={from} />
        <label className="block">
          <span className="mb-1.5 block text-[14px] text-muted">Mot de passe</span>
          <motion.div animate={error ? { x: [0, -8, 7, -5, 3, 0] } : { x: 0 }} transition={{ duration: DUR.fast, ease: EASE.out }} className={error ? "[&_.field]:!border-danger" : ""}>
            <div className="relative">
              <input
                name="pw"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                autoFocus
                aria-invalid={!!error}
                aria-describedby={error ? "pw-error" : undefined}
                className="field pr-24"
              />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-link hover:underline">
                {show ? "Masquer" : "Afficher"}
              </button>
            </div>
          </motion.div>
          <AnimatePresence>
            {error && (
              <motion.span id="pw-error" role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 block text-sm text-danger">
                {error}
              </motion.span>
            )}
          </AnimatePresence>
        </label>
        <button disabled={pending || !configured} className="btn w-full">
          {pending ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Chargement" /> : "Ouvrir l'admin"}
        </button>
      </form>
      <Link href="/" className="link-line mt-8 !text-[15px]">
        Retour à la boutique <span className="arrow">›</span>
      </Link>
    </FadeUp>
  );
}
