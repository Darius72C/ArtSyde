"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DUR, EASE } from "@/lib/motion";
import { changeMyPassword, setMyPassword, updateProfile, type SettingsResult } from "@/server/account-settings";
import { RevealLines } from "../Reveal";
import { Field } from "./CheckoutView";

const sectionTitle = "border-b border-line pb-4 text-[24px] font-semibold tracking-[-0.02em]";

function Result({ r }: { r: SettingsResult | null }) {
  return (
    <AnimatePresence>
      {r && (r.ok || !r.field) && (
        <motion.p role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: DUR.fast, ease: EASE.out }} className={`text-sm ${r.ok ? "text-ok" : "text-danger"}`}>
          {r.message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

const fieldError = (r: SettingsResult | null, name: string) => (r && !r.ok && r.field === name ? r.message : undefined);

/** Name and phone. */
function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const router = useRouter();
  const [r, setR] = useState<SettingsResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const res = await updateProfile({ name: String(f.get("name") ?? ""), phone: String(f.get("phone") ?? "") }).catch(() => null);
          setR(res ?? { ok: false, message: "Connexion perdue. Réessaie." });
          if (res?.ok) router.refresh();
        });
      }}
      className="mt-8 space-y-8"
    >
      <div className="grid gap-8 sm:grid-cols-2">
        <Field name="name" label="Nom" defaultValue={name} autoComplete="name" error={fieldError(r, "name")} />
        <Field name="phone" label="Téléphone" type="tel" defaultValue={phone} autoComplete="tel" placeholder="Pour la livraison et le paiement" error={fieldError(r, "phone")} />
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <button disabled={pending} className="btn">
          {pending ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Enregistrement" /> : "Enregistrer"}
        </button>
        <Result r={r} />
      </div>
    </form>
  );
}

/** Change the password, or create one on an account opened with Google. */
function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [r, setR] = useState<SettingsResult | null>(null);
  const [pending, start] = useTransition();
  const [show, setShow] = useState(false);
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        const next = String(f.get("next") ?? "");
        if (next !== String(f.get("confirm") ?? "")) return setR({ ok: false, field: "confirm", message: "Les deux mots de passe ne sont pas identiques." });
        start(async () => {
          const res = await (hasPassword ? changeMyPassword({ current: String(f.get("current") ?? ""), next }) : setMyPassword({ next })).catch(() => null);
          setR(res ?? { ok: false, message: "Connexion perdue. Réessaie." });
          if (res?.ok) {
            form.reset();
            router.refresh();
          }
        });
      }}
      className="mt-8 space-y-8"
    >
      {!hasPassword && <p className="text-[17px] text-muted">Tu te connectes avec Google. Crée un mot de passe pour pouvoir aussi te connecter avec ton e-mail.</p>}
      <div className="grid gap-8 sm:grid-cols-2">
        {hasPassword && (
          <div className="sm:col-span-2 sm:max-w-[calc(50%-1rem)]">
            <Field name="current" label="Mot de passe actuel" type={show ? "text" : "password"} autoComplete="current-password" error={fieldError(r, "current")} />
          </div>
        )}
        <Field name="next" label={hasPassword ? "Nouveau mot de passe" : "Mot de passe"} type={show ? "text" : "password"} autoComplete="new-password" placeholder="8 caractères minimum" error={fieldError(r, "next")} />
        <Field name="confirm" label="Confirme-le" type={show ? "text" : "password"} autoComplete="new-password" error={fieldError(r, "confirm")} />
      </div>
      <label className="flex cursor-pointer items-center gap-3 text-[15px] text-muted">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
        Afficher les mots de passe
      </label>
      <div className="flex flex-wrap items-center gap-6">
        <button disabled={pending} className="btn">
          {pending ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Enregistrement" /> : hasPassword ? "Changer le mot de passe" : "Créer le mot de passe"}
        </button>
        <Result r={r} />
      </div>
    </form>
  );
}

/** /compte/parametres: the account's e-mail and sign-in methods, name and phone, password. */
export function AccountSettings({ email, name, phone, hasPassword, google }: { email: string; name: string; phone: string; hasPassword: boolean; google: boolean }) {
  const methods = [google && "Google", hasPassword && "e-mail et mot de passe"].filter(Boolean).join(" · ");
  return (
    <div className="mx-auto max-w-[1440px] px-5 md:px-10">
      <div className="pb-10 pt-14 md:pt-20">
        <Link href="/compte" className="link-line !text-[15px]">
          <span className="arrow rotate-180">›</span> Mon compte
        </Link>
        <RevealLines as="h1" lines={[{ text: "Paramètres.", muted: "Ton compte." }]} className="display mt-6 text-5xl md:text-7xl" />
      </div>
      <div className="max-w-3xl space-y-16 pb-24">
        <section>
          <h2 className={sectionTitle}>Connexion</h2>
          <dl className="mt-6 space-y-3 text-[17px]">
            <div className="flex flex-wrap justify-between gap-x-6 gap-y-1">
              <dt className="text-muted">E-mail</dt>
              <dd>{email}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-6 gap-y-1">
              <dt className="text-muted">Connexion avec</dt>
              <dd>{methods || "—"}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className={sectionTitle}>Profil</h2>
          <ProfileForm name={name} phone={phone} />
        </section>

        <section>
          <h2 className={sectionTitle}>Mot de passe</h2>
          <PasswordForm hasPassword={hasPassword} />
        </section>
      </div>
    </div>
  );
}
