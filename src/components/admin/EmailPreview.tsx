"use client";

import { useState, useTransition } from "react";
import { sendTestWelcome, type TestEmailResult } from "@/server/admin/emails";
import { Field } from "../pages/CheckoutView";

/**
 * The e-mail as received (in a frame, phone or computer width), and sending a test to oneself.
 * `test`: what sends it (the welcome e-mail with its saved words by default).
 */
export function EmailPreview({ subject, html, configured, test = sendTestWelcome }: { subject: string; html: string; configured: boolean; test?: (to: string) => Promise<TestEmailResult> }) {
  const [width, setWidth] = useState<"desktop" | "mobile">("desktop");
  const [r, setR] = useState<TestEmailResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-[15px]">
          <span className="text-muted">Objet :</span> <b className="font-semibold">{subject}</b>
        </p>
        <div className="flex rounded-full bg-surface p-1" role="radiogroup" aria-label="Largeur de l'aperçu">
          {(["desktop", "mobile"] as const).map((w) => (
            <button key={w} type="button" role="radio" aria-checked={width === w} onClick={() => setWidth(w)} className={`rounded-full px-4 py-1.5 text-[14px] ${width === w ? "bg-bg font-medium shadow-[0_1px_4px_rgba(0,0,0,0.12)]" : "text-muted"}`}>
              {w === "desktop" ? "Ordinateur" : "Téléphone"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-[#f5f5f7]">
        <iframe title={`Aperçu : ${subject}`} srcDoc={html} sandbox="" className="mx-auto block h-[900px] border-0 bg-[#f5f5f7] transition-[width] duration-500" style={{ width: width === "desktop" ? "100%" : 390 }} />
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const to = String(new FormData(e.currentTarget).get("to") ?? "");
          start(async () => setR(await test(to).catch(() => ({ ok: false, message: "Connexion perdue. Réessaie." }))));
        }}
        className="flex flex-wrap items-end gap-6 rounded-2xl border border-line p-6"
      >
        <div className="min-w-64 flex-1">
          <Field name="to" type="email" label="M'envoyer un test à" placeholder="toi@exemple.com" autoComplete="email" />
        </div>
        <button disabled={pending || !configured} className="btn">
          {pending ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Envoi" /> : "Envoyer le test"}
        </button>
        {!configured && <p className="w-full text-sm text-new">Brevo n&apos;est pas encore configuré : l&apos;envoi s&apos;activera dès que BREVO_API_KEY et EMAIL_FROM seront dans .env.</p>}
        {r && <p role="status" className={`w-full text-sm ${r.ok ? "text-ok" : "text-danger"}`}>{r.message}</p>}
      </form>
    </div>
  );
}
