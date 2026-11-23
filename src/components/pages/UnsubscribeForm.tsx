"use client";

import { useState, useTransition } from "react";
import { unsubscribeNewsletter, type NewsletterResult } from "@/server/newsletter";
import { useT } from "../I18nProvider";

/** The button that confirms leaving the newsletter (a click, so an inbox opening the link does nothing). */
export function UnsubscribeForm({ token }: { token: string }) {
  const t = useT();
  const [r, setR] = useState<NewsletterResult | null>(null);
  const [pending, start] = useTransition();
  if (r?.ok) return <p role="status" className="text-ok">{t("C'est fait : tu ne recevras plus la newsletter. Les e-mails de tes commandes, eux, continuent d'arriver.")}</p>;
  return (
    <div className="space-y-4">
      <button type="button" disabled={pending || !token} onClick={() => start(async () => setR(await unsubscribeNewsletter(token).catch(() => ({ ok: false, message: t("Connexion perdue. Réessaie.") }))))} className="btn">
        {pending ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label={t("Envoi")} /> : t("Me désabonner")}
      </button>
      {!token && <p className="text-sm text-danger">{t("Lien incomplet : ouvre celui reçu dans l'e-mail.")}</p>}
      {r && !r.ok && <p role="status" className="text-sm text-danger">{t(r.message)}</p>}
    </div>
  );
}
