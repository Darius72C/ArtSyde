"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { STAGGER } from "@/lib/motion";
import { clearHeroCard, presignHeroImage, setHeroImage } from "@/server/admin/hero";
import { FadeUp } from "../Reveal";

export type HeroSlotData = { slot: number; image: string | null };

const PLACES = ["Devant", "À gauche", "À droite"];

/** One card of the home page's hero, an ad visual: its image (uploaded straight to R2), or remove it. */
function SlotEditor({ data, configured, delay }: { data: HeroSlotData; configured: boolean; delay: number }) {
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

  const remove = () =>
    startTransition(async () => {
      setError(null);
      await clearHeroCard(data.slot);
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

      {data.image && (
        <button type="button" disabled={busy} onClick={remove} className="mt-5 self-start text-[15px] text-danger hover:underline">
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
export function HeroCardsEditor({ slots, configured }: { slots: HeroSlotData[]; configured: boolean }) {
  return (
    <div className="space-y-5">
      {!configured && <p className="text-sm text-new">Le stockage n&apos;est pas encore configuré : ajoute les variables R2_* dans .env (voir .env.example), puis relance pnpm dev.</p>}
      <div className="grid gap-5 md:grid-cols-3">
        {slots.map((s, i) => (
          <SlotEditor key={s.slot} data={s} configured={configured} delay={i * STAGGER.item} />
        ))}
      </div>
      <p className="text-sm text-muted">JPG, PNG ou WebP, 20 Mo maximum. Format conseillé : vertical (4:5). Ce sont des visuels de pub : ni nom, ni prix, ni lien. Une carte sans image prend la photo d&apos;un des derniers modèles.</p>
    </div>
  );
}
