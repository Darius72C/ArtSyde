"use client";

import { useState, useTransition } from "react";
import { unsubscribeNewsletter, type NewsletterResult } from "@/server/newsletter";

/** The button that confirms leaving the newsletter (a click, so an inbox opening the link does nothing). */
export function UnsubscribeForm({ token }: { token: string }) {
  const [r, setR] = useState<NewsletterResult | null>(null);
  const [pending, start] = useTransition();
  if (r?.ok) return <p role="status" className="text-ok">C&apos;est fait : tu ne recevras plus la newsletter. Les e-mails de tes commandes, eux, continuent d&apos;arriver.</p>;
  return (
    <div className="space-y-4">
      <button type="button" disabled={pending || !token} onClick={() => start(async () => setR(await unsubscribeNewsletter(token).catch(() => ({ ok: false, message: "Connexion perdue. Réessaie." }))))} className="btn">
        {pending ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Envoi" /> : "Me désabonner"}
      </button>
      {!token && <p className="text-sm text-danger">Lien incomplet : ouvre celui reçu dans l&apos;e-mail.</p>}
      {r && !r.ok && <p role="status" className="text-sm text-danger">{r.message}</p>}
    </div>
  );
}
