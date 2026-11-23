"use client";

import { useHref, useLocale, useT } from "../I18nProvider";
import Link from "@/components/LocaleLink";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DUR, EASE } from "@/lib/motion";
import { changeMyPassword, deleteMyAccount, setMyPassword, updateProfile, type SettingsResult } from "@/server/account-settings";
import { RevealLines } from "../Reveal";
import { Field } from "./CheckoutView";

const sectionTitle = "border-b border-line pb-4 text-[24px] font-semibold tracking-[-0.02em]";

function Result({ r }: { r: SettingsResult | null }) {
  const t = useT();
  return (
    <AnimatePresence>
      {r && (r.ok || !r.field) && (
        <motion.p role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: DUR.fast, ease: EASE.out }} className={`text-sm ${r.ok ? "text-ok" : "text-danger"}`}>
          {t(r.message)}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

const fieldError = (r: SettingsResult | null, name: string) => (r && !r.ok && r.field === name ? r.message : undefined);

/** Name and phone. */
function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const t = useT();
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
          setR(res ?? { ok: false, message: t("Connexion perdue. Réessaie.") });
          if (res?.ok) router.refresh();
        });
      }}
      className="mt-8 space-y-8"
    >
      <div className="grid gap-8 sm:grid-cols-2">
        <Field name="name" label={t("Nom")} defaultValue={name} autoComplete="name" error={fieldError(r, "name")} />
        <Field name="phone" label={t("Téléphone")} type="tel" defaultValue={phone} autoComplete="tel" placeholder={t("Pour la livraison et le paiement")} error={fieldError(r, "phone")} />
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <button disabled={pending} className="btn">
          {pending ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label={t("Enregistrement")} /> : t("Enregistrer")}
        </button>
        <Result r={r} />
      </div>
    </form>
  );
}

/** Change the password, or create one on an account opened with Google. */
function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const t = useT();
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
        if (next !== String(f.get("confirm") ?? "")) return setR({ ok: false, field: "confirm", message: t("Les deux mots de passe ne sont pas identiques.") });
        start(async () => {
          const res = await (hasPassword ? changeMyPassword({ current: String(f.get("current") ?? ""), next }) : setMyPassword({ next })).catch(() => null);
          setR(res ?? { ok: false, message: t("Connexion perdue. Réessaie.") });
          if (res?.ok) {
            form.reset();
            router.refresh();
          }
        });
      }}
      className="mt-8 space-y-8"
    >
      {!hasPassword && <p className="text-[17px] text-muted">{t("Tu te connectes avec Google. Crée un mot de passe pour pouvoir aussi te connecter avec ton e-mail.")}</p>}
      <div className="grid gap-8 sm:grid-cols-2">
        {hasPassword && (
          <div className="sm:col-span-2 sm:max-w-[calc(50%-1rem)]">
            <Field name="current" label={t("Mot de passe actuel")} type={show ? "text" : "password"} autoComplete="current-password" error={fieldError(r, "current")} />
          </div>
        )}
        <Field name="next" label={hasPassword ? t("Nouveau mot de passe") : t("Mot de passe")} type={show ? "text" : "password"} autoComplete="new-password" placeholder={t("8 caractères minimum")} error={fieldError(r, "next")} />
        <Field name="confirm" label={t("Confirme-le")} type={show ? "text" : "password"} autoComplete="new-password" error={fieldError(r, "confirm")} />
      </div>
      <label className="flex cursor-pointer items-center gap-3 text-[15px] text-muted">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
        {t("Afficher les mots de passe")}
      </label>
      <div className="flex flex-wrap items-center gap-6">
        <button disabled={pending} className="btn">
          {pending ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label={t("Enregistrement")} /> : hasPassword ? t("Changer le mot de passe") : t("Créer le mot de passe")}
        </button>
        <Result r={r} />
      </div>
    </form>
  );
}

