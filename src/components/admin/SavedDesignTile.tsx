"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Print3D, PrintSide } from "@/lib/products";
import { TEE_ASPECT, teePath2D } from "../story/teeOutline";
import { hasStudioContent, loadStudioImages, paint, type StudioSide } from "@/lib/studioPaint";

const ProductTee3D = dynamic(() => import("../ProductTee3D"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse rounded-[22px] bg-surface" /> });

const SIDE_LABEL: Record<PrintSide, string> = { front: "Devant", back: "Dos" };
const SIDES: PrintSide[] = ["front", "back"];
/** Print canvases for the 3D view: the studio's print area, wide enough for the 1024 px 3D texture. */
const W = 1400;
const H = Math.round(W / TEE_ASPECT);

export type AdminSavedDesign = { id: string; name: string; teeColor: string; colorName: string; updatedAt: Date; ordered: number; front: StudioSide; back: StudioSide };

const srcsOf = (d: AdminSavedDesign) => [...d.front.images, ...d.back.images].map((i) => i.src);

/** The tee seen flat, in its colour, with one side's print drawn from the saved layers. */
function Flat({ design, side }: { design: AdminSavedDesign; side: PrintSide }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let live = true;
    const draw = (images: Map<string, HTMLImageElement>) => {
      const c = ref.current;
      if (!c || !live) return;
      const ctx = c.getContext("2d")!;
      const print = Object.assign(document.createElement("canvas"), { width: c.width, height: c.height });
      paint(print.getContext("2d")!, design[side], c.width, c.height, images);
      ctx.clearRect(0, 0, c.width, c.height);
      const outline = teePath2D(c.width, c.height);
      ctx.fillStyle = design.teeColor;
      ctx.fill(outline);
      ctx.strokeStyle = "rgba(128,128,128,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke(outline);
      ctx.drawImage(print, 0, 0);
    };
    draw(new Map()); // the tee and the text right away, the images once loaded
    loadStudioImages(design[side].images.map((i) => i.src), 640).then((m) => {
      draw(m);
      document.fonts?.ready.then(() => draw(m));
    });
    return () => {
      live = false;
    };
  }, [design, side]);
  return <canvas ref={ref} width={440} height={Math.round(440 / TEE_ASPECT)} className="absolute inset-[8%] h-[84%] w-[84%] object-contain" aria-hidden />;
}

/**
 * A creation saved by a customer in the studio, on the admin's Studio page: a flat preview drawn from its
 * layers, and on click the t-shirt in real 3D (front and back), as the customer sees it in the studio.
 */
export function SavedDesignTile({ design, customer }: { design: AdminSavedDesign; customer: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const sides = useMemo(() => SIDES.filter((s) => hasStudioContent(design[s])), [design]);
  const [side, setSide] = useState<PrintSide>(sides[0] ?? "front");
  const [print, setPrint] = useState<Print3D | null>(null);
  const [failed, setFailed] = useState(false);

  // Each side's layers painted once into an image the 3D tee uses as its print (over the whole print area).
  useEffect(() => {
    if (!open || print) return;
    let live = true;
    (async () => {
      const images = await loadStudioImages(srcsOf(design), 1200);
      await document.fonts?.ready;
      const out: Print3D = {};
      for (const s of sides) {
        const c = Object.assign(document.createElement("canvas"), { width: W, height: H });
        paint(c.getContext("2d")!, design[s], W, H, images);
        const blob = await new Promise<Blob | null>((r) => {
          try {
            c.toBlob(r, "image/png");
          } catch {
            r(null);
          }
        });
        if (blob) out[s] = { url: URL.createObjectURL(blob), x: 0.5, y: 0.5, w: 1 };
      }
      if (!live) return;
      setPrint(out);
      setFailed(srcsOf(design).some((src) => !images.has(src)) || sides.some((s) => !out[s]));
    })();
    return () => {
      live = false;
    };
  }, [open, print, design, sides]);

  const show = () => {
    setOpen(true);
    dialog.current?.showModal();
  };

  return (
    <>
      <button type="button" onClick={show} className="group block w-full text-left" aria-label={`Voir « ${design.name} » en 3D`}>
        <span className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-2xl bg-sand transition-shadow group-hover:ring-2 group-hover:ring-accent">
          <Flat design={design} side={sides[0] ?? "front"} />
          <span className="absolute bottom-2 right-2 rounded-full bg-bg/85 px-2.5 py-1 text-[11px] font-medium opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">◐ 3D</span>
        </span>
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        className="m-auto w-[min(640px,calc(100vw-32px))] rounded-[28px] bg-bg p-0 text-ink backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        {open && (
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-[19px] font-semibold">{design.name}</p>
                <p className="truncate text-sm text-muted">
                  {customer} · {design.colorName} · {design.ordered ? `commandé × ${design.ordered}` : "pas encore commandé"}
                </p>
              </div>
              <button type="button" onClick={() => dialog.current?.close()} className="shrink-0 rounded-full border border-line px-3 py-1 text-sm transition-colors hover:border-accent" aria-label="Fermer">
                ×
              </button>
            </div>
            <div className="mt-4 rounded-[22px] bg-sand p-3">
              {print ? (
                <ProductTee3D color={design.teeColor} print={print} side={side} className="h-[min(60vh,440px)] w-full" />
              ) : (
                <div className="h-[min(60vh,440px)] w-full animate-pulse rounded-[18px] bg-surface" />
              )}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 px-2 pb-1 text-sm">
                <p className="text-muted">Fais glisser pour tourner le t-shirt.</p>
                {sides.length > 1 && (
                  <div className="flex gap-1.5" role="group" aria-label="Face affichée">
                    {sides.map((s) => (
                      <button key={s} type="button" onClick={() => setSide(s)} aria-pressed={side === s} className={`rounded-full border px-3 py-1 transition-colors ${side === s ? "border-ink bg-ink text-on-ink" : "border-line hover:border-accent"}`}>
                        {SIDE_LABEL[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {failed && <p className="mt-3 text-sm text-new">Une image de cette création n&apos;a pas pu être chargée.</p>}
            {!sides.length && <p className="mt-3 text-sm text-muted">Cette création est vide.</p>}
          </div>
        )}
      </dialog>
    </>
  );
}
