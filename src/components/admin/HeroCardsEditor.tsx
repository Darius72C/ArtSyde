"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { STAGGER } from "@/lib/motion";
import { clearHeroCard, presignHeroImage, setHeroImage, setHeroProduct } from "@/server/admin/hero";
import { FadeUp } from "../Reveal";

export type HeroSlotData = { slot: number; image: string | null; productId: string | null };
export type HeroProductOption = { id: string; name: string; active: boolean };

const PLACES = ["Devant", "À gauche", "À droite"];

/** One card of the home page's hero: its image (uploaded straight to R2), the product it leads to, remove. */
function SlotEditor({ data, products, configured, delay }: { data: HeroSlotData; products: HeroProductOption[]; configured: boolean; delay: number }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const signed = await presignHeroImage(data.slot, { type: file.type, size: file.size });
      if (!signed.ok) throw new Error(signed.message);
      const put = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": signed.contentType }, body: file }).catch(() => null);
      if (!put?.ok) throw new Error(`L'envoi vers le stockage a échoué${put ? ` (${put.status})` : ""}. Vérifie la règle CORS du bucket.`);
      const saved = await setHeroImage(data.slot, signed.publicUrl);
      if (!saved.ok) throw new Error(saved.message);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi impossible.");
    }
    setUploading(false);
  }

  const act = (fn: () => Promise<{ ok: boolean; message?: string } | void>) =>
    startTransition(async () => {
      setError(null);
      const r = await fn();
      if (r && !r.ok) setError(r.message ?? "Action impossible.");
      router.refresh();
    });

  return (
    <FadeUp delay={delay} className="tile flex flex-col p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[21px] font-semibold">{PLACES[data.slot]}</p>
        {data.slot === 0 && <span className="text-sm text-muted">La plus grande</span>}
      </div>

      <div className="relative mt-5 aspect-[4/5] overflow-hidden rounded-[22px] bg-bg">
        {data.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- R2's public domain is set per deployment
          <img src={data.image} alt={`Carte ${PLACES[data.slot].toLowerCase()}`} className="h-full w-full object-cover" />
        ) : (
          <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted">Pas d&apos;image : l&apos;accueil montre la photo d&apos;un des derniers modèles.</p>
        )}
      </div>

      <label className={`btn-outline mt-5 cursor-pointer ${!configured || uploading ? "pointer-events-none opacity-50" : ""}`}>
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={!configured || uploading} onChange={(e) => (upload(e.target.files?.[0]), (e.target.value = ""))} className="sr-only" />
        {uploading ? "Envoi…" : data.image ? "Changer l'image" : "Choisir une image"}
      </label>

      <label className="mt-5 block">
        <span className="mb-1.5 block text-[14px] text-muted">Mène vers</span>
        <select
          value={data.productId ?? ""}
          disabled={!data.image || busy}
          onChange={(e) => act(() => setHeroProduct(data.slot, e.target.value || null))}
          className="field disabled:opacity-50"
        >
          <option value="">La boutique (sans nom ni prix)</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.active ? "" : " (masqué)"}
            </option>
          ))}
        </select>
      </label>

      {data.image && (
        <button type="button" disabled={busy} onClick={() => act(() => clearHeroCard(data.slot))} className="mt-5 self-start text-[15px] text-danger hover:underline">
          Retirer la carte
        </button>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
    </FadeUp>
  );
}

/** The three hero cards side by side. */
export function HeroCardsEditor({ slots, products, configured }: { slots: HeroSlotData[]; products: HeroProductOption[]; configured: boolean }) {
  return (
    <div className="space-y-5">
      {!configured && <p className="text-sm text-new">Le stockage n&apos;est pas encore configuré : ajoute les variables R2_* dans .env (voir .env.example), puis relance pnpm dev.</p>}
      <div className="grid gap-5 md:grid-cols-3">
        {slots.map((s, i) => (
          <SlotEditor key={s.slot} data={s} products={products} configured={configured} delay={i * STAGGER.item} />
        ))}
      </div>
      <p className="text-sm text-muted">JPG, PNG ou WebP, 20 Mo maximum. Format conseillé : vertical (4:5). Une carte sans image prend la photo d&apos;un des derniers modèles.</p>
    </div>
  );
}
