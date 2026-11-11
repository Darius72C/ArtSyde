"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { DUR, EASE, SPRING } from "@/lib/motion";
import { DEFAULT_PLACEMENT, PRINT_SIDES, type Print3D, type PrintSide } from "@/lib/products";
import { colorLabel } from "@/lib/admin/labels";
import { presignPhoto, savePrint3d } from "@/server/admin/products";
import { shrinkPrint } from "@/lib/printImages";

const ProductTee3D = dynamic(() => import("../ProductTee3D"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse rounded-[22px] bg-surface" /> });

const SIDE_LABEL: Record<PrintSide, string> = { front: "Devant", back: "Dos" };
const pct = (v: number) => `${Math.round(v * 100)} %`;

/**
 * The "3D" tab of a product: the image printed on the front and on the back of the 3D t-shirt,
 * placed and sized here. The shop's 3D view shows exactly this, in the colour the customer picks.
 */
export function Print3DEditor({ productId, initial, colors, configured }: { productId: string; initial: Print3D; colors: string[]; configured: boolean }) {
  const router = useRouter();
  const [print, setPrint] = useState<Print3D>(initial);
  const [side, setSide] = useState<PrintSide>("front");
  const [color, setColor] = useState(colors[0] ?? "#F4F2EC");
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSaving] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const current = print[side];

  const change = (next: Print3D) => {
    setPrint(next);
    setDirty(true);
    setStatus(null);
  };
  const place = (key: "x" | "y" | "w", v: number) => current && change({ ...print, [side]: { ...current, [key]: v } });

  async function upload(picked: File | undefined) {
    if (!picked) return;
    setUploading(true);
    setStatus(null);
    const file = await shrinkPrint(picked);
    try {
      const signed = await presignPhoto(productId, { type: file.type, size: file.size }, "print");
      if (!signed.ok) throw new Error(signed.message);
      const put = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": signed.contentType }, body: file });
      if (!put.ok) throw new Error(`L'envoi vers le stockage a échoué (${put.status}). Vérifie la règle CORS du bucket.`);
      change({ ...print, [side]: { url: signed.publicUrl, ...(current ? { x: current.x, y: current.y, w: current.w } : DEFAULT_PLACEMENT[side]) } });
    } catch (e) {
      setStatus({ ok: false, text: `${file.name} : ${e instanceof Error ? e.message : "envoi impossible."}` });
    }
    setUploading(false);
    if (input.current) input.current.value = "";
  }

  const save = () =>
    startSaving(async () => {
      const r = await savePrint3d(productId, print).catch(() => null);
      if (!r) return setStatus({ ok: false, text: "Connexion perdue. Vérifie ton réseau et réessaie." });
      if (!r.ok) return setStatus({ ok: false, text: r.message });
      setDirty(false);
      setStatus({ ok: true, text: "Enregistré. La boutique est à jour." });
      router.refresh();
    });

  const slider = (label: string, key: "x" | "y" | "w", min: number, max: number) => (
    <label className="block">
      <span className="mb-1.5 flex justify-between text-[14px]">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums">{pct(current![key])}</span>
      </span>
      <input type="range" min={min} max={max} step={0.01} value={current![key]} onChange={(e) => place(key, Number(e.target.value))} className="range" />
    </label>
  );

  return (
    <div className="space-y-8">
      <LayoutGroup id="print-side">
        <div className="flex w-fit rounded-full bg-surface p-1" role="tablist" aria-label="Face du t-shirt">
          {PRINT_SIDES.map((s) => (
            <button key={s} type="button" role="tab" aria-selected={side === s} aria-controls="print-3d-view" onClick={() => setSide(s)} className="relative rounded-full px-4 py-1.5 text-[14px]">
              {side === s && <motion.span layoutId="seg" className="absolute inset-0 rounded-full bg-bg shadow-[0_1px_4px_rgba(0,0,0,0.12)]" transition={SPRING.snappy} />}
              <span className={`relative whitespace-nowrap ${side === s ? "font-medium" : "text-muted"}`}>
                {SIDE_LABEL[s]}
                {print[s] && (
                  <>
                    <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-ok align-middle" aria-hidden />
                    <span className="sr-only"> (imprimé)</span>
                  </>
                )}
              </span>
            </button>
          ))}
        </div>
      </LayoutGroup>

      <div id="print-3d-view" role="tabpanel" aria-label={`T-shirt 3D, ${SIDE_LABEL[side].toLowerCase()}`} className="aspect-square overflow-hidden rounded-[22px] bg-bg">
        <ProductTee3D color={color} print={print} side={side} className="h-full w-full" />
      </div>

      {colors.length > 0 && (
        <div>
          <p className="mb-3 text-[14px] text-muted">Aperçu : {colorLabel(color)}</p>
          <div className="flex flex-wrap gap-3">
            {colors.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Aperçu : ${colorLabel(c)}`} aria-pressed={c === color} className={`h-7 w-7 rounded-full ring-1 ring-offset-2 ring-offset-surface transition duration-300 hover:scale-110 active:scale-90 ${c === color ? "scale-110 ring-ink" : "ring-ink/25 hover:ring-muted"}`} style={{ background: c }} />
            ))}
          </div>
        </div>
      )}

      {current ? (
        <div className="grid gap-6 sm:grid-cols-3">
          {slider("Taille", "w", 0.08, 0.9)}
          {slider("Hauteur", "y", 0.12, 0.9)}
          {slider("Gauche — droite", "x", 0.15, 0.85)}
        </div>
      ) : (
        <p className="text-muted">Pas d&apos;image au {SIDE_LABEL[side].toLowerCase()} : ce côté reste uni.</p>
      )}

      <div className="flex flex-wrap items-center gap-6">
        <label className={`btn-outline cursor-pointer ${!configured || uploading ? "pointer-events-none opacity-50" : ""}`}>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" disabled={!configured || uploading} onChange={(e) => upload(e.target.files?.[0])} className="sr-only" />
          {uploading ? "Envoi…" : current ? "Remplacer l'image" : `Ajouter une image au ${SIDE_LABEL[side].toLowerCase()}`}
        </label>
        {current && (
          <button type="button" onClick={() => change({ ...print, [side]: undefined })} className="text-[14px] text-danger hover:underline">
            Retirer l&apos;image
          </button>
        )}
        <span className="text-sm text-muted">PNG transparent conseillé, 20 Mo maximum.</span>
      </div>
      {!configured && <p className="text-sm text-new">Le stockage n&apos;est pas encore configuré : ajoute les variables R2_* dans .env (voir .env.example), puis relance pnpm dev.</p>}

      <div className="flex flex-wrap items-center gap-6 border-t border-line pt-8">
        <button type="button" onClick={save} disabled={saving || !dirty} className="btn">
          {saving ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Enregistrement" /> : "Enregistrer"}
        </button>
        <AnimatePresence mode="wait">
          {(status || dirty) && (
            <motion.p
              key={status?.text ?? "dirty"}
              role={status && !status.ok ? "alert" : "status"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DUR.fast, ease: EASE.out }}
              className={`text-sm ${status ? (status.ok ? "text-ok" : "text-danger") : "text-muted"}`}
            >
              {status?.text ?? "Modifications non enregistrées."}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
