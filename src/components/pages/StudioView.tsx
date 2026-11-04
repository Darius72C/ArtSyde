"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { gsap } from "@/lib/gsap";
import { TEE_COLORS } from "@/lib/data";
import { cart, SIZES } from "@/lib/cart";
import { STUDIO_PRICE, formatFCFA } from "@/lib/products";
import { teeState } from "../story/teeState";
import { ColorPicker, nearest } from "../ColorPicker";
import { fadeUp, RevealLines } from "../Reveal";
import { DUR, EASE, STAGGER } from "@/lib/motion";
import { PRINT_QUALITIES, PRINT_QUALITY, PRINT_WIDTH_CM, type PrintQuality } from "@/lib/studio";
import { TEE_ASPECT, TEE_PATH_01, teePath2D } from "../story/teeOutline";

const TeeScene = dynamic(() => import("../story/TeeScene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 m-auto h-px w-24 animate-pulse bg-ink/40" aria-hidden />,
});

// Print canvases: the whole tee, front or back, sleeves included (the rectangle around the silhouette).
// The downloadable image and the print file are painted again at the chosen output quality.
const W = 1400;
const H = Math.round(W / TEE_ASPECT);
const { base: BASE_PRICE, back: BACK_PRICE } = STUDIO_PRICE;

type Img = { src: string; nw: number; nh: number; x: number; y: number; scale: number; rot: number };
type Txt = { value: string; font: "serif" | "italic" | "sans"; color: string; x: number; y: number; size: number; rot: number };
type Side = { image?: Img; text?: Txt };
type SideId = "front" | "back";
type Layer = "image" | "text";

const FONTS = { serif: "Serif", italic: "Italique", sans: "Linéaire" } as const;
const INKS = [
  { name: "Crème", hex: "#efe9df" },
  { name: "Noir", hex: "#1a1a1a" },
  { name: "Caramel", hex: "#8a6a4a" },
  { name: "Rouge", hex: "#c8102e" },
  { name: "Marine", hex: "#1f2a44" },
  { name: "Sable", hex: "#d8c7a5" },
  { name: "Olive", hex: "#6b6b47" },
  { name: "Gris", hex: "#9ea0a3" },
];

// The stage and the two tool panels rise into place one after the other (FadeUp's move, on the elements themselves).
const panelIn = (i: number) => fadeUp(0.15 + i * STAGGER.item);

// Positions are fractions of the print area; sizes are fractions of its width (× PRINT_WIDTH_CM for cm).
const DEFAULT_TEXT: Txt = { value: "Atelier", font: "italic", color: "#efe9df", x: 0.5, y: 0.39, size: 0.058, rot: 0 };
const DEFAULT_IMAGE = { x: 0.5, y: 0.58, scale: 0.24, rot: 0 };

// Print canvases live outside React (they are drawing surfaces, not state).
let shared: Record<"front" | "back", HTMLCanvasElement> | null = null;
function getCanvases() {
  if (!shared) {
    const mk = () => Object.assign(document.createElement("canvas"), { width: W, height: H });
    shared = { front: mk(), back: mk() };
  }
  return shared;
}
const noop = () => () => {};

function fontFamily(f: Txt["font"]) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(f === "sans" ? "--font-body" : "--font-display").trim();
  return v || (f === "sans" ? "sans-serif" : "serif");
}

