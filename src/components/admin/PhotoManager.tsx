"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DUR, EASE, SPRING } from "@/lib/motion";
import { addPhoto, movePhoto, presignPhoto, removePhoto } from "@/server/admin/products";

/** The words of each list: the shop's photos, or the flat mockups (the "Mockup" tab). */
const WORDS = {
  photos: { one: "Photo", none: "Pas encore de photo : la boutique montre l'illustration du t-shirt.", add: "Ajouter des photos", note: "La première photo est celle de la boutique.", badge: "Dans la boutique" },
  flats: { one: "Mockup", none: "Pas encore de mockup : l'onglet Mockup n'apparaît pas dans la boutique.", add: "Ajouter des mockups", note: "Le design posé à plat, dans l'ordre de la boutique.", badge: null },
} as const;

/**
 * A product's photos or flat mockups (`kind`): upload (straight from the browser to R2 with a presigned URL),
 * reorder and remove. The first photo is the one the shop shows.
 */
export function PhotoManager({ productId, photos, configured, name, kind = "photos" }: { productId: string; photos: string[]; configured: boolean; name: string; kind?: keyof typeof WORDS }) {
  const w = WORDS[kind];
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setUploading(files.length);
    for (const file of Array.from(files)) {
      try {
        const signed = await presignPhoto(productId, { type: file.type, size: file.size }, kind);
        if (!signed.ok) throw new Error(signed.message);
        const put = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": signed.contentType }, body: file });
        if (!put.ok) throw new Error(`L'envoi vers le stockage a échoué (${put.status}). Vérifie la règle CORS du bucket.`);
        const added = await addPhoto(productId, signed.publicUrl, kind);
        if (!added.ok) throw new Error(added.message);
      } catch (e) {
        setError(`${file.name} : ${e instanceof Error ? e.message : "envoi impossible."}`);
      }
      setUploading((n) => n - 1);
    }
    if (input.current) input.current.value = "";
    router.refresh();
  }

  const act = (fn: () => Promise<unknown>) => startTransition(async () => (await fn(), router.refresh()));

  return (
    <div>
      {photos.length ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <AnimatePresence initial={false}>
            {photos.map((url, i) => (
              <motion.li key={url} layout initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94, transition: { duration: DUR.instant, ease: EASE.in } }} transition={SPRING.ui}>
                <div className="relative overflow-hidden rounded-[22px] bg-bg">
                  {/* eslint-disable-next-line @next/next/no-img-element -- R2's public domain is set per deployment */}
                  <img src={url} alt={`${name}, ${w.one.toLowerCase()} ${i + 1}`} className="aspect-[4/5] w-full object-cover" />
                  {i === 0 && w.badge && <span className="absolute left-3 top-3 rounded-full bg-bg/90 px-2.5 py-1 text-[12px] font-medium">{w.badge}</span>}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[14px]">
                  <div className="flex gap-3">
                    <button type="button" disabled={busy || i === 0} onClick={() => act(() => movePhoto(productId, url, -1, kind))} className="text-link hover:underline disabled:text-muted disabled:no-underline" aria-label={`${w.one} ${i + 1} : avancer`}>
                      ‹ Avant
                    </button>
                    <button type="button" disabled={busy || i === photos.length - 1} onClick={() => act(() => movePhoto(productId, url, 1, kind))} className="text-link hover:underline disabled:text-muted disabled:no-underline" aria-label={`${w.one} ${i + 1} : reculer`}>
                      Après ›
                    </button>
                  </div>
                  <button type="button" disabled={busy} onClick={() => act(() => removePhoto(productId, url, kind))} className="text-danger hover:underline" aria-label={`Retirer : ${w.one.toLowerCase()} ${i + 1}`}>
                    Retirer
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="text-muted">{w.none}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-6">
        <label className={`btn-outline cursor-pointer ${!configured || uploading ? "pointer-events-none opacity-50" : ""}`}>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={!configured || uploading > 0} onChange={(e) => upload(e.target.files)} className="sr-only" />
          {uploading ? `Envoi… (${uploading})` : w.add}
        </label>
        <span className="text-sm text-muted">JPG, PNG ou WebP, 8 Mo maximum. {w.note}</span>
      </div>
      {!configured && <p className="mt-4 text-sm text-new">Le stockage n&apos;est pas encore configuré : ajoute les variables R2_* dans .env (voir .env.example), puis relance pnpm dev.</p>}
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