/** Deletes the account, after the customer types SUPPRIMER. */
function DeleteAccount() {
  const t = useT();
  const href = useHref();
  const word = useLocale() === "en" ? "DELETE" : "SUPPRIMER";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [r, setR] = useState<SettingsResult | null>(null);
  const [pending, start] = useTransition();
  if (!open) {
    return (
      <div className="mt-6">
        <p className="text-[15px] text-muted">{t("Ton compte, tes créations sauvegardées et tes crédits restants seront supprimés. Tes commandes restent enregistrées pour l'atelier.")}</p>
        <button type="button" onClick={() => setOpen(true)} className="mt-6 text-[15px] text-danger hover:underline">
          {t("Supprimer mon compte")}
        </button>
      </div>
    );
  }
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const res = await deleteMyAccount({ confirm: String(f.get("confirm") ?? "") }).catch(() => null);
          setR(res ?? { ok: false, message: t("Connexion perdue. Réessaie.") });
          if (res?.ok) {
            router.push(href("/?compte=supprime"));
            router.refresh();
          }
        });
      }}
      className="mt-6 space-y-6 rounded-[22px] border border-danger/40 p-6"
    >
      <div className="space-y-2 text-[15px]">
        <p className="font-semibold">{t("Supprimer définitivement ton compte ?")}</p>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>{t("Tu ne pourras plus te connecter avec ce compte.")}</li>
          <li>{t("Tes créations sauvegardées et tes crédits restants sont perdus.")}</li>
          <li>{t("Tes commandes restent enregistrées pour l'atelier et la comptabilité.")}</li>
          <li>{t("Si tu reviens avec le même e-mail, les crédits de bienvenue ne seront pas offerts une seconde fois.")}</li>
        </ul>
      </div>
      <Field name="confirm" label={t("Écris {word} pour confirmer.", { word }).replace(/\.$/, "")} autoComplete="off" error={fieldError(r, "confirm")} />
      <div className="flex flex-wrap items-center gap-6">
        <button disabled={pending} className="btn !bg-danger !text-white">
          {pending ? <span className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent" aria-label={t("Suppression")} /> : t("Supprimer mon compte")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-[15px] text-muted hover:text-ink">
          {t("Annuler")}
        </button>
        <Result r={r} />
      </div>
    </form>
  );
}

/** /compte/parametres: the account's e-mail and sign-in methods, name and phone, password. */
export function AccountSettings({ email, name, phone, hasPassword, google }: { email: string; name: string; phone: string; hasPassword: boolean; google: boolean }) {
  const t = useT();
  const methods = [google && "Google", hasPassword && t("e-mail et mot de passe")].filter(Boolean).join(" · ");
  return (
    <div className="mx-auto max-w-[1440px] px-5 md:px-10">
      <div className="pb-10 pt-14 md:pt-20">
        <Link href="/compte" className="link-line !text-[15px]">
          <span className="arrow rotate-180">›</span> {t("Mon compte")}
        </Link>
        <RevealLines as="h1" lines={[{ text: t("Paramètres."), muted: t("Ton compte.") }]} className="display mt-6 text-5xl md:text-7xl" />
      </div>
      <div className="max-w-3xl space-y-16 pb-24">
        <section>
          <h2 className={sectionTitle}>{t("Connexion")}</h2>
          <dl className="mt-6 space-y-3 text-[17px]">
            <div className="flex flex-wrap justify-between gap-x-6 gap-y-1">
              <dt className="text-muted">{t("E-mail")}</dt>
              <dd>{email}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-6 gap-y-1">
              <dt className="text-muted">{t("Connexion avec")}</dt>
              <dd>{methods || "—"}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className={sectionTitle}>{t("Profil")}</h2>
          <ProfileForm name={name} phone={phone} />
        </section>

        <section>
          <h2 className={sectionTitle}>{t("Mot de passe")}</h2>
          <PasswordForm hasPassword={hasPassword} />
        </section>

        <section>
          <h2 className={sectionTitle}>{t("Supprimer le compte")}</h2>
          <DeleteAccount />
        </section>
      </div>
    </div>
  );
}
