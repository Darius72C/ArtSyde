"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CAMPAIGNS, CAMPAIGN_FIELDS, type CampaignKind, type CampaignTexts } from "@/lib/campaigns";
import { previewCampaign, resetCampaign, saveCampaign, sendCampaign, sendTestCampaign, type CampaignResult } from "@/server/admin/campaigns";
import { presignAdImage } from "@/server/admin/ad";
import { EmailPreview } from "./EmailPreview";

const spinner = (label: string) => <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label={label} />;
const lost = { ok: false, message: "Connexion perdue. Réessaie." };

/**
 * A ready-made e-mail (newsletter, promotion, announcement) edited in place: its fields (empty = the template's
 * words), the preview redrawn as you type, a test to oneself, then sending to every newsletter subscriber.
 */
export function CampaignEditor({ kind, saved, initial, configured, imageConfigured, subscribers }: { kind: CampaignKind; saved: Partial<CampaignTexts>; initial: { subject: string; html: string }; configured: boolean; imageConfigured: boolean; subscribers: number }) {
  const template = CAMPAIGNS[kind];
  const [texts, setTexts] = useState<Partial<CampaignTexts>>(saved);
  const [preview, setPreview] = useState(initial);
  const [r, setR] = useState<CampaignResult | null>(null);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
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
      previewCampaign(kind, texts)
        .then(setPreview)
        .catch(() => {});
    }, 400);
    return () => window.clearTimeout(timer.current);
  }, [kind, texts]);

  const set = (k: keyof CampaignTexts, v: string) => {
    setTexts((t) => ({ ...t, [k]: v }));
    setDirty(true);
    setR(null);
  };

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setR(null);
    try {
      const signed = await presignAdImage({ type: file.type, size: file.size });
      if (!signed.ok) throw new Error(signed.message);
      const put = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": signed.contentType }, body: file }).catch(() => null);
      if (!put?.ok) throw new Error("L'envoi vers le stockage a échoué. Vérifie la règle CORS du bucket.");
      set("image", signed.publicUrl);
    } catch (e) {
      setR({ ok: false, message: e instanceof Error ? e.message : "Envoi impossible." });
    }
    setUploading(false);
  }

  const send = () => {
    if (!confirm(`Envoyer « ${preview.subject} » à ${subscribers} inscrit${subscribers > 1 ? "s" : ""} à la newsletter ? On ne peut pas l'annuler.`)) return;
    start(async () => {
      const res = await sendCampaign(kind, texts).catch(() => lost);
      setR(res);
      if (res.ok) setDirty(false);
    });
  };

  const field = (k: keyof CampaignTexts) => {
    const f = CAMPAIGN_FIELDS[k];
    const placeholder = template.defaults[k];
    if (k === "image")
      return (
        <div key={k}>
          <span className="mb-1.5 block text-[14px] text-muted">{f.label}</span>
          <div className="flex flex-wrap items-center gap-4">
            <label className={`btn-outline cursor-pointer ${!imageConfigured || uploading ? "pointer-events-none opacity-50" : ""}`}>
              <input type="file" accept="image/jpeg,image/png,image/webp" disabled={!imageConfigured || uploading} onChange={(e) => (upload(e.target.files?.[0]), (e.target.value = ""))} className="sr-only" />
              {uploading ? "Envoi…" : texts.image ? "Changer la photo" : "Choisir une photo"}
            </label>
            {texts.image && (
              <button type="button" onClick={() => set("image", "")} className="text-[15px] text-link hover:underline">
                Retirer
              </button>
            )}
          </div>
          <p className="mt-1.5 text-sm text-muted">Sans photo choisie : la première carte de l&apos;accueil.</p>
        </div>
      );
    return (
      <label key={k} className="block">
        <span className="mb-1.5 block text-[14px] text-muted">{f.label}</span>
        {f.long ? (
          <textarea rows={3} maxLength={f.max} value={texts[k] ?? ""} placeholder={placeholder} onChange={(e) => set(k, e.target.value)} className="field resize-y" />
        ) : (
          <input maxLength={f.max} value={texts[k] ?? ""} placeholder={placeholder || f.hint} inputMode={k === "products" ? "numeric" : undefined} onChange={(e) => set(k, e.target.value)} className="field" />
        )}
        {f.hint && <span className="mt-1.5 block text-sm text-muted">{f.hint}</span>}
      </label>
    );
  };

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[420px_1fr]">
      <div className="space-y-5">
        <p className="text-sm text-muted">
          {template.about} Laisse un champ vide pour garder le texte du modèle. <b className="font-semibold text-ink">{"{prenom}"}</b> devient le prénom de l&apos;inscrit (ou disparaît si on ne le connaît pas).
        </p>
        {template.fields.map(field)}
        <div className="sticky bottom-4 space-y-3 rounded-2xl border border-line bg-bg/95 p-4 backdrop-blur">
          <div className="flex flex-wrap items-center gap-5">
            <button type="button" disabled={pending || !configured || !subscribers || uploading} onClick={send} className="btn">
              {pending ? spinner("Envoi") : `Envoyer à ${subscribers} inscrit${subscribers > 1 ? "s" : ""}`}
            </button>
            <button
              type="button"
              disabled={pending || !dirty || uploading}
              onClick={() =>
                start(async () => {
                  const res = await saveCampaign(kind, texts).catch(() => lost);
                  setR(res);
                  if (res.ok) setDirty(false);
                })
              }
              className="text-[15px] text-link hover:underline disabled:text-muted disabled:no-underline"
            >
              Enregistrer le brouillon
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await resetCampaign(kind).catch(() => lost);
                  setR(res);
                  if (res.ok) {
                    setTexts({});
                    setDirty(false);
                  }
                })
              }
              className="text-[15px] text-link hover:underline"
            >
              Modèle d&apos;origine
            </button>
          </div>
          {!configured && <p className="text-sm text-new">Brevo n&apos;est pas encore configuré : l&apos;envoi s&apos;activera dès que BREVO_API_KEY et EMAIL_FROM seront dans .env.</p>}
          {configured && !subscribers && <p className="text-sm text-muted">Personne n&apos;est encore inscrit : le formulaire « Ne rate aucun drop » de l&apos;accueil remplit la liste.</p>}
          {dirty && !r && <p className="text-sm text-new">Modifications non enregistrées</p>}
          {r && (
            <p role="status" className={`text-sm ${r.ok ? "text-ok" : "text-danger"}`}>
              {r.message}
            </p>
          )}
        </div>
      </div>
      <div className="xl:sticky xl:top-20">
        <EmailPreview subject={preview.subject} html={preview.html} configured={configured} test={(to) => sendTestCampaign(kind, texts, to)} />
      </div>
    </div>
  );
}
