"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { gsap } from "@/lib/gsap";
import { TEE_COLORS } from "@/lib/data";
import { cart, SIZES } from "@/lib/cart";
import { available, type StockMap } from "@/lib/stock";
import { getMyCredits, refundSpend, spendCredits, type MyCredits } from "@/server/my-credits";
import { presignDesignFile } from "@/server/design-upload";
import { reportClientError } from "@/server/client-log";
import { getMyDesign, presignMyDesignImage, saveMyDesign } from "@/server/my-designs";
import { STUDIO_PRICE, formatFCFA } from "@/lib/products";
import { teeState } from "../story/teeState";
import { ColorPicker } from "../ColorPicker";
import { fadeUp, RevealLines } from "../Reveal";
import { DUR, EASE, STAGGER } from "@/lib/motion";
import { DESIGN_SAVE_CREDITS, FREE_DESIGNS, PRINT_QUALITIES, PRINT_QUALITY, PRINT_WIDTH_CM, STANDARD_PREVIEW_PX, downloadWidth, type PrintQuality } from "@/lib/studio";
import { TEE_ASPECT, TEE_PATH_01, teePath2D } from "../story/teeOutline";
import { teeSnapshot } from "../story/snapshot";
import { zipFiles } from "@/lib/zip";
import { embedTrace, protectImage, stampWatermark } from "@/lib/watermark";

// "Porté": the design in progress on a shop mannequin, loaded only when chosen.
const loadWorn = () => import("../MannequinTryOn");
const preloadWorn = () => void loadWorn().then((m) => m.preloadMannequin());
const MannequinTryOn = dynamic(loadWorn, { ssr: false, loading: () => <div className="absolute inset-0 m-auto h-px w-24 animate-pulse bg-ink/40" aria-hidden /> });
const TeeScene = dynamic(() => import("../story/TeeScene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 m-auto h-px w-24 animate-pulse bg-ink/40" aria-hidden />,
});

// Print canvases: the whole tee, front or back, sleeves included (the rectangle around the silhouette).
// The downloadable image and the print file are painted again at the chosen output quality.
const W = 1400;
const H = Math.round(W / TEE_ASPECT);
const { base: BASE_PRICE, back: BACK_PRICE } = STUDIO_PRICE;

type Img = { id: string; src: string; nw: number; nh: number; x: number; y: number; scale: number; rot: number };
type Txt = { value: string; font: "serif" | "italic" | "sans"; color: string; x: number; y: number; size: number; rot: number };
type Side = { images: Img[]; text?: Txt }; // images in stacking order: the last one is on top
type SideId = "front" | "back";
/** The selected layer: "text", or an image's id. */
type Layer = string;

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
const DEFAULT_TEXT: Txt = { value: "Atelier", font: "italic", color: "#efe9df", x: 0.5, y: 0.27, size: 0.085, rot: 0 };
const DEFAULT_IMAGE = { x: 0.5, y: 0.4, scale: 0.34, rot: 0 };
const MAX_IMAGES = 8; // per side
/** How long "Annuler" stays offered after images are added (the server allows a little more). */
const UNDO_SECONDS = 15;

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

/*
 * Capture deterrents. A web page cannot stop the system's screenshots or screen recording, so the
 * previews are made less worth capturing: a watermark over them (never in the files downloaded with
 * credits, which come from the print canvases and the 3D renderer), and a veil while the page is
 * not in front or a screenshot shortcut is pressed.
 */
const WATERMARK = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="140"><text x="110" y="76" text-anchor="middle" transform="rotate(-24 110 70)" font-family="sans-serif" font-size="15" font-weight="600" letter-spacing="2" fill="rgb(128,128,128)" fill-opacity="0.38">ARTSYDE · APERÇU</text></svg>',
)}")`;

function Watermark() {
  return <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: WATERMARK, backgroundSize: "220px 140px" }} aria-hidden />;
}

