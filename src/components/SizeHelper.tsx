"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adviseSize, type Build } from "@/lib/sizing";

const KEY = "artsyde:taille"; // the visitor's answers, kept on this device only

/** « Quelle taille pour moi ? » : height and weight give a size among the product's, applied in one tap. */
export function SizeHelper({ sizes, onPick, current }: { sizes: string[]; onPick: (size: string) => void; current: string }) {
  const [open, setOpen] = useState(false);
  const [build, setBuild] = useState<Build>("homme");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  // On opening: the answers given before on this device, if any.
  const openHelper = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null") as { build: Build; height: string; weight: string } | null;
      if (saved) {
        setBuild(saved.build);
        setHeight(saved.height);
        setWeight(saved.weight);
      }
    } catch {
      // storage unavailable (private window): start empty
    }
    setOpen(true);
  };
  const h = Number(height), w = Number(weight);
  const valid = h >= 130 && h <= 220 && w >= 35 && w <= 180;
  const advice = valid ? adviseSize(build, h, w, sizes) : null;
  useEffect(() => {
    if (!valid) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ build, height, weight }));
    } catch {
      // not kept: fine
    }
  }, [valid, build, height, weight]);

  if (!open)
    return (
      <button type="button" onClick={openHelper} className="mt-3 text-sm text-muted underline underline-offset-4 hover:text-ink">
        Quelle taille pour moi ?
      </button>
    );

  const field = "w-full rounded-xl border border-line bg-bg px-3 py-2 text-[15px] tabular-nums outline-none focus:border-accent";
  return (
    <div className="mt-3 rounded-2xl border border-line p-4 text-sm">
      <div className="flex items-center justify-between">
        <p className="font-medium">Quelle taille pour moi ?</p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="text-muted hover:text-ink">✕</button>
      </div>
      <div className="mt-3 flex gap-1 rounded-full bg-surface p-0.5 text-[13px]" role="group" aria-label="Morphologie">
        {(["homme", "femme"] as const).map((b) => (
          <button key={b} type="button" onClick={() => setBuild(b)} aria-pressed={build === b} className={`flex-1 rounded-full px-3 py-1 ${build === b ? "bg-ink text-on-ink" : "text-muted"}`}>
            {b === "homme" ? "Homme" : "Femme"}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label>
          <span className="text-muted">Taille (cm)</span>
          <input inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="175" className={field} />
        </label>
        <label>
          <span className="text-muted">Poids (kg)</span>
          <input inputMode="numeric" value={weight} onChange={(e) => setWeight(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="70" className={field} />
        </label>
      </div>
      <div aria-live="polite">
        {advice && (
          <div className="mt-4">
            <p>
              On te conseille le <b>{advice.size}</b>
              {advice.exact ? "" : " (la plus proche disponible)"}. Le t-shirt est coupé oversize : il tombe déjà large.
              {advice.larger && <> Pour un effet encore plus ample, prends le {advice.larger}.</>}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => onPick(advice.size)} disabled={current === advice.size} className="btn !px-4 !py-2 text-sm disabled:opacity-60">
                {current === advice.size ? `${advice.size} choisi ✓` : `Choisir le ${advice.size}`}
              </button>
              {advice.larger && (
                <button type="button" onClick={() => onPick(advice.larger!)} disabled={current === advice.larger} className="btn-outline !px-4 !py-2 text-sm disabled:opacity-60">
                  {current === advice.larger ? `${advice.larger} choisi ✓` : `Plus ample : ${advice.larger}`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-muted">
        Conseil indicatif. Toutes les mesures : <Link href="/guide-des-tailles" className="underline underline-offset-4">guide des tailles</Link>.
      </p>
    </div>
  );
}
