"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { Print3D, PrintSide } from "@/lib/products";

const ProductTee3D = dynamic(() => import("../ProductTee3D"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse rounded-[22px] bg-surface" /> });

const SIDE_LABEL: Record<PrintSide, string> = { front: "Devant", back: "Dos" };

/**
 * A studio piece in real 3D on the admin's order page: the t-shirt in its colour with the customer's
 * print files. The studio draws each file over the whole print area (same proportions and outline as
 * the 3D tee), so each one is placed centred at full width. Drag to turn it; opened on demand.
 */
export function StudioTee3D({ color, files }: { color: string; files: { side: PrintSide; url: string }[] }) {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<PrintSide>(files[0]?.side ?? "front");
  if (!files.length) return null;
  const print: Print3D = Object.fromEntries(files.map((f) => [f.side, { url: f.url, x: 0.5, y: 0.5, w: 1 }]));

  return (
    <div className="mt-3">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-1.5 text-sm text-link transition-colors hover:border-accent">
        <span aria-hidden>{open ? "×" : "◐"}</span> {open ? "Fermer la vue 3D" : "Voir en 3D"}
      </button>
      {open && (
        <div className="mt-3 rounded-[22px] bg-sand p-3">
          <ProductTee3D color={color} print={print} side={side} className="h-80 w-full" />
          <div className="mt-2 flex items-center justify-between gap-3 px-2 pb-1 text-sm">
            <p className="text-muted">Fais glisser pour tourner le t-shirt.</p>
            {files.length > 1 && (
              <div className="flex gap-1.5" role="group" aria-label="Face affichée">
                {files.map((f) => (
                  <button key={f.side} type="button" onClick={() => setSide(f.side)} aria-pressed={side === f.side} className={`rounded-full border px-3 py-1 transition-colors ${side === f.side ? "border-ink bg-ink text-on-ink" : "border-line hover:border-accent"}`}>
                    {SIDE_LABEL[f.side]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
