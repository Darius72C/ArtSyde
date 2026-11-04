"use client";

import { useEffect, useRef, useState } from "react";
import { PHOTO_MAP, type DesignPlacement, type DesignSide } from "./design";

/*
 * Aperçu photo-réaliste à partir des photos Printful du t-shirt blanc.
 *
 * Les fichiers /tshirt-photo/{front,back}-shading.webp sont des cartes
 * d'ombrage tirées de ces photos : blanc sur le tissu plat, plus sombre dans
 * les plis, avec la transparence autour du t-shirt. Pour colorer le t-shirt,
 * on multiplie la couleur choisie par cette carte : les plis restent visibles.
 * Le design du client est multiplié de la même façon, pour épouser le tissu.
 */

const SIZE = 1200;
const SHADING_URL: Record<DesignSide, string> = {
  front: "/tshirt-photo/front-shading.webp",
  back: "/tshirt-photo/back-shading.webp",
};

export type PhotoDesign = { id: string; url: string; placement: DesignPlacement };

type PhotoPreviewProps = {
  color: string;
  side: DesignSide;
  onSideChange: (side: DesignSide) => void;
  designs?: PhotoDesign[];
  className?: string;
};

// ---------- Chargement des images (avec cache) ----------

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(url: string) {
  let p = imageCache.get(url);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => {
        imageCache.delete(url);
        reject(new Error(`Image introuvable : ${url}`));
      };
      img.src = url;
    });
    imageCache.set(url, p);
  }
  return p;
}

type SideAssets = { shading: HTMLImageElement; highlights: HTMLCanvasElement };
const assetCache = new Map<DesignSide, Promise<SideAssets>>();

/** Reflets : les zones claires de la carte d'ombrage, pour garder du relief sur les couleurs foncées. */
function buildHighlights(shading: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(shading, 0, 0, SIZE, SIZE);
  const data = ctx.getImageData(0, 0, SIZE, SIZE);
  const px = data.data;
  const MIN = 0.77; // ombre la plus marquée de la carte (1er centile mesuré)
  for (let i = 0; i < px.length; i += 4) {
    const s = px[i]! / 255;
    const h = Math.max(0, Math.min(1, (s - MIN) / (1 - MIN)));
    const v = Math.round(h * h * 255);
    px[i] = v;
    px[i + 1] = v;
    px[i + 2] = v;
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

function loadSide(side: DesignSide) {
  let p = assetCache.get(side);
  if (!p) {
    p = loadImage(SHADING_URL[side]).then((shading) => ({
      shading,
      highlights: buildHighlights(shading),
    }));
    p.catch(() => assetCache.delete(side));
    assetCache.set(side, p);
  }
  return p;
}

// ---------- Dessin ----------

function luminance(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

/** Dessine une image de design à sa place (centre, taille, rotation). */
function drawPlaced(ctx: CanvasRenderingContext2D, img: HTMLImageElement, p: DesignPlacement) {
  const w = p.width * PHOTO_MAP.unitX * SIZE;
  const h = w * (img.naturalHeight / img.naturalWidth);
  const cx = (PHOTO_MAP.centerX + p.x * PHOTO_MAP.unitX) * SIZE;
  const cy = (PHOTO_MAP.hemY - p.y * PHOTO_MAP.unitY) * SIZE;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((p.rotation * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function render(
  ctx: CanvasRenderingContext2D,
  layer: CanvasRenderingContext2D,
  assets: SideAssets,
  color: string,
  designs: { img: HTMLImageElement; placement: DesignPlacement }[],
) {
  const { shading, highlights } = assets;
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, SIZE, SIZE);

  // 1. T-shirt coloré : couleur × ombrage, puis découpe à la forme du t-shirt.
  ctx.drawImage(shading, 0, 0, SIZE, SIZE);
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(shading, 0, 0, SIZE, SIZE);

  // 2. Reflets, d'autant plus forts que la couleur est foncée.
  const dark = 1 - luminance(color);
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.22 * dark * dark;
  ctx.drawImage(highlights, 0, 0);
  ctx.globalAlpha = 1;

  // 3. Designs, du calque le plus bas au plus haut, avec les plis du tissu.
  for (const d of designs) {
    layer.globalCompositeOperation = "source-over";
    layer.clearRect(0, 0, SIZE, SIZE);
    drawPlaced(layer, d.img, d.placement);
    layer.globalCompositeOperation = "multiply";
    layer.drawImage(shading, 0, 0, SIZE, SIZE);
    layer.globalCompositeOperation = "destination-in";
    drawPlaced(layer, d.img, d.placement);

    ctx.globalCompositeOperation = "source-atop"; // reste à l'intérieur du t-shirt
    ctx.drawImage(layer.canvas, 0, 0);
  }
  ctx.globalCompositeOperation = "source-over";
}

// ---------- Composant ----------

const SIDES: { id: DesignSide; label: string }[] = [
  { id: "front", label: "Devant" },
  { id: "back", label: "Dos" },
];

/** Aperçu photo du t-shirt : couleur et designs appliqués sur une vraie photo, devant ou dos. */
export function PhotoPreview({ color, side, onSideChange, designs = [], className }: PhotoPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const visible = designs.filter((d) => d.placement.side === side);
  // Clé stable : on ne redessine que si quelque chose a vraiment changé.
  const key = JSON.stringify([color, side, visible.map((d) => [d.url, d.placement])]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (!layerRef.current) {
      layerRef.current = document.createElement("canvas");
      layerRef.current.width = SIZE;
      layerRef.current.height = SIZE;
    }
    const layer = layerRef.current.getContext("2d")!;
    let cancelled = false;

    Promise.all([loadSide(side), Promise.all(visible.map((d) => loadImage(d.url)))])
      .then(([assets, imgs]) => {
        if (cancelled) return;
        render(
          ctx,
          layer,
          assets,
          color,
          imgs.map((img, i) => ({ img, placement: visible[i]!.placement })),
        );
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` résume color, side et designs
  }, [key]);

  return (
    <div className={`relative flex items-center justify-center ${className ?? ""}`}>
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        role="img"
        aria-label={`Aperçu du t-shirt, ${side === "front" ? "devant" : "dos"}`}
        className="h-full max-h-full w-auto max-w-full object-contain"
        style={{ aspectRatio: "1 / 1" }}
      />

      {status === "loading" && (
        <span className="absolute text-sm text-ghost-white/60">Chargement…</span>
      )}
      {status === "error" && (
        <span className="absolute text-sm text-red-400">L&apos;aperçu n&apos;a pas pu être chargé.</span>
      )}

      <div
        role="radiogroup"
        aria-label="Face du t-shirt"
        className="absolute bottom-3 left-1/2 flex -translate-x-1/2 rounded-md border border-ash-gray bg-curse-black/80 p-1 backdrop-blur"
      >
        {SIDES.map((s) => {
          const active = s.id === side;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSideChange(s.id)}
              className={`rounded px-3 py-1 text-sm transition ${
                active ? "bg-curse-violet text-ghost-white" : "text-ghost-white/70 hover:text-ghost-white"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