/** Paints one side's layers on a canvas of any size (live preview, download, print file), cut to the tee. */
function paint(ctx: CanvasRenderingContext2D, d: Side, w: number, h: number, images: Map<string, HTMLImageElement>) {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.clip(teePath2D(w, h));
  if (d.image) {
    const el = images.get(d.image.src);
    if (el) {
      const iw = d.image.scale * w;
      const ih = (iw * d.image.nh) / d.image.nw;
      ctx.save();
      ctx.translate(d.image.x * w, d.image.y * h);
      ctx.rotate((d.image.rot * Math.PI) / 180);
      ctx.drawImage(el, -iw / 2, -ih / 2, iw, ih);
      ctx.restore();
    }
  }
  if (d.text?.value) {
    const t = d.text;
    ctx.save();
    ctx.translate(t.x * w, t.y * h);
    ctx.rotate((t.rot * Math.PI) / 180);
    ctx.font = `${t.font === "italic" ? "italic " : ""}${t.font === "sans" ? 500 : 400} ${t.size * w}px ${fontFamily(t.font)}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = t.color;
    t.value.split("\n").forEach((line, i, all) => ctx.fillText(line, 0, (i - (all.length - 1) / 2) * t.size * w * 1.05));
    ctx.restore();
  }
  ctx.restore();
}

const hasContent = (d: Side) => Boolean(d.image || d.text?.value);

export function StudioView() {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const canvases = mounted ? getCanvases() : null;
  const images = useRef(new Map<string, HTMLImageElement>());
  const [design, setDesign] = useState<Record<SideId, Side>>({ front: { text: DEFAULT_TEXT }, back: {} });
  const [side, setSide] = useState<SideId>("front");
  const [selected, setSelected] = useState<Layer | null>("text");
  const [tab, setTab] = useState<"couleur" | "image" | "texte">("texte");
  const [teeHex, setTeeHex] = useState<string>(TEE_COLORS[0].hex.toLowerCase());
  const [pickerKey, setPickerKey] = useState(0); // remounts the picker when the colour is set from outside
  const [tokens, setTokens] = useState(5); // mock balance — will come from the user's account
  const [size, setSize] = useState("M");
  const [qty, setQty] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [noTokens, setNoTokens] = useState(false);
  const [quality, setQuality] = useState<PrintQuality>("STANDARD");
  const [exporting, setExporting] = useState(false);
  const preview = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Object.assign(teeState, { hex: TEE_COLORS[0].hex, rotY: 0, scrollRot: 0, scale: 1, parallax: 0.25 });
    return () => void Object.assign(teeState, { parallax: 1, hex: null });
  }, []);

  // Redraw both print areas whenever the design changes.
  const draw = useCallback(() => {
    if (!canvases) return;
    (["front", "back"] as SideId[]).forEach((id) => paint(canvases[id].getContext("2d")!, design[id], W, H, images.current));
    teeState.texVersion++;
  }, [canvases, design]);

  useEffect(() => {
    draw();
    document.fonts?.ready.then(draw);
  }, [draw]);

  // Show the current side's print canvas in the preview box.
  useEffect(() => {
    const box = preview.current;
    if (!box || !canvases) return;
    box.replaceChildren(canvases[side]);
    Object.assign(canvases[side].style, { width: "100%", height: "100%", display: "block" });
  }, [canvases, side]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };
  const spend = (n: number) => {
    if (tokens < n) {
      setNoTokens(true);
      return false;
    }
    setTokens((t) => t - n);
    return true;
  };

  const update = <K extends Layer>(layer: K, patch: Partial<K extends "image" ? Img : Txt>) =>
    setDesign((d) => {
      const cur = d[side][layer];
      if (!cur) return d;
      return { ...d, [side]: { ...d[side], [layer]: { ...cur, ...patch } } };
    });

  const flip = (s: SideId) => {
    setSide(s);
    setSelected(design[s].text ? "text" : design[s].image ? "image" : null);
    gsap.to(teeState, { rotY: s === "front" ? 0 : Math.PI, duration: 1, ease: "back.out(1.4)" });
  };
  const pickColor = (hex: string) => {
    setTeeHex(hex);
    teeState.hex = hex; // the 3D scene eases towards it
  };


  const onUpload = (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return flash("Format accepté : PNG, JPG ou WEBP");
    if (file.size > 15 * 1024 * 1024) return flash("Image trop lourde (15 Mo max)");
    if (!spend(1)) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const el = new Image();
      el.onload = () => {
        images.current.set(src, el);
        setDesign((d) => ({ ...d, [side]: { ...d[side], image: { src, nw: el.naturalWidth, nh: el.naturalHeight, ...DEFAULT_IMAGE } } }));
        setSelected("image");
        flash("Image ajoutée · 1 crédit utilisé");
      };
      el.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Drag the selected layer directly on the print preview.
  const dragging = useRef(false);
  const moveTo = (e: React.PointerEvent) => {
    if (!selected || !preview.current) return;
    const r = preview.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    update(selected, { x, y });
  };

  // Drag on the 3D stage rotates the tee.
  const spin = useRef<number | null>(null);

  const cur = design[side];
  const layer = selected ? cur[selected] : undefined;
  const hasBack = Boolean(design.back.image || design.back.text?.value);
  const price = BASE_PRICE + (hasBack ? BACK_PRICE : 0);
  const dpi = cur.image ? Math.round(cur.image.nw / ((cur.image.scale * PRINT_WIDTH_CM) / 2.54)) : null;
  const q = PRINT_QUALITY[quality];
  const creditsLabel = (n: number) => `${n} crédit${n > 1 ? "s" : ""}`;
  const setInk = (color: string) =>
    setDesign((d) => ({ ...d, [side]: { ...d[side], text: { ...(d[side].text ?? { ...DEFAULT_TEXT, value: "" }), color } } }));

  // An HD / Ultra HD print file costs its credits once per design added, whatever the quantity.
  const addToCart = () => {
    if (!spend(q.credits)) return;
    const gl = stage.current?.querySelector("canvas");
    let thumb: string | undefined;
    if (gl) {
      const c = Object.assign(document.createElement("canvas"), { width: 220, height: 220 });
      const s = Math.min(gl.width, gl.height);
      c.getContext("2d")!.drawImage(gl, (gl.width - s) / 2, (gl.height - s) / 2, s, s, 0, 0, 220, 220);
      thumb = c.toDataURL("image/png");
    }
    const name = quality === "STANDARD" ? "T-shirt personnalisé" : `T-shirt personnalisé · ${q.label}`;
    cart.add({ key: `custom-${Date.now()}`, productId: null, name, price, color: teeHex, size, qty, preview: thumb, bg: "#e7e0d3", quality });
    flash(q.credits ? `Ajouté au panier · ${creditsLabel(q.credits)} utilisé${q.credits > 1 ? "s" : ""}` : "Ajouté au panier");
  };

  const exportDesign = async () => {
    const sides = (["front", "back"] as SideId[]).filter((id) => hasContent(design[id]));
    if (!sides.length) return flash("Ajoute une image ou un texte d'abord");
    if (!spend(q.credits)) return;
    setExporting(true);
    try {
      for (const id of sides) {
        const c = Object.assign(document.createElement("canvas"), { width: q.px, height: Math.round(q.px / TEE_ASPECT) });
        const ctx = c.getContext("2d");
        if (!ctx) throw new Error("canvas too large");
        paint(ctx, design[id], c.width, c.height, images.current);
        const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
        if (!blob) throw new Error("canvas too large");
        const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `artsyde-${id === "front" ? "devant" : "dos"}-${q.label.toLowerCase().replace(/\s+/g, "-")}.png` });
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
      flash(q.credits ? `Visuel ${q.label} téléchargé · ${creditsLabel(q.credits)} utilisé${q.credits > 1 ? "s" : ""}` : "Visuel téléchargé");
    } catch {
      if (q.credits) setTokens((t) => t + q.credits);
      flash(quality === "STANDARD" ? "Trop lourd pour cet appareil : essaie depuis un ordinateur" : "Trop lourd pour cet appareil : choisis une qualité plus basse");
    } finally {
      setExporting(false);
    }
  };

  const slider = (label: string, value: number, min: number, max: number, step: number, on: (v: number) => void, fmt?: (v: number) => string) => (
    <label className="block">
      <span className="flex justify-between text-[11px] tracking-[0.18em] uppercase">
        <span className="text-muted">{label}</span> <span className="tabular-nums">{fmt ? fmt(value) : value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => on(Number(e.target.value))} className="range mt-3" />
    </label>
  );

  const tabBtn = (t: "couleur" | "image" | "texte") => (
    <button
      key={t}
      role="tab"
      aria-selected={tab === t}
      onClick={() => (setTab(t), t !== "couleur" && setSelected(t === "image" ? "image" : "text"))}
      className={`relative pb-2 text-[11px] tracking-[0.2em] uppercase transition-colors ${tab === t ? "" : "text-muted hover:text-ink"}`}
    >
      {t}
      {tab === t && <motion.span layoutId="tool-line" className="absolute inset-x-0 bottom-0 h-px bg-ink" transition={{ duration: DUR.base, ease: EASE.out }} />}
    </button>
  );

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-10 md:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <RevealLines as="h1" lines={[{ text: "Studio 3D.", muted: "Crée le tien." }]} className="display text-5xl md:text-6xl" />
        <div className="flex items-center gap-6 text-sm">
          <motion.span key={tokens} initial={{ opacity: 0.3 }} animate={{ opacity: 1 }} className="tabular-nums">
            {tokens} crédit{tokens > 1 ? "s" : ""}
          </motion.span>
          <Link href="/credits" className="link-line">
            Recharger <span className="arrow">→</span>
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr] xl:grid-cols-[320px_1fr_320px]">
        {/* 3D stage */}
        <motion.section
          {...panelIn(0)}
          ref={stage}
          className="relative order-1 h-[56svh] min-h-[380px] touch-none overflow-hidden rounded-[28px] bg-surface select-none lg:order-2 lg:h-[calc(100svh-200px)]"
          onPointerDown={(e) => (spin.current = e.clientX)}
          onPointerMove={(e) => {
            if (spin.current === null) return;
            teeState.rotY += (e.clientX - spin.current) * 0.012;
            spin.current = e.clientX;
          }}
          onPointerUp={() => (spin.current = null)}
          onPointerLeave={() => (spin.current = null)}
        >
          {canvases && <TeeScene front={canvases.front} back={canvases.back} preserve />}
          <div className="absolute left-1/2 top-5 flex -translate-x-1/2 gap-6">
            {(["front", "back"] as const).map((s) => (
              <button key={s} onClick={() => flip(s)} aria-pressed={side === s} className={`relative pb-1.5 text-[11px] tracking-[0.2em] uppercase ${side === s ? "" : "text-muted"}`}>
                {s === "front" ? "Devant" : "Dos"}
                {side === s && <motion.span layoutId="side-line" className="absolute inset-x-0 bottom-0 h-px bg-ink" />}
              </button>
            ))}
          </div>
          <p className="eyebrow pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">Glisse pour tourner</p>
        </motion.section>

        {/* Tools */}
        {/* `!`: `.tile` (unlayered in globals.css) sets overflow: hidden, which beats a plain utility and cropped the panel. */}
        <motion.aside {...panelIn(1)} data-lenis-prevent className="tile order-2 p-6 lg:order-1 lg:max-h-[calc(100svh-200px)] lg:!overflow-y-auto lg:overscroll-contain">
          <div className="flex gap-6 border-b border-line" role="tablist">
            {(["couleur", "image", "texte"] as const).map(tabBtn)}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: DUR.fast, ease: EASE.out }} className="mt-8 space-y-6">
              {tab === "couleur" && (
                <>
                  <ColorPicker key={pickerKey} initial={teeHex} presets={TEE_COLORS} onChange={pickColor} />
                  {(() => {
                    const n = nearest(teeHex, TEE_COLORS);
                    const exact = n.hex.toLowerCase() === teeHex;
                    return (
                      <p className="border-t border-line pt-4 text-sm text-muted">
                        {exact ? (
                          <>
                            <span className="text-ok">●</span> {n.name}, disponible en atelier.
                          </>
                        ) : (
                          <>
                            Teinte sur mesure. Plus proche en stock : <span className="text-ink">{n.name}</span>.{" "}
                            <button onClick={() => (pickColor(n.hex.toLowerCase()), setPickerKey((k) => k + 1))} className="text-ink underline underline-offset-4">
                              Utiliser
                            </button>
                          </>
                        )}
                      </p>
                    );
                  })()}
                </>
              )}

              {tab === "image" && (
                <>
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-bg px-6 py-10 text-center transition-colors duration-300 hover:border-accent">
                    <span className="text-[17px] font-semibold text-link">{cur.image ? "Remplacer l'image" : "Importer une image"}</span>
                    <span className="text-xs text-muted">PNG, JPG ou WEBP · 1 crédit</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => (onUpload(e.target.files?.[0]), (e.target.value = ""))} />
                  </label>
                  {cur.image && dpi !== null && (
                    <p className="text-sm">
                      <span className={dpi >= 150 ? "text-ok" : "text-danger"}>●</span>{" "}
                      {dpi >= 150 ? `Qualité d'impression satisfaisante (${dpi} DPI).` : `Image un peu petite (${dpi} DPI) : réduis-la ou choisis une image plus grande.`}
                    </p>
                  )}
                </>
              )}

              {tab === "texte" && (
                <>
                  <label className="block">
                    <span className="mb-1.5 block text-[14px] text-muted">Ton texte</span>
                    <textarea
                      rows={2}
                      maxLength={40}
                      value={cur.text?.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDesign((d) => ({ ...d, [side]: { ...d[side], text: { ...(d[side].text ?? { ...DEFAULT_TEXT, value: "" }), value } } }));
                        setSelected("text");
                      }}
                      placeholder="Écris ton texte"
                      className="field resize-none"
                    />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(FONTS) as Txt["font"][]).map((f) => (
                      <button
                        key={f}
                        onClick={() => update("text", { font: f })}
                        className={`rounded-xl border py-2.5 text-[15px] transition-colors duration-300 ${cur.text?.font === f ? "border-accent font-medium shadow-[0_0_0_1px_var(--accent)]" : "border-line hover:border-muted"}`}
                        style={{ fontFamily: f === "sans" ? "var(--font-body)" : "var(--font-display)", fontStyle: f === "italic" ? "italic" : "normal" }}
                      >
                        {FONTS[f]}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-4 border-t border-line pt-6">
                    <p className="eyebrow">Couleur du texte</p>
                    <ColorPicker key={`ink-${side}-${cur.text ? "on" : "off"}`} initial={(cur.text?.color ?? DEFAULT_TEXT.color).toLowerCase()} presets={INKS} presetsLabel="Encres de l'atelier" onChange={setInk} />
                  </div>
                </>
              )}

              {tab !== "couleur" && layer && (
                <div className="space-y-6 border-t border-line pt-6">
                  <p className="eyebrow">Ajuster {selected === "image" ? "l'image" : "le texte"}</p>
                  {selected === "image" && cur.image && slider("Largeur", cur.image.scale, 0.05, 1, 0.005, (v) => update("image", { scale: v }), (v) => `${Math.round(v * PRINT_WIDTH_CM)} cm`)}
                  {selected === "text" && cur.text && slider("Taille", cur.text.size, 0.015, 0.15, 0.001, (v) => update("text", { size: v }), (v) => `${(v * PRINT_WIDTH_CM).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} cm`)}
                  {slider("Horizontal", layer.x, 0, 1, 0.01, (v) => update(selected!, { x: v }), (v) => `${Math.round(v * 100)} %`)}
                  {slider("Vertical", layer.y, 0, 1, 0.01, (v) => update(selected!, { y: v }), (v) => `${Math.round(v * 100)} %`)}
                  {slider("Rotation", layer.rot, -180, 180, 1, (v) => update(selected!, { rot: v }), (v) => `${v}°`)}
                  <div className="flex gap-6 pt-2">
                    <button onClick={() => update(selected!, { x: 0.5 })} className="link-line">Centrer</button>
                    <button
                      onClick={() => {
                        setDesign((d) => ({ ...d, [side]: { ...d[side], [selected!]: undefined } }));
                        setSelected(null);
                      }}
                      className="link-line text-danger"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.aside>

        {/* Print preview + order */}
        <motion.aside {...panelIn(2)} data-lenis-prevent className="tile order-3 space-y-8 p-6 lg:col-span-2 xl:col-span-1 xl:max-h-[calc(100svh-200px)] xl:!overflow-y-auto xl:overscroll-contain">
          <div>
            <p className="eyebrow">Zone d&apos;impression · {side === "front" ? "devant" : "dos"}</p>
            <p className="mt-1 text-xs text-muted">Tout le {side === "front" ? "devant" : "dos"}, manches comprises. Glisse pour placer.</p>
            <div
              className="relative mx-auto mt-4 w-full max-w-[360px] cursor-move touch-none"
              style={{ aspectRatio: `${W} / ${H}` }}
              onPointerDown={(e) => {
                dragging.current = true;
                e.currentTarget.setPointerCapture?.(e.pointerId);
                moveTo(e);
              }}
              onPointerMove={(e) => dragging.current && moveTo(e)}
              onPointerUp={() => (dragging.current = false)}
            >
              <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
                <defs>
                  <clipPath id="print-area" clipPathUnits="objectBoundingBox">
                    <path d={TEE_PATH_01} />
                  </clipPath>
                </defs>
                <path d={TEE_PATH_01} fill={teeHex} />
              </svg>
              <div ref={preview} className="absolute inset-0" style={{ clipPath: "url(#print-area)" }} />
              <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full text-muted" aria-hidden>
                <path d={TEE_PATH_01} fill="none" stroke="currentColor" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
          </div>

          <div className="border-t border-line pt-8">
            <p className="eyebrow">Qualité de sortie</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {PRINT_QUALITIES.map((k) => (
                <button key={k} onClick={() => setQuality(k)} aria-pressed={quality === k} className={`rounded-xl border px-2 py-2.5 text-sm transition-colors duration-300 ${quality === k ? "border-accent font-medium shadow-[0_0_0_1px_var(--accent)]" : "border-line hover:border-muted"}`}>
                  {PRINT_QUALITY[k].label}
                  <span className="block text-[11px] font-normal text-muted">{PRINT_QUALITY[k].credits ? creditsLabel(PRINT_QUALITY[k].credits) : "Gratuit"}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              {q.dpi} DPI sur tout le t-shirt ({q.px.toLocaleString("fr-FR")} px de large). C&apos;est aussi la qualité du fichier d&apos;impression envoyé avec ta commande{q.credits ? ` : ${creditsLabel(q.credits)} à l'ajout au panier` : ""}.
            </p>
            <button onClick={exportDesign} disabled={exporting} className="btn-outline mt-4 w-full">
              {exporting ? <span className="h-4 w-4 animate-spin rounded-full border border-accent border-t-transparent" aria-label="Export en cours" /> : `Télécharger le visuel${q.credits ? ` · ${creditsLabel(q.credits)}` : ""}`}
            </button>
          </div>

          <div className="border-t border-line pt-8">
            <p className="eyebrow">Taille</p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {SIZES.map((s) => (
                <button key={s} onClick={() => setSize(s)} aria-pressed={size === s} className={`rounded-xl border py-2.5 text-sm transition-colors duration-300 ${size === s ? "border-accent font-medium shadow-[0_0_0_1px_var(--accent)]" : "border-line hover:border-muted"}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center rounded-full border border-line">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-10 w-10 text-lg font-extralight" aria-label="Moins">−</button>
                <span className="w-8 text-center text-sm tabular-nums">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(20, q + 1))} className="h-10 w-10 text-lg font-extralight" aria-label="Plus">+</button>
              </div>
              <motion.p key={price * qty} initial={{ opacity: 0.3 }} animate={{ opacity: 1 }} className="text-[24px] font-semibold tabular-nums">
                {formatFCFA(price * qty)}
              </motion.p>
            </div>
            <p className="mt-2 text-right text-xs text-muted">{hasBack ? `Devant et dos (+${formatFCFA(BACK_PRICE)})` : "Impression devant"}</p>
            <button onClick={addToCart} className="btn mt-6 w-full">Ajouter au panier{q.credits ? ` · ${creditsLabel(q.credits)}` : ""}</button>
            <button onClick={() => spend(1) && flash("Design sauvegardé · 1 crédit utilisé")} className="btn-outline mt-3 w-full">
              Sauvegarder · 1 crédit
            </button>
          </div>
        </motion.aside>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
            className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-6 bg-ink px-6 py-4 text-sm text-on-ink"
          >
            {toast}
            {toast.includes("panier") && (
              <Link href="/panier" className="text-[11px] tracking-[0.2em] uppercase underline underline-offset-4">
                Voir
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {noTokens && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] grid place-items-center bg-ink/50 p-5 backdrop-blur-sm" onClick={() => setNoTokens(false)}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: DUR.base, ease: EASE.out }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-[28px] bg-bg p-10 text-center"
              role="dialog"
              aria-modal
            >
              <p className="eyebrow">Crédits épuisés</p>
              <h2 className="display mt-2 text-4xl">Recharge pour continuer.</h2>
              <p className="mt-4 text-sm text-muted">Les crédits servent à importer une image, sauvegarder un design, télécharger ou commander en HD.</p>
              <div className="mt-8 flex flex-col items-center gap-4">
                <Link href="/credits" className="btn">Recharger</Link>
                <button onClick={() => setNoTokens(false)} className="link-line">Plus tard</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
