"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PLACEMENTS, PLACEMENT_KEYS, type AdBanner, type Placement } from "@/lib/ad";
import { deleteBanner, presignAdImage, saveBanner, type AdSaveResult } from "@/server/admin/ad";
import { AdStrip } from "../home/AdStrip";
import { Field } from "../pages/CheckoutView";

const EMPTY: AdBanner = { enabled: true, image: "", tone: "light", placement: "home.afterNew" };

/**
 * Every banner of the site, each with its place ("Où l'afficher"). Saved ones come from the server; "Ajouter une
 * bannière" opens a new empty one, which joins the list once saved.
 */
export function AdsManager({ ads, configured }: { ads: AdBanner[]; configured: boolean }) {
  const [drafts, setDrafts] = useState<number[]>(ads.length ? [] : [0]);
  const [next, setNext] = useState(1);
  const drop = (n: number) => setDrafts((d) => d.filter((x) => x !== n));
  return (
    <div className="space-y-6">
      {ads.map((ad, i) => (
        <AdEditor key={ad.id ?? i} initial={ad} configured={configured} />
      ))}
      {drafts.map((n) => (
        <AdEditor key={`new-${n}`} initial={null} configured={configured} onDone={() => drop(n)} />
      ))}
      <button type="button" onClick={() => (setDrafts((d) => [...d, next]), setNext((x) => x + 1))} className="btn-outline">
        Ajouter une bannière
      </button>
    </div>
  );
}

