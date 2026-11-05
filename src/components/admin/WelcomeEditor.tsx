"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { DEFAULT_WELCOME, WELCOME_FIELDS, type WelcomeTexts } from "@/lib/email-texts";
import { previewWelcome, resetWelcomeTexts, saveWelcomeTexts, type TestEmailResult } from "@/server/admin/emails";
import { EmailPreview } from "./EmailPreview";

/**
 * The welcome e-mail's words, edited in place: each field (empty = the default), the preview redrawn as you
 * type, then saved for the next accounts. {prenom} and {credits} are replaced in every text.
 */
export function WelcomeEditor({ saved, initial, configured }: { saved: Partial<WelcomeTexts>; initial: { subject: string; html: string }; configured: boolean }) {
  const [texts, setTexts] = useState<Partial<WelcomeTexts>>(saved);
  const [preview, setPreview] = useState(initial);
  const [r, setR] = useState<TestEmailResult | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const timer = useRef<number | undefined>(undefined);
  const first = useRef(true);

  // The preview follows the words, 400 ms after the last key.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      previewWelcome(texts)
        .then(setPreview)
        .catch(() => {});
    }, 400);
    return () => window.clearTimeout(timer.current);
  }, [texts]);

  const set = (k: keyof WelcomeTexts, v: string) => {
    setTexts((t) => ({ ...t, [k]: v }));
    setDirty(true);
    setR(null);
  };

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[420px_1fr]">
      <div className="space-y-5">
        <p className="text-sm text-muted">
          Laisse un champ vide pour garder le texte d&apos;origine. <b className="font-semibold text-ink">{"{prenom}"}</b> devient le prénom du client, <b className="font-semibold text-ink">{"{credits}"}</b> le nombre de crédits offerts.
        </p>
        {WELCOME_FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1.5 block text-[14px] text-muted">{f.label}</span>
            {f.long ? (
              <textarea rows={3} maxLength={f.max} value={texts[f.key] ?? ""} placeholder={DEFAULT_WELCOME[f.key]} onChange={(e) => set(f.key, e.target.value)} className="field resize-y" />
            ) : (
              <input maxLength={f.max} value={texts[f.key] ?? ""} placeholder={DEFAULT_WELCOME[f.key]} onChange={(e) => set(f.key, e.target.value)} className="field" />
            )}
          </label>
        ))}
        <div className="sticky bottom-4 flex flex-wrap items-center gap-5 rounded-2xl border border-line bg-bg/95 p-4 backdrop-blur">
          <button
            type="button"
            disabled={pending || !dirty}
            onClick={() =>
              start(async () => {
                setR(await saveWelcomeTexts(texts).catch(() => ({ ok: false, message: "Connexion perdue. Réessaie." })));
                setDirty(false);
              })
            }
            className="btn"
          >
            {pending ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Enregistrement" /> : "Enregistrer"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await resetWelcomeTexts().catch(() => ({ ok: false, message: "Connexion perdue. Réessaie." }));
                setR(res);
                if (res.ok) {
                  setTexts({});
                  setDirty(false);
                }
              })
            }
            className="text-[15px] text-link hover:underline"
          >
            Textes par défaut
          </button>
          {dirty && !r && <span className="text-sm text-new">Modifications non enregistrées</span>}
          {r && <span role="status" className={`text-sm ${r.ok ? "text-ok" : "text-danger"}`}>{r.message}</span>}
        </div>
      </div>
      <div className="xl:sticky xl:top-20">
        <EmailPreview subject={preview.subject} html={preview.html} configured={configured} />
        {dirty && <p className="mt-3 text-sm text-muted">L&apos;e-mail de test part avec les textes enregistrés : enregistre d&apos;abord.</p>}
      </div>
    </div>
  );
}