function Veil({ on, compact = false }: { on: boolean; compact?: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 grid place-items-center bg-surface/70 backdrop-blur-2xl transition-opacity duration-300 ${on ? "opacity-100" : "opacity-0"}`}
      aria-hidden
    >
      {!compact && <p className="eyebrow px-6 text-center">Aperçu masqué · reviens sur la page pour continuer</p>}
    </div>
  );
}

/** True while the page is hidden or not focused, and for a moment after a screenshot shortcut. */
function useCaptureVeil() {
  const [veiled, setVeiled] = useState(false);
  useEffect(() => {
    let timer: number | undefined;
    const show = () => setVeiled(true);
    const settle = () => setVeiled(document.hidden || !document.hasFocus());
    const shortcut = (e: KeyboardEvent) => {
      const mac = e.metaKey && e.shiftKey && ["3", "4", "5", "6"].includes(e.key);
      const win = e.key === "PrintScreen" || ((e.metaKey || e.key === "Meta") && e.shiftKey && e.key.toLowerCase() === "s");
      if (!mac && !win) return;
      show();
      navigator.clipboard?.writeText("").catch(() => {}); // Windows: Print Screen copies the screen; replace it when allowed
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, 1500);
    };
    window.addEventListener("blur", show);
    window.addEventListener("focus", settle);
    document.addEventListener("visibilitychange", settle);
    window.addEventListener("keydown", shortcut);
    window.addEventListener("keyup", shortcut); // Print Screen only fires on key up on Windows
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("blur", show);
      window.removeEventListener("focus", settle);
      document.removeEventListener("visibilitychange", settle);
      window.removeEventListener("keydown", shortcut);
      window.removeEventListener("keyup", shortcut);
    };
  }, []);
  return veiled;
}

function fontFamily(f: Txt["font"]) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(f === "sans" ? "--font-body" : "--font-display").trim();
  return v || (f === "sans" ? "sans-serif" : "serif");
}

/** Paints one side's layers on a canvas of any size (live preview, download, print file), cut to the tee. */
function paint(ctx: CanvasRenderingContext2D, d: Side, w: number, h: number, images: Map<string, HTMLImageElement>) {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.clip(teePath2D(w, h));
  for (const img of d.images) {
    const el = images.get(img.src);
    if (!el) continue;
    const iw = img.scale * w;
    const ih = (iw * img.nh) / img.nw;
    ctx.save();
    ctx.translate(img.x * w, img.y * h);
    ctx.rotate((img.rot * Math.PI) / 180);
    ctx.drawImage(el, -iw / 2, -ih / 2, iw, ih);
    ctx.restore();
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

/** Side length, in cm on the tee, of the square the quality comparison zooms into. */
const COMPARE_CM = 1.5;
const cmLabel = `${COMPARE_CM.toLocaleString("fr-FR")} cm`;

/**
 * The same 1.5 cm square of the design, painted at each output quality and enlarged to the same size
 * without smoothing: more dots means a sharper print. Centred on the selected layer.
 */
function QualityCompare({ side, center, images, current, onPick }: { side: Side; center: { x: number; y: number }; images: React.RefObject<Map<string, HTMLImageElement>>; current: PrintQuality; onPick: (q: PrintQuality) => void }) {
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);
  useEffect(() => {
    PRINT_QUALITIES.forEach((k, i) => {
      const out = refs.current[i];
      if (!out) return;
      const w = PRINT_QUALITY[k].px;
      const h = Math.round(w / TEE_ASPECT);
      const crop = Math.round((w * COMPARE_CM) / PRINT_WIDTH_CM);
      const tile = Object.assign(document.createElement("canvas"), { width: crop, height: crop });
      const t = tile.getContext("2d")!;
      t.translate(crop / 2 - center.x * w, crop / 2 - center.y * h);
      paint(t, side, w, h, images.current);
      const o = out.getContext("2d")!;
      o.clearRect(0, 0, out.width, out.height);
      o.imageSmoothingEnabled = false;
      o.drawImage(tile, 0, 0, out.width, out.height);
    });
  }, [side, center.x, center.y, images]);

  return (
    <div className="mt-4 rounded-2xl border border-line p-4">
      <div className="grid grid-cols-3 gap-2">
        {PRINT_QUALITIES.map((k, i) => {
          const q = PRINT_QUALITY[k];
          return (
            <button key={k} type="button" onClick={() => onPick(k)} aria-pressed={current === k} className="text-left">
              <canvas
                ref={(el) => void (refs.current[i] = el)}
                width={240}
                height={240}
                className={`aspect-square w-full rounded-xl border bg-surface [image-rendering:pixelated] ${current === k ? "border-accent shadow-[0_0_0_1px_var(--accent)]" : "border-line"}`}
                aria-label={`Aperçu en ${q.label}`}
              />
              <span className="mt-2 block text-sm font-medium">{q.label}</span>
              <span className="block text-[11px] text-muted">{q.dpi} DPI · {Math.round((q.dpi / 2.54) * COMPARE_CM)} points pour {cmLabel}</span>
            </button>
          );
        })}
      </div>
      <dl className="mt-4 space-y-1.5 text-xs">
        {PRINT_QUALITIES.map((k) => {
          const q = PRINT_QUALITY[k];
          return (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-muted">{q.label}</dt>
              <dd className="text-right tabular-nums">
                {k === "STANDARD" ? `aperçu ${STANDARD_PREVIEW_PX.toLocaleString("fr-FR")} px, filigrane` : `${q.px.toLocaleString("fr-FR")} × ${Math.round(q.px / TEE_ASPECT).toLocaleString("fr-FR")} px · vue 3D ${q.view.toLocaleString("fr-FR")} px`}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-3 text-xs text-muted">Un carré de {cmLabel} de ton design, agrandi. Une image importée trop petite reste floue, quelle que soit la qualité.</p>
    </div>
  );
}

const hasContent = (d: Side) => Boolean(d.images.length || d.text?.value);

// Unique tags, outside the component (only ever called from event handlers).
const cartKey = () => `custom-${Date.now()}`;
const exportTrace = (quality: PrintQuality) => `${new Date().toISOString().slice(0, 10)}|${quality.toLowerCase()}|${Math.random().toString(36).slice(2, 8)}`;

/** The topmost layer under a point of the print area (fractions of its width and height), or null. */
function layerAt(d: Side, px: number, py: number, w: number, h: number): Layer | null {
  const inside = (cx: number, cy: number, bw: number, bh: number, rot: number) => {
    const a = (-rot * Math.PI) / 180;
    const dx = (px - cx) * w;
    const dy = (py - cy) * h;
    const x = dx * Math.cos(a) - dy * Math.sin(a);
    const y = dx * Math.sin(a) + dy * Math.cos(a);
    return Math.abs(x) <= bw / 2 && Math.abs(y) <= bh / 2;
  };
  const t = d.text;
  if (t?.value) {
    const lines = t.value.split("\n");
    const longest = Math.max(...lines.map((l) => l.length));
    if (inside(t.x, t.y, longest * t.size * w * 0.55, lines.length * t.size * w * 1.05, t.rot)) return "text";
  }
  for (let i = d.images.length - 1; i >= 0; i--) {
    const img = d.images[i];
    const iw = img.scale * w;
    if (inside(img.x, img.y, iw, (iw * img.nh) / img.nw, img.rot)) return img.id;
  }
  return null;
}

/**
 * `stock`: blank t-shirts left by colour and size. Once the workshop tracks its stock (any line at all),
 * a studio t-shirt can only be ordered in a colour and size that's in stock; any colour can still be
 * previewed. With no stock set up yet, every colour can be ordered.
 */
export function StudioView({ stock = {}, stockColours = [] }: { stock?: StockMap; stockColours?: { name: string; hex: string }[] }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const canvases = mounted ? getCanvases() : null;
  const images = useRef(new Map<string, HTMLImageElement>());
  const [design, setDesign] = useState<Record<SideId, Side>>({ front: { images: [], text: DEFAULT_TEXT }, back: { images: [] } });
  const [side, setSide] = useState<SideId>("front");
  const [worn, setWorn] = useState(false); // the stage shows the tee alone, or worn by a mannequin
  const [selected, setSelected] = useState<Layer | null>("text");
  const [tab, setTab] = useState<"couleur" | "image" | "texte">("texte");
  const [teeHex, setTeeHex] = useState<string>(TEE_COLORS[0].hex.toLowerCase());
  // The signed-in customer's real credits (null while loading). Signed out: free actions only.
  const [credits, setCredits] = useState<MyCredits | null>(null);
  const tokens = credits?.signedIn ? credits.balance : 0;
  const [size, setSize] = useState("M");
  const [qty, setQty] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  // Images picked but not added yet (checked before a credit is spent), and the last paid addition that
  // "Annuler" can still take back.
  const [picked, setPicked] = useState<{ files: File[]; urls: string[]; dropped: number } | null>(null);
  const [undo, setUndo] = useState<{ entryId: string; side: SideId; ids: string[]; text: string; left: number } | null>(null);
  // Why a paid action stopped: not signed in, or not enough credits.
  const [gate, setGate] = useState<"signin" | "empty" | null>(null);
  const [quality, setQuality] = useState<PrintQuality>("STANDARD");
  const [exporting, setExporting] = useState(false);
  const [adding, setAdding] = useState<string | null>(null); // progress of the print files going to the workshop
  const [compare, setCompare] = useState(false);
  // The creation saved in the customer's account that this design is (updated in place on the next save).
  const [savedAs, setSavedAs] = useState<{ id: string; name: string } | null>(null);
  const [naming, setNaming] = useState<string | null>(null); // the name being typed before the first save
  const [saving, setSaving] = useState(false);
  const preview = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const veiled = useCaptureVeil();

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
  useEffect(() => {
    getMyCredits()
      .then(setCredits)
      .catch(() => setCredits({ signedIn: false }));
  }, []);

  /**
   * Spends credits on the server. Null, with the reason shown, if it can't; otherwise the ledger line of the
   * spending (`entryId`, none when free), which is what a refund names.
   */
  const spend = async (n: number, reason: "IMAGE_UPLOAD" | "HD_PREVIEW"): Promise<{ entryId?: string } | null> => {
    if (n <= 0) return {};
    if (!credits?.signedIn) {
      setGate("signin");
      return null;
    }
    if (credits.balance < n) {
      setGate("empty");
      return null;
    }
    const r = await spendCredits(n, reason).catch(() => null);
    if (r?.ok) {
      setCredits({ ...credits, balance: r.balance });
      return { entryId: r.entryId };
    }
    if (r?.reason === "signed-out") setGate("signin");
    else if (r?.reason === "not-enough") {
      setCredits({ ...credits, balance: r.balance ?? 0 });
      setGate("empty");
    }
    else flash("Les crédits n'ont pas pu être utilisés : réessaie");
    return null;
  };

  /** Gives back the credits of one spending (`why`: it failed, or the customer pressed Annuler). */
  const refund = (entryId: string | undefined, why: "failed" | "undo") =>
    entryId
      ? refundSpend(entryId, why)
          .then((r) => {
            if (r.ok) setCredits((c) => (c?.signedIn ? { ...c, balance: r.balance } : c));
            return r.ok;
          })
          .catch(() => false)
      : Promise.resolve(false);

  /** Changes the text ("text") or one image (by its id) on the current side. */
  const update = (layer: Layer, patch: Partial<Img> & Partial<Txt>) =>
    setDesign((d) => {
      const s = d[side];
      if (layer === "text") return s.text ? { ...d, [side]: { ...s, text: { ...s.text, ...patch } } } : d;
      return { ...d, [side]: { ...s, images: s.images.map((i) => (i.id === layer ? { ...i, ...patch } : i)) } };
    });
  const topLayer = (s: Side): Layer | null => (s.images.length ? s.images[s.images.length - 1].id : s.text?.value ? "text" : null);

  const flip = (s: SideId) => {
    setSide(s);
    setSelected(topLayer(design[s]));
    gsap.to(teeState, { rotY: s === "front" ? 0 : Math.PI, duration: 1, ease: "back.out(1.4)" });
  };
  const pickColor = (hex: string) => {
    setTeeHex(hex);
    teeState.hex = hex; // the 3D scene eases towards it
  };


  /** A 220×220 capture of the 3D t-shirt as it is on screen (cart line, saved creation). */
  const snapshot3d = (): string | undefined => {
    const gl = stage.current?.querySelector("canvas");
    if (!gl) return undefined;
    const c = Object.assign(document.createElement("canvas"), { width: 220, height: 220 });
    const s = Math.min(gl.width, gl.height);
    c.getContext("2d")!.drawImage(gl, (gl.width - s) / 2, (gl.height - s) / 2, s, s, 0, 0, 220, 220);
    try {
      return c.toDataURL("image/png");
    } catch {
      return undefined;
    }
  };

  // Reopens a creation saved in the account: /studio?design=<id> (from /compte). Its images come back from
  // the storage (with CORS, so the print canvases stay exportable) before the design is shown.
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("design");
    if (!id) return;
    let live = true;
    (async () => {
      const d = await getMyDesign(id).catch(() => null);
      if (!live) return;
      if (!d) return flash("Création introuvable : connecte-toi avec le compte qui l'a sauvegardée");
      const srcs = [...new Set([...d.front.images, ...d.back.images].map((i) => i.src))];
      await Promise.all(
        srcs.map(
          (src) =>
            new Promise<void>((done) => {
              const el = new Image();
              el.crossOrigin = "anonymous";
              el.onload = () => {
                images.current.set(src, el);
                done();
              };
              el.onerror = () => done();
              el.src = src;
            }),
        ),
      );
      if (!live) return;
      const keep = (sd: Side): Side => ({ ...sd, images: sd.images.filter((i) => images.current.has(i.src)) });
      const lost = srcs.some((src) => !images.current.has(src));
      setDesign({ front: keep(d.front), back: keep(d.back) });
      pickColor(d.teeColor);
      setSavedAs({ id: d.id, name: d.name });
      setSelected(d.front.images.at(-1)?.id ?? (d.front.text ? "text" : null));
      flash(lost ? `« ${d.name} » ouverte, mais une image n'a pas pu être chargée` : `« ${d.name} » ouverte`);
    })();
    return () => {
      live = false;
    };
  }, []);

  /**
   * Saves the design in the customer's account (free): images still only in this page are sent to the
   * storage first, then the layout, the colour and a capture of the 3D t-shirt. A reopened creation is updated.
   */
  const saveDesign = async (name: string) => {
    if (saving) return;
    if (!credits?.signedIn) return setGate("signin");
    if (!hasContent(design.front) && !hasContent(design.back)) return flash("Ajoute une image ou un texte avant de sauvegarder");
    setSaving(true);
    try {
      const sent = new Map<string, string>(); // data URL -> stored URL
      for (const img of [...design.front.images, ...design.back.images]) {
        if (!img.src.startsWith("data:") || sent.has(img.src)) continue;
        const blob = await (await fetch(img.src)).blob();
        const signed = await presignMyDesignImage({ type: blob.type, size: blob.size });
        if (!signed.ok) throw new Error(signed.message);
        const put = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": blob.type }, body: blob });
        if (!put.ok) throw new Error(`upload ${put.status}`);
        const el = images.current.get(img.src);
        if (el) images.current.set(signed.publicUrl, el);
        sent.set(img.src, signed.publicUrl);
      }
      const swap = (sd: Side): Side => ({ ...sd, images: sd.images.map((i) => (sent.has(i.src) ? { ...i, src: sent.get(i.src)! } : i)) });
      const next = { front: swap(design.front), back: swap(design.back) };
      setDesign(next); // sent images keep their stored link: a retry won't send them again
      const payload = { id: savedAs?.id, name, teeColor: teeHex, ...next, preview: snapshot3d() };
      let r = await saveMyDesign(payload);
      // Past the free creations, one more costs credits: asked first, then taken by the server with the save.
      if (!r.ok && r.reason === "pay") {
        if (!confirm(`${r.message}\n\nSauvegarder « ${name || "Ma création"} » pour ${creditsLabel(r.cost ?? DESIGN_SAVE_CREDITS)} ?`)) return;
        r = await saveMyDesign({ ...payload, pay: true });
      }
      if (!r.ok && r.reason === "not-enough") {
        if (credits?.signedIn) setCredits({ ...credits, balance: r.balance ?? 0 });
        setGate("empty");
        return flash(r.message);
      }
      if (!r.ok) throw new Error(r.message);
      if (r.balance !== undefined && credits?.signedIn) setCredits({ ...credits, balance: r.balance });
      setSavedAs({ id: r.id, name: r.name });
      setNaming(null);
      const paid = r.spent ? ` · ${creditsLabel(r.spent)} utilisé${r.spent > 1 ? "s" : ""}` : "";
      flash(savedAs ? `« ${r.name} » mise à jour dans ton compte` : `« ${r.name} » sauvegardée dans ton compte${paid}`);
    } catch (err) {
      console.error("Design save failed", err);
      void reportClientError("studio.save", err instanceof Error ? err.message : String(err), { path: location.pathname }).catch(() => {});
      flash(err instanceof Error && !/fetch|upload/i.test(err.message) ? err.message : "La création n'a pas pu être sauvegardée : vérifie ta connexion et réessaie");
    } finally {
      setSaving(false);
    }
  };

  // Images: picked, shown for a check before any credit is spent (a wrong file costs nothing), then added to the
  // current side on top of what is there, 1 credit each. Right after, "Annuler" takes them off and gives the
  // credits back for UNDO_SECONDS (the server allows it once per spending, and a few times a day).
  const onPick = (list: FileList | null) => {
    const files = [...(list ?? [])];
    if (!files.length) return;
    if (files.some((f) => !/^image\/(png|jpeg|webp)$/.test(f.type))) return flash("Format accepté : PNG, JPG ou WEBP");
    if (files.some((f) => f.size > 20 * 1024 * 1024)) return flash("Image trop lourde (20 Mo max)");
    const room = MAX_IMAGES - design[side].images.length;
    if (room <= 0) return flash(`${MAX_IMAGES} images maximum par face`);
    const take = files.slice(0, room);
    setPicked({ files: take, urls: take.map((f) => URL.createObjectURL(f)), dropped: files.length - take.length });
  };
  const closePicked = () =>
    setPicked((p) => {
      p?.urls.forEach((u) => URL.revokeObjectURL(u));
      return null;
    });

  const addImages = async (take: File[], dropped: number) => {
    const paid = await spend(take.length, "IMAGE_UPLOAD");
    if (!paid) return;
    const target = side;
    const extra = dropped > 0 ? ` (${MAX_IMAGES} max par face)` : "";
    const ids: string[] = [];
    take.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const src = String(reader.result);
        const el = new Image();
        el.onload = () => {
          images.current.set(src, el);
          const id = `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
          setDesign((d) => {
            // Each new image lands a little to the side and lower, so they don't hide each other.
            const n = d[target].images.length;
            const img: Img = { id, src, nw: el.naturalWidth, nh: el.naturalHeight, ...DEFAULT_IMAGE, x: 0.5 + ((n % 3) - 1) * 0.12, y: DEFAULT_IMAGE.y + (n % 4) * 0.05 };
            return { ...d, [target]: { ...d[target], images: [...d[target].images, img] } };
          });
          setSelected(id);
          ids.push(id);
          if (ids.length === take.length) {
            const text = take.length > 1 ? `${take.length} images ajoutées · ${take.length} crédits${extra}` : `Image ajoutée · 1 crédit${extra}`;
            // Free images (no credit spent) have nothing to give back: a plain message.
            if (paid.entryId) setUndo({ entryId: paid.entryId, side: target, ids: [...ids], text, left: UNDO_SECONDS });
            else flash(text);
          }
        };
        el.src = src;
      };
      reader.readAsDataURL(file);
    });
  };

  const undoImages = async () => {
    const u = undo;
    if (!u) return;
    setUndo(null);
    const drop = (s: Side): Side => ({ ...s, images: s.images.filter((i) => !u.ids.includes(i.id)) });
    setDesign((d) => ({ ...d, [u.side]: drop(d[u.side]) }));
    if (u.side === side) setSelected(topLayer(drop(design[u.side])));
    const back = await refund(u.entryId, "undo");
    const n = u.ids.length;
    flash(back ? `${n > 1 ? "Images retirées" : "Image retirée"} · ${n > 1 ? `${n} crédits rendus` : "crédit rendu"}` : `${n > 1 ? "Images retirées" : "Image retirée"} · le crédit n'a pas pu être rendu`);
  };

  // The "Annuler" countdown.
  useEffect(() => {
    if (!undo) return;
    // one second later: count down, or close the offer once the last second has passed
    const t = setTimeout(() => setUndo((u) => (u && u.left > 1 ? { ...u, left: u.left - 1 } : null)), 1000);
    return () => clearTimeout(t);
  }, [undo]);

  // Stacking order and removal of the selected layer.
  const restack = (id: string, by: -1 | 1) =>
    setDesign((d) => {
      const list = [...d[side].images];
      const i = list.findIndex((x) => x.id === id);
      const j = i + by;
      if (i < 0 || j < 0 || j >= list.length) return d;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...d, [side]: { ...d[side], images: list } };
    });
  const removeLayer = (layer: Layer) => {
    const s = design[side];
    const next: Side = layer === "text" ? { ...s, text: undefined } : { ...s, images: s.images.filter((i) => i.id !== layer) };
    setDesign((d) => ({ ...d, [side]: next }));
    setSelected(topLayer(next));
  };

  // On the print preview: press a layer to select it, then drag it (it keeps the point you grabbed).
  // Pressing an empty spot moves the selected layer there.
  const drag = useRef<{ layer: Layer; dx: number; dy: number } | null>(null);
  const pointAt = (e: React.PointerEvent) => {
    const r = preview.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, w: r.width, h: r.height };
  };
  const startDrag = (e: React.PointerEvent) => {
    if (!preview.current) return;
    const p = pointAt(e);
    const s = design[side];
    const hit = layerAt(s, p.x, p.y, p.w, p.h);
    const target = hit ?? selected;
    const l = target === "text" ? s.text : s.images.find((i) => i.id === target);
    if (!target || !l) return;
    if (hit) {
      setSelected(hit);
      setTab(hit === "text" ? "texte" : "image");
      drag.current = { layer: hit, dx: l.x - p.x, dy: l.y - p.y };
    } else {
      drag.current = { layer: target, dx: 0, dy: 0 };
      update(target, { x: p.x, y: p.y });
    }
  };
  const moveDrag = (e: React.PointerEvent) => {
    const g = drag.current;
    if (!g || !preview.current) return;
    const p = pointAt(e);
    update(g.layer, { x: Math.min(1, Math.max(0, p.x + g.dx)), y: Math.min(1, Math.max(0, p.y + g.dy)) });
  };

  // Drag on the 3D stage rotates the tee.
  const spin = useRef<number | null>(null);

  const cur = design[side];
  const selImage = selected && selected !== "text" ? cur.images.find((i) => i.id === selected) : undefined;
  const layer = selected === "text" ? cur.text : selImage;
  const selIndex = selImage ? cur.images.indexOf(selImage) : -1;
  const hasBack = hasContent(design.back);
  const price = BASE_PRICE + (hasBack ? BACK_PRICE : 0);
  const dpi = selImage ? Math.round(selImage.nw / ((selImage.scale * PRINT_WIDTH_CM) / 2.54)) : null;
  const q = PRINT_QUALITY[quality];
  // Stock of blank t-shirts: only once the workshop tracks it (any line) does it limit what can be ordered.
  const stockManaged = Object.keys(stock).length > 0;
  const teeTracked = Boolean(stock[teeHex.toLowerCase()]);
  const orderable = !stockManaged || available(stock, teeHex, size) > 0;
  const creditsLabel = (n: number) => `${n} crédit${n > 1 ? "s" : ""}`;
  const setInk = (color: string) =>
    setDesign((d) => ({ ...d, [side]: { ...d[side], text: { ...(d[side].text ?? { ...DEFAULT_TEXT, value: "" }), color } } }));

  // An HD / Ultra HD print file costs its credits once per design added, whatever the quantity.
  // Adding to the cart sends the print files to the workshop's storage first: each printed side drawn at the
  // chosen quality, without watermark. The order carries their links; the admin downloads them to print.
  const addToCart = async () => {
    if (!orderable) return flash(teeTracked ? `Épuisé en ${size} dans cette couleur : choisis une autre taille` : "Cette couleur n'est pas en stock : choisis une teinte en stock pour commander");
    const sides = (["front", "back"] as SideId[]).filter((id) => hasContent(design[id]));
    if (!sides.length) return flash("Ajoute une image ou un texte avant de commander");
    if (adding) return;
    const paid = await spend(q.credits, "HD_PREVIEW");
    if (!paid) return;
    const files: { side: "front" | "back"; url: string }[] = [];
    try {
      for (const [i, id] of sides.entries()) {
        setAdding(`Fichier d'impression ${i + 1} sur ${sides.length}…`);
        const c = Object.assign(document.createElement("canvas"), { width: q.px, height: Math.round(q.px / TEE_ASPECT) });
        const ctx = c.getContext("2d");
        if (!ctx) throw new Error("canvas too large");
        paint(ctx, design[id], c.width, c.height, images.current);
        const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
        if (!blob) throw new Error("canvas too large");
        const signed = await presignDesignFile({ side: id, size: blob.size });
        // Refused by the server (too many files in a short time…): its own message is shown as it is.
        if (!signed.ok) throw Object.assign(new Error(signed.message), { name: "PrintRefused" });
        const put = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": "image/png" }, body: blob });
        if (!put.ok) throw new Error(`upload ${put.status}`);
        files.push({ side: id, url: signed.publicUrl });
      }
    } catch (err) {
      const refused = err instanceof Error && err.name === "PrintRefused";
      console.error("Print files upload failed", err);
      // "Failed to fetch" here is most often the storage's CORS rule (see the README). A refusal is not a bug.
      if (!refused) void reportClientError("studio.upload", err instanceof Error ? err.message : String(err), { path: location.pathname }).catch(() => {});
      setAdding(null);
      void refund(paid.entryId, "failed");
      return flash(refused ? (err as Error).message : "Le fichier d'impression n'a pas pu être envoyé : vérifie ta connexion et réessaie");
    }
    setAdding(null);
    const thumb = snapshot3d();
    const name = quality === "STANDARD" ? "T-shirt personnalisé" : `T-shirt personnalisé · ${q.label}`;
    cart.add({ key: cartKey(), productId: null, name, price, color: teeHex, size, qty, preview: thumb, bg: "#e7e0d3", quality, files });
    flash(q.credits ? `Ajouté au panier · ${creditsLabel(q.credits)} utilisé${q.credits > 1 ? "s" : ""}` : "Ajouté au panier");
  };

  // Download: the 3D view of the tee exactly as posed in the studio (angle, colour, design), then the
  // flat print file of each printed side, all at the chosen quality.
  const exportDesign = async () => {
    const sides = (["front", "back"] as SideId[]).filter((id) => hasContent(design[id]));
    const paid = await spend(q.credits, "HD_PREVIEW");
    if (!paid) return;
    setExporting(true);
    const tag = q.label.toLowerCase().replace(/\s+/g, "-");
    const save = (blob: Blob, name: string) => {
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
    // Everything goes into one .zip, so it downloads at once (browsers block or ask about several downloads).
    const files: { name: string; data: Blob }[] = [];
    // Standard: a watermarked preview, too small to print. HD and Ultra HD: the full files, clean.
    // All of them carry an invisible trace (date, quality, a random id): see src/lib/watermark.ts.
    const free = quality === "STANDARD";
    const size = downloadWidth(quality);
    const trace = exportTrace(quality);
    try {
      // The tee straight on, front then back, whatever angle it has on screen.
      for (const face of ["front", "back"] as const) {
        const view = await teeSnapshot.current?.(size.view, face);
        if (!view) throw new Error("3D view unavailable");
        files.push({ name: `artsyde-vue-${face === "front" ? "devant" : "dos"}-${tag}.png`, data: await protectImage(view, { watermark: free, trace }) });
      }
      for (const id of sides) {
        const c = Object.assign(document.createElement("canvas"), { width: size.print, height: Math.round(size.print / TEE_ASPECT) });
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("canvas too large");
        paint(ctx, design[id], c.width, c.height, images.current);
        if (free) stampWatermark(ctx, c.width, c.height);
        embedTrace(ctx, c.width, c.height, trace);
        const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
        if (!blob) throw new Error("canvas too large");
        files.push({ name: `artsyde-${free ? "apercu" : "impression"}-${id === "front" ? "devant" : "dos"}-${tag}.png`, data: blob });
      }
      save(await zipFiles(files), `artsyde-${tag}.zip`);
      flash(q.credits ? `Visuel ${q.label} téléchargé · ${creditsLabel(q.credits)} utilisé${q.credits > 1 ? "s" : ""}` : "Visuel téléchargé");
    } catch (err) {
      console.error("Studio export failed", err);
      void refund(paid.entryId, "failed");
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
      onClick={() => (setTab(t), t !== "couleur" && setSelected(t === "texte" ? "text" : (cur.images.at(-1)?.id ?? null)))}
      className={`relative pb-2 text-[11px] tracking-[0.2em] uppercase transition-colors ${tab === t ? "" : "text-muted hover:text-ink"}`}
    >
      {t}
      {tab === t && <motion.span layoutId="tool-line" className="absolute inset-x-0 bottom-0 h-px bg-ink" transition={{ duration: DUR.base, ease: EASE.out }} />}
    </button>
  );

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-10 md:px-10" onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <RevealLines as="h1" lines={[{ text: "Studio 3D.", muted: "Crée le tien." }]} className="display text-5xl md:text-6xl" />
        <div className="flex items-center gap-6 text-sm">
          {credits === null ? (
            <span className="h-px w-16 animate-pulse bg-ink/40" aria-label="Chargement des crédits" />
          ) : credits.signedIn ? (
            <>
              <motion.span key={tokens} initial={{ opacity: 0.3 }} animate={{ opacity: 1 }} className="tabular-nums">
                {tokens} crédit{tokens > 1 ? "s" : ""}
              </motion.span>
              <Link href="/credits" className="link-line">
                Recharger <span className="arrow">→</span>
              </Link>
            </>
          ) : (
            <Link href="/connexion?suite=/studio" className="link-line">
              Se connecter · 5 crédits offerts <span className="arrow">→</span>
            </Link>
          )}
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
          {/* The tee scene stays mounted under the mannequin: saved designs and the cart take their picture from it. */}
          <div className={worn ? "invisible absolute inset-0" : "contents"} aria-hidden={worn || undefined}>
            {canvases && <TeeScene front={canvases.front} back={canvases.back} preserve />}
          </div>
          {worn && canvases && (
            <div className="absolute inset-0">
              <MannequinTryOn color={teeHex} size={size} studio={canvases} className="h-full w-full" />
            </div>
          )}
          <div className="absolute left-1/2 top-5 flex -translate-x-1/2 gap-6">
            {(["front", "back"] as const).map((s) => (
              <button key={s} onClick={() => flip(s)} aria-pressed={side === s} className={`relative pb-1.5 text-[11px] tracking-[0.2em] uppercase ${side === s ? "" : "text-muted"}`}>
                {s === "front" ? "Devant" : "Dos"}
                {side === s && <motion.span layoutId="side-line" className="absolute inset-x-0 bottom-0 h-px bg-ink" />}
              </button>
            ))}
          </div>
          <div className="absolute left-1/2 top-14 flex -translate-x-1/2 rounded-full bg-bg/80 p-0.5 text-[12px]" role="group" aria-label="Affichage">
            {([false, true] as const).map((w) => (
              <button key={String(w)} type="button" onClick={() => setWorn(w)} onPointerEnter={w ? preloadWorn : undefined} onPointerDown={w ? preloadWorn : undefined} onFocus={w ? preloadWorn : undefined} aria-pressed={worn === w} className={`rounded-full px-3 py-1 transition-colors ${worn === w ? "bg-ink text-on-ink" : "text-muted hover:text-ink"}`}>
                {w ? "Porté" : "T-shirt"}
              </button>
            ))}
          </div>
          <Watermark />
          <p className="eyebrow pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">Glisse pour tourner</p>
          <Veil on={veiled} />
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
                  <ColorPicker initial={teeHex} presets={stockColours.length ? stockColours : TEE_COLORS} presetsLabel={stockColours.length ? "En stock à l'atelier" : "Teintes populaires"} onChange={pickColor} />
                  {stockManaged && !teeTracked && <p className="text-sm text-new">Cette teinte n&apos;est pas en stock : tu peux la voir en 3D, mais pour commander choisis une teinte en stock.</p>}
                </>
              )}

              {tab === "image" && (
                <>
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-bg px-6 py-10 text-center transition-colors duration-300 hover:border-accent">
                    <span className="text-[17px] font-semibold text-link">{cur.images.length ? "Ajouter des images" : "Importer des images"}</span>
                    <span className="text-xs text-muted">PNG, JPG ou WEBP · 1 crédit par image · {MAX_IMAGES} max sur le {side === "front" ? "devant" : "dos"}</span>
                    <input type="file" multiple accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => (onPick(e.target.files), (e.target.value = ""))} />
                  </label>
                  {cur.images.length > 0 && (
                    <div>
                      <p className="text-sm text-muted">
                        {cur.images.length} image{cur.images.length > 1 ? "s" : ""} sur le {side === "front" ? "devant" : "dos"} · touche-en une pour la régler
                      </p>
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {cur.images.map((img, i) => (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => setSelected(img.id)}
                            aria-pressed={selected === img.id}
                            aria-label={`Image ${i + 1}`}
                            className={`aspect-square overflow-hidden rounded-xl border bg-surface p-1 transition-colors duration-300 ${selected === img.id ? "border-accent shadow-[0_0_0_1px_var(--accent)]" : "border-line hover:border-muted"}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL */}
                            <img src={img.src} alt="" draggable={false} className="h-full w-full object-contain" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {selImage && dpi !== null && (
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
                  <p className="eyebrow">Ajuster {selImage ? (cur.images.length > 1 ? `l'image ${selIndex + 1}` : "l'image") : "le texte"}</p>
                  {selImage && slider("Largeur", selImage.scale, 0.05, 1, 0.005, (v) => update(selImage.id, { scale: v }), (v) => `${Math.round(v * PRINT_WIDTH_CM)} cm`)}
                  {selected === "text" && cur.text && slider("Taille", cur.text.size, 0.02, 0.22, 0.001, (v) => update("text", { size: v }), (v) => `${(v * PRINT_WIDTH_CM).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} cm`)}
                  {slider("Horizontal", layer.x, 0, 1, 0.01, (v) => update(selected!, { x: v }), (v) => `${Math.round(v * 100)} %`)}
                  {slider("Vertical", layer.y, 0, 1, 0.01, (v) => update(selected!, { y: v }), (v) => `${Math.round(v * 100)} %`)}
                  {slider("Rotation", layer.rot, -180, 180, 1, (v) => update(selected!, { rot: v }), (v) => `${v}°`)}
                  <div className="flex flex-wrap gap-x-6 gap-y-3 pt-2">
                    <button onClick={() => update(selected!, { x: 0.5 })} className="link-line">Centrer</button>
                    {selImage && cur.images.length > 1 && (
                      <>
                        <button onClick={() => restack(selImage.id, 1)} disabled={selIndex === cur.images.length - 1} className="link-line disabled:opacity-40 disabled:no-underline">Devant</button>
                        <button onClick={() => restack(selImage.id, -1)} disabled={selIndex === 0} className="link-line disabled:opacity-40 disabled:no-underline">Derrière</button>
                      </>
                    )}
                    <button onClick={() => removeLayer(selected!)} className="link-line text-danger">
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
            <p className="mt-1 text-xs text-muted">Tout le {side === "front" ? "devant" : "dos"}, manches comprises. Touche une image ou le texte pour le choisir, glisse pour le placer.</p>
            <div
              className="relative mx-auto mt-4 w-full max-w-[360px] cursor-move touch-none"
              style={{ aspectRatio: `${W} / ${H}` }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture?.(e.pointerId);
                startDrag(e);
              }}
              onPointerMove={moveDrag}
              onPointerUp={() => (drag.current = null)}
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
              <div className="pointer-events-none absolute inset-0" style={{ clipPath: "url(#print-area)" }}>
                <Watermark />
              </div>
              <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full text-muted" aria-hidden>
                <path d={TEE_PATH_01} fill="none" stroke="currentColor" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
              </svg>
              <Veil on={veiled} compact />
            </div>
          </div>

          <div className="border-t border-line pt-8">
            <p className="eyebrow">Qualité de sortie</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {PRINT_QUALITIES.map((k) => (
                <button key={k} onClick={() => setQuality(k)} aria-pressed={quality === k} className={`rounded-xl border px-2 py-2.5 text-sm transition-colors duration-300 ${quality === k ? "border-accent font-medium shadow-[0_0_0_1px_var(--accent)]" : "border-line hover:border-muted"}`}>
                  {PRINT_QUALITY[k].label}
                  <span className="block text-[11px] font-normal text-muted">{PRINT_QUALITY[k].credits ? creditsLabel(PRINT_QUALITY[k].credits) : "Aperçu gratuit"}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              {quality === "STANDARD"
                ? `Un aperçu de ${STANDARD_PREVIEW_PX.toLocaleString("fr-FR")} px avec filigrane : le t-shirt en 3D de face et de dos, et ton design. Pour un fichier imprimable, choisis HD ou Ultra HD.`
                : `Le t-shirt en 3D vu de face et de dos (${q.view.toLocaleString("fr-FR")} px), et le fichier d'impression à ${q.dpi} DPI (${q.px.toLocaleString("fr-FR")} × ${Math.round(q.px / TEE_ASPECT).toLocaleString("fr-FR")} px), sans filigrane.`}{" "}
              La qualité choisie est aussi celle du fichier d&apos;impression envoyé avec ta commande{q.credits ? ` : ${creditsLabel(q.credits)} à l'ajout au panier` : ""}.
            </p>
            <button type="button" onClick={() => setCompare((v) => !v)} aria-expanded={compare} className="link-line mt-3 !text-[15px]">
              {compare ? "Masquer la comparaison" : "Voir la différence entre les qualités"} <span className="arrow">›</span>
            </button>
            {compare && mounted && <QualityCompare side={cur} center={layer ? { x: layer.x, y: layer.y } : { x: 0.5, y: 0.32 }} images={images} current={quality} onPick={setQuality} />}
            <button onClick={exportDesign} disabled={exporting} className="btn-outline mt-4 w-full">
              {exporting ? <span className="h-4 w-4 animate-spin rounded-full border border-accent border-t-transparent" aria-label="Export en cours" /> : `Télécharger le visuel${q.credits ? ` · ${creditsLabel(q.credits)}` : ""}`}
            </button>
            {naming !== null ? (
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveDesign(naming);
                }}
              >
                <label htmlFor="design-name" className="sr-only">
                  Nom de la création
                </label>
                <input id="design-name" autoFocus value={naming} onChange={(e) => setNaming(e.target.value)} maxLength={60} placeholder="Nom de la création" className="min-w-0 flex-1 rounded-full border border-line bg-transparent px-4 py-2.5 text-sm outline-none focus:border-accent" />
                <button type="submit" disabled={saving} className="btn-outline !px-5">
                  {saving ? <span className="h-4 w-4 animate-spin rounded-full border border-accent border-t-transparent" aria-label="Sauvegarde en cours" /> : "OK"}
                </button>
                <button type="button" onClick={() => setNaming(null)} className="px-2 text-sm text-muted hover:text-ink" aria-label="Annuler">
                  ×
                </button>
              </form>
            ) : (
              <button type="button" onClick={() => (!credits?.signedIn ? setGate("signin") : savedAs ? void saveDesign(savedAs.name) : setNaming(""))} disabled={saving} className="btn-outline mt-3 w-full">
                {saving ? <span className="h-4 w-4 animate-spin rounded-full border border-accent border-t-transparent" aria-label="Sauvegarde en cours" /> : savedAs ? `Mettre à jour « ${savedAs.name} »` : "Sauvegarder dans mon compte"}
              </button>
            )}
            {!savedAs && naming === null && (
              <p className="mt-2 text-center text-xs text-muted">
                {FREE_DESIGNS} créations gratuites, puis {creditsLabel(DESIGN_SAVE_CREDITS)} par création en plus.
              </p>
            )}
            {savedAs && (
              <p className="mt-2 text-center text-xs text-muted">
                Retrouve tes créations dans{" "}
                <Link href="/compte#creations" className="text-link hover:underline">
                  ton compte
                </Link>
                {" · "}
                <button
                  type="button"
                  onClick={() => {
                    setSavedAs(null);
                    setNaming("");
                  }}
                  className="text-link hover:underline"
                >
                  en faire une copie
                </button>
              </p>
            )}
          </div>

          <div className="border-t border-line pt-8">
            <p className="eyebrow">Taille</p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {SIZES.map((s) => {
                const out = stockManaged && available(stock, teeHex, s) <= 0;
                return (
                  <button key={s} onClick={() => setSize(s)} aria-pressed={size === s} aria-label={out ? `${s}, épuisé dans cette couleur` : s} className={`rounded-xl border py-2.5 text-sm transition-colors duration-300 ${out ? "text-muted line-through" : ""} ${size === s ? "border-accent font-medium shadow-[0_0_0_1px_var(--accent)]" : "border-line hover:border-muted"}`}>
                    {s}
                  </button>
                );
              })}
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
            <button onClick={addToCart} disabled={!orderable || Boolean(adding)} className="btn mt-6 w-full">
              {adding ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-hidden />
                  {adding}
                </>
              ) : orderable ? (
                `Ajouter au panier${q.credits ? ` · ${creditsLabel(q.credits)}` : ""}`
              ) : teeTracked ? (
                `Épuisé en ${size}`
              ) : (
                "Couleur pas en stock"
              )}
            </button>
          </div>
        </motion.aside>
      </div>

      <AnimatePresence>
        {undo && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
            className="fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-6 bg-ink px-6 py-4 text-sm text-on-ink"
          >
            <span>{undo.text}</span>
            <button type="button" onClick={undoImages} className="shrink-0 text-[11px] tracking-[0.2em] uppercase underline underline-offset-4">
              Annuler ({undo.left} s)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {picked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] grid place-items-center bg-ink/50 p-5 backdrop-blur-sm" onClick={closePicked}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: DUR.base, ease: EASE.out }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-[28px] bg-bg p-8 text-center"
              role="dialog"
              aria-modal
              aria-labelledby="picked-title"
            >
              <p className="eyebrow">Vérifie avant d&apos;ajouter</p>
              <h2 id="picked-title" className="display mt-2 text-3xl">
                {picked.files.length > 1 ? `Ces ${picked.files.length} images ?` : "Cette image ?"}
              </h2>
              <div className={`mt-6 grid gap-3 ${picked.files.length > 1 ? "grid-cols-3" : "grid-cols-1"}`}>
                {picked.urls.map((u, i) => (
                  // eslint-disable-next-line @next/next/no-img-element -- a local preview of the picked file
                  <img key={u} src={u} alt={picked.files[i]?.name ?? ""} className={`w-full rounded-2xl bg-surface object-contain ${picked.files.length > 1 ? "aspect-square" : "max-h-64"}`} />
                ))}
              </div>
              {picked.dropped > 0 && <p className="mt-3 text-xs text-muted">{MAX_IMAGES} images maximum par face : {picked.dropped} n&apos;ont pas été retenues.</p>}
              <p className="mt-4 text-sm text-muted">
                {picked.files.length > 1 ? `${picked.files.length} crédits` : "1 crédit"} sur le {side === "front" ? "devant" : "dos"}. Tu pourras encore annuler pendant {UNDO_SECONDS} secondes.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    const p = picked;
                    closePicked();
                    void addImages(p.files, p.dropped);
                  }}
                >
                  Ajouter au t-shirt · {picked.files.length > 1 ? `${picked.files.length} crédits` : "1 crédit"}
                </button>
                <button type="button" onClick={closePicked} className="link-line">
                  Choisir d&apos;autres images
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && !undo && (
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
        {gate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] grid place-items-center bg-ink/50 p-5 backdrop-blur-sm" onClick={() => setGate(null)}>
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
              {gate === "signin" ? (
                <>
                  <p className="eyebrow">Crédits studio</p>
                  <h2 className="display mt-2 text-4xl">Connecte-toi pour continuer.</h2>
                  <p className="mt-4 text-sm text-muted">Tes crédits sont sur ton compte : 5 crédits offerts à l&apos;inscription. Ton design reste ici pendant que tu te connectes dans cet onglet.</p>
                  <div className="mt-8 flex flex-col items-center gap-4">
                    <Link href="/connexion?suite=/studio" className="btn">Se connecter</Link>
                    <button onClick={() => setGate(null)} className="link-line">Plus tard</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="eyebrow">Crédits épuisés</p>
                  <h2 className="display mt-2 text-4xl">Recharge pour continuer.</h2>
                  <p className="mt-4 text-sm text-muted">Les crédits servent à importer une image, télécharger ou commander en HD.</p>
                  <div className="mt-8 flex flex-col items-center gap-4">
                    <Link href="/credits" className="btn">Recharger</Link>
                    <button onClick={() => setGate(null)} className="link-line">Plus tard</button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