/** One banner: where it shows, image, words, link, button, shown or hidden, with its preview as on the site. */
export function AdEditor({ initial, configured, onDone }: { initial: AdBanner | null; configured: boolean; onDone?: () => void }) {
  const router = useRouter();
  const [ad, setAd] = useState<AdBanner>(initial ?? EMPTY);
  const [uploading, setUploading] = useState(false);
  const [r, setR] = useState<AdSaveResult | null>(null);
  const [pending, start] = useTransition();
  const set = (patch: Partial<AdBanner>) => (setAd((a) => ({ ...a, ...patch })), setR(null));
  const err = (f: string) => (r && !r.ok && r.field === f ? r.message : undefined);

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setR(null);
    try {
      const signed = await presignAdImage({ type: file.type, size: file.size });
      if (!signed.ok) throw new Error(signed.message);
      const put = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": signed.contentType }, body: file }).catch(() => null);
      if (!put?.ok) throw new Error("L'envoi vers le stockage a échoué. Vérifie la règle CORS du bucket.");
      set({ image: signed.publicUrl });
    } catch (e) {
      setR({ ok: false, field: "image", message: e instanceof Error ? e.message : "Envoi impossible." });
    }
    setUploading(false);
  }

  const save = () =>
    start(async () => {
      const res = await saveBanner(ad).catch(() => ({ ok: false as const, message: "Connexion perdue. Réessaie." }));
      setR(res);
      if (res.ok) {
        setAd((a) => ({ ...a, id: res.id }));
        router.refresh();
        onDone?.();
      }
    });

  return (
    <div className="space-y-8 rounded-2xl border border-line p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[17px] font-semibold">{initial ? ad.title || "Bannière" : "Nouvelle bannière"}</p>
        <span className={`text-sm ${initial && initial.image && (initial.enabled || initial.email) ? "text-ok" : "text-muted"}`}>
          {!initial ? "Pas encore enregistrée" : [initial.enabled && initial.image ? "En ligne" : "Masquée sur le site", initial.email && initial.image ? "dans les e-mails" : ""].filter(Boolean).join(" · ")}
        </span>
      </div>

      <label className="block max-w-md">
        <span className="mb-1.5 block text-[14px] text-muted">Où l&apos;afficher</span>
        <select value={ad.placement ?? ""} onChange={(e) => set({ placement: e.target.value as Placement })} className="field">
          {PLACEMENT_KEYS.map((k) => (
            <option key={k} value={k}>
              {PLACEMENTS[k]}
            </option>
          ))}
        </select>
        {err("placement") && <span className="mt-1.5 block text-sm text-danger">{err("placement")}</span>}
      </label>

      {/* Preview, as on the site */}
      <div>
        <p className="mb-3 text-sm text-muted">Aperçu</p>
        {ad.image ? (
          <AdStrip ad={ad} preview />
        ) : (
          <div className="grid h-[140px] place-items-center rounded-[22px] border border-dashed border-line text-sm text-muted sm:h-[180px]">Ajoute une image : 2400 × 480 px conseillé (format 5:1)</div>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-3 text-[15px]">
        <input type="checkbox" checked={ad.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="h-5 w-5 accent-[var(--accent)]" />
        Afficher la bannière sur le site
      </label>
      <label className="-mt-4 flex cursor-pointer items-start gap-3 text-[15px]">
        <input type="checkbox" checked={Boolean(ad.email)} onChange={(e) => set({ email: e.target.checked })} className="mt-0.5 h-5 w-5 accent-[var(--accent)]" />
        <span>
          Afficher aussi dans les e-mails
          <span className="block text-sm text-muted">Sous le contenu des e-mails envoyés aux clients (bienvenue…), avec son lien. Une seule bannière par e-mail : la première de la liste.</span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <label className={`btn-outline cursor-pointer ${!configured || uploading ? "pointer-events-none opacity-50" : ""}`}>
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={!configured || uploading} onChange={(e) => (upload(e.target.files?.[0]), (e.target.value = ""))} className="sr-only" />
          {uploading ? "Envoi…" : ad.image ? "Changer l'image" : "Choisir une image"}
        </label>
        <span className="text-sm text-muted">Bannière horizontale, 2400 × 480 px conseillé. Garde l&apos;essentiel au centre : elle est recadrée sur téléphone.</span>
        {err("image") && <p className="w-full text-sm text-danger">{err("image")}</p>}
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <Field name="title" label="Titre (facultatif)" value={ad.title ?? ""} onChange={(e) => set({ title: e.target.value })} maxLength={70} placeholder="Nouvelle collection" />
        <Field name="text" label="Texte (facultatif)" value={ad.text ?? ""} onChange={(e) => set({ text: e.target.value })} maxLength={140} placeholder="-20 % sur les t-shirts d'équipe" />
        <Field name="url" label="Lien (facultatif)" value={ad.url ?? ""} onChange={(e) => set({ url: e.target.value })} placeholder="/studio ou https://…" error={err("url")} />
        <Field name="button" label="Bouton (facultatif)" value={ad.button ?? ""} onChange={(e) => set({ button: e.target.value })} maxLength={30} placeholder="Découvrir" />
      </div>

      <fieldset>
        <legend className="mb-3 text-[14px] text-muted">Couleur du texte sur l&apos;image</legend>
        <div className="flex w-fit rounded-full bg-surface p-1">
          {(["light", "dark"] as const).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={(ad.tone ?? "light") === t} onClick={() => set({ tone: t })} className={`rounded-full px-4 py-1.5 text-[14px] ${(ad.tone ?? "light") === t ? "bg-bg font-medium shadow-[0_1px_4px_rgba(0,0,0,0.12)]" : "text-muted"}`}>
              {t === "light" ? "Clair (image sombre)" : "Foncé (image claire)"}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-6 border-t border-line pt-8">
        <button type="button" onClick={save} disabled={pending || uploading} className="btn">
          {pending ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Enregistrement" /> : "Enregistrer"}
        </button>
        {initial?.id ? (
          <button type="button" disabled={pending} onClick={() => confirm("Supprimer cette bannière ?") && start(async () => (await deleteBanner(initial.id!), router.refresh()))} className="text-[15px] text-danger hover:underline">
            Supprimer la bannière
          </button>
        ) : (
          onDone && (
            <button type="button" disabled={pending} onClick={onDone} className="text-[15px] text-muted hover:underline">
              Annuler
            </button>
          )
        )}
        {r && (r.ok || !r.field) && <p role="status" className={`text-sm ${r.ok ? "text-ok" : "text-danger"}`}>{r.ok ? (ad.enabled ? "Enregistré : la bannière est en ligne." : ad.email ? "Enregistré : la bannière est dans les e-mails, pas sur le site." : "Enregistré : la bannière est masquée.") : r.message}</p>}
      </div>
    </div>
  );
}
