"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Safe3D } from "@/components/Safe3D";
import { PRINT_SIDES, type Print3D } from "@/lib/products";
import { canvasTexture, colorTrue } from "./story/teeModel";
import { PRINT_H, PRINT_W, drawPrint, usePrintImages } from "./ProductTee3D";
import { teeState } from "./story/teeState";

/*
 * The product worn by a shop mannequin (the "Porté" tab of a product page).
 *
 * Each mannequin is one dressed model (oversized tee, trousers, shoes) made with Meshy, in size L. The tee and
 * the body are found per pixel in a mask texture (red = tee, green = body): the tee takes the product's colour
 * and the prints, the body a matte black. The prints use the site's print area (TEE_ASPECT x tee length) through
 * a second UV set baked with the model (front u 0..1, back u 2..3), so a placement made in the admin's 3D tab
 * lands at the same spot. Other sizes widen or narrow the same model to that size's chest.
 */

export type Mannequin = "homme-baggy" | "homme-parachute" | "homme-assis" | "homme-cargo" | "femme-baggy" | "femme-cargo" | "femme-assis" | "duo";
// `y`: where the floor sits in the frame (a seated mannequin is shorter, so it sits higher).
export const MANNEQUINS: { id: Mannequin; gender: "homme" | "femme" | "duo"; look: string; y: number }[] = [
  { id: "homme-baggy", gender: "homme", look: "Baggy", y: -0.92 },
  { id: "homme-parachute", gender: "homme", look: "Parachute", y: -0.92 },
  { id: "homme-assis", gender: "homme", look: "Assis", y: -0.78 },
  { id: "homme-cargo", gender: "homme", look: "Cargo", y: -0.92 },
  { id: "femme-baggy", gender: "femme", look: "Baggy", y: -0.88 },
  { id: "femme-cargo", gender: "femme", look: "Cargo", y: -0.88 },
  { id: "femme-assis", gender: "femme", look: "Assise", y: -0.6 },
  // a man and a woman side by side, both in the tee (each with their own print area)
  { id: "duo", gender: "duo", look: "Ensemble", y: -0.92 },
];

// Body chest by size (cm, common size charts); the models are made in L.
const CHEST: Record<"homme" | "femme", Record<string, number>> = {
  homme: { XS: 86, S: 92, M: 98, L: 104, XL: 110, XXL: 116 },
  femme: { XS: 78, S: 82, M: 86, L: 91, XL: 97, XXL: 103 },
};
const SKIN = "#1c1c1f";

const VERT_HEAD = "#include <common>\nattribute vec2 uv1;\nvarying vec2 vPU;\nvarying vec3 vPN;\nvarying vec2 vMU;";
const FRAG_HEAD = "#include <common>\nvarying vec2 vPU;\nvarying vec3 vPN;\nvarying vec2 vMU;\nuniform sampler2D uMask;\nuniform vec3 uTee;\nuniform vec3 uSkin;\nuniform sampler2D uPrintFront;\nuniform sampler2D uPrintBack;";
const FRAG_BODY = `#include <map_fragment>
  vec4 mk = texture2D(uMask, vMU);
  float teeM = smoothstep(0.35, 0.65, mk.r), skinM = smoothstep(0.35, 0.65, mk.g) * (1.0 - teeM);
  vec3 base = diffuseColor.rgb;
  vec3 fabric = uTee;                                   // folds come from the shape (the texture's shading is faceted)
  bool back = vPU.x > 1.5;
  vec2 puv = vec2(back ? vPU.x - 2.0 : vPU.x, 1.0 - vPU.y);
  vec4 pr = back ? texture2D(uPrintBack, vec2(1.0 - puv.x, puv.y)) : texture2D(uPrintFront, puv);
  if (puv.x < 0.0 || puv.x > 1.0 || puv.y < 0.0 || puv.y > 1.0) pr = vec4(0.0);
  pr.a *= smoothstep(0.05, 0.3, abs(vPN.z));           // ink fades where the fabric turns to the side
  pr.a *= back ? step(vPN.z, 0.0) : step(0.0, vPN.z);   // back print on fabric facing back, front print facing front
  fabric = mix(fabric, pr.rgb, pr.a);
  diffuseColor.rgb = mix(mix(base, uSkin, skinM), fabric, teeM);`;

type Drag = { rot: number; active: boolean };
/**
 * Zoom: `target` is set by the gestures (the camera follows it smoothly); `focusY` is the chest of the shown
 * mannequin; `panX` / `panY` move the zoomed view (metres, back to 0 when the zoom is undone).
 */
type View = { target: number; focusY: number; panX: number; panY: number };
const HALF_FOV = Math.tan((30 / 2) * (Math.PI / 180));
const CAM_Y = -0.38, CAM_Z = 5.1, ZOOM_MAX = 2.8;
const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(1, z));
/** The studio's live print canvases: the mannequin then follows the studio (colour, turn, redraws) through teeState. */
export type StudioCanvases = { front: HTMLCanvasElement; back: HTMLCanvasElement };
const NO_PRINT: Print3D = {};

// Bump MODELS_V when the files change: browsers and the service worker keep the old ones otherwise.
const MODELS_V = 8;
const modelUrl = (id: Mannequin) => `/models/mannequins/${id}.glb?v=${MODELS_V}`;
const maskUrl = (id: Mannequin) => `/models/mannequins/${id}-mask.webp?v=${MODELS_V}`;
/** Starts downloading a mannequin (model + mask) so it shows at once when asked for. */
export function preloadMannequin(id: Mannequin = "homme-baggy") {
  useGLTF.preload(modelUrl(id));
  useLoader.preload(THREE.TextureLoader, maskUrl(id));
}

function Figure({ id, color, print, size, drag, studio, onFocus }: { id: Mannequin; color: string; print: Print3D; size: string; drag: React.RefObject<Drag>; studio?: StudioCanvases; onFocus: (y: number) => void }) {
  const { scene } = useGLTF(modelUrl(id));
  const mask = useLoader(THREE.TextureLoader, maskUrl(id));
  // Once this one shows, fetch the other looks of the same mannequin, so switching look is instant.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 1200));
    const gender = MANNEQUINS.find((m) => m.id === id)?.gender;
    idle(() => MANNEQUINS.filter((m) => m.gender === gender && m.id !== id).forEach((m) => preloadMannequin(m.id)));
  }, [id]);
  const images = usePrintImages(print);
  const group = useRef<THREE.Group>(null);

  const look = useMemo(() => {
    Object.assign(mask, { flipY: false, needsUpdate: true }); // the mask follows the model's UVs, as glTF textures do
    const canvases = studio ?? { front: Object.assign(document.createElement("canvas"), { width: PRINT_W, height: PRINT_H }), back: Object.assign(document.createElement("canvas"), { width: PRINT_W, height: PRINT_H }) };
    const textures = { front: canvasTexture(canvases.front), back: canvasTexture(canvases.back) };
    const uniforms = { uMask: { value: mask }, uTee: { value: new THREE.Color() }, uSkin: { value: new THREE.Color(SKIN) }, uPrintFront: { value: textures.front }, uPrintBack: { value: textures.back } };
    const root = scene.clone(true);
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const old = mesh.material as THREE.MeshStandardMaterial;
      // smooth shading across the model's texture seams (the low-poly export shades flat otherwise)
      mesh.geometry = toCreasedNormals(mesh.geometry, Math.PI / 2.2);
      const mat = new THREE.MeshPhysicalMaterial({ map: old.map, roughness: 0.85, metalness: 0, sheen: 0.4, sheenRoughness: 0.85, envMapIntensity: 0.55 });
      mat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, uniforms);
        sh.vertexShader = sh.vertexShader.replace("#include <common>", VERT_HEAD).replace("#include <begin_vertex>", "#include <begin_vertex>\nvPU = uv1;\nvPN = normal;\nvMU = uv;");
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", FRAG_HEAD).replace("#include <map_fragment>", FRAG_BODY);
      };
      mat.customProgramCacheKey = () => "mannequin";
      mesh.material = mat;
    });
    return { root, canvases, textures, uniforms };
  }, [scene, mask, studio]);
  useEffect(() => () => (look.textures.front.dispose(), look.textures.back.dispose()), [look]);
  // Where the zoom aims: the chest, a little under the top of the head (standing, seated or the duo's taller one).
  useEffect(() => {
    const top = new THREE.Box3().setFromObject(look.root).max.y;
    onFocus((MANNEQUINS.find((m) => m.id === id)?.y ?? -0.92) + top - 0.45);
  }, [look, id, onFocus]);

  useEffect(() => {
    look.uniforms.uTee.value.set(color);
  }, [look, color]);
  useEffect(() => {
    if (studio) return; // the studio paints its own canvases
    for (const s of PRINT_SIDES) {
      drawPrint(look.canvases[s], print[s] ? images.get(print[s].url) : undefined, print[s]);
      Object.assign(look.textures[s], { needsUpdate: true }); // re-upload the redrawn canvas
    }
  }, [look, print, images, studio]);

  const g = MANNEQUINS.find((m) => m.id === id)?.gender;
  const gender = g === "femme" ? "femme" : "homme"; // the duo widens like the man's sizes
  const k = (CHEST[gender][size] ?? CHEST[gender].L) / CHEST[gender].L;

  const seen = useRef(-1);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    if (studio) {
      if (seen.current !== teeState.texVersion) {
        seen.current = teeState.texVersion;
        Object.assign(look.textures.front, { needsUpdate: true });
        Object.assign(look.textures.back, { needsUpdate: true });
      }
      if (teeState.hex) look.uniforms.uTee.value.lerp(new THREE.Color(teeState.hex), 1 - Math.exp(-dt * 6));
    }
    const target = studio ? teeState.rotY : drag.current.rot;
    g.rotation.y += (target - g.rotation.y) * (1 - Math.exp(-dt * 6));
    g.scale.x += (k - g.scale.x) * (1 - Math.exp(-dt * 8));
    g.scale.z = g.scale.x;
  });

  return (
    <group ref={group} position={[0, MANNEQUINS.find((m) => m.id === id)?.y ?? -0.92, 0]}>
      <primitive object={look.root} />
    </group>
  );
}

/** Moves the camera with the zoom: closer, and up to the chest, looking straight ahead. */
function CameraRig({ view }: { view: React.RefObject<View> }) {
  const camera = useThree((st) => st.camera);
  const cur = useRef({ zoom: 1, x: 0, y: 0 }); // follows the view smoothly
  useFrame((_, dt) => {
    const v = view.current, c = cur.current, k = 1 - Math.exp(-dt * 10);
    c.zoom += (v.target - c.zoom) * k;
    c.x += (v.panX - c.x) * k;
    c.y += (v.panY - c.y) * k;
    const t = (c.zoom - 1) / (ZOOM_MAX - 1);
    camera.position.set(c.x, CAM_Y + (v.focusY - CAM_Y) * t + c.y, CAM_Z / c.zoom);
  });
  return null;
}

/**
 * `size`: the size chosen on the page (the mannequin widens to that size's chest).
 * `studio`: the studio's print canvases; the studio's stage then turns the mannequin (teeState.rotY) and the
 * mannequin picker sits at the bottom, under the studio's Devant / Dos.
 */
/** `onZoomChange`: told when the view gets zoomed or back to whole (e.g. to change a hint around it). */
export default function MannequinTryOn({ color, print = NO_PRINT, size, studio, className = "", onZoomChange }: { color: string; print?: Print3D; size: string; studio?: StudioCanvases; className?: string; onZoomChange?: (zoomed: boolean) => void }) {
  const [id, setId] = useState<Mannequin>("homme-baggy");
  const current = MANNEQUINS.find((m) => m.id === id)!;
  const drag = useRef<Drag>({ rot: 0.35, active: false });
  const last = useRef(0);
  const view = useRef<View>({ target: 1, focusY: 0.4, panX: 0, panY: 0 });
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => onZoomChange?.(zoomed), [zoomed, onZoomChange]);
  // Moving the zoomed view: kept so the mannequin never leaves the frame.
  const panBy = useCallback((dx: number, dy: number, height: number) => {
    const v = view.current;
    const perPx = (2 * (CAM_Z / v.target) * HALF_FOV) / Math.max(1, height);
    v.panX = Math.min(0.7, Math.max(-0.7, v.panX - dx * perPx));
    v.panY = Math.min(0.6, Math.max(-1.2, v.panY + dy * perPx));
  }, []);
  const zoomTo = useCallback((z: number) => {
    const v = view.current;
    v.target = clampZoom(z);
    if (v.target <= 1.05) Object.assign(v, { target: 1, panX: 0, panY: 0 });
    setZoomed(v.target > 1.05);
  }, []);
  const onFocus = useCallback((y: number) => {
    view.current.focusY = y;
  }, []);
  // Two fingers on the mannequin: pinch to zoom (one finger still turns it).
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number; mid: { x: number; y: number } } | null>(null);
  const spread = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const middle = () => {
    const [a, b] = [...pointers.current.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  // While zoomed, one finger / the mouse still turns the mannequin and moves the view up and down
  // (`free`: Shift + drag moves it any way, without turning).
  const panFrom = useRef<{ x: number; y: number; free: boolean } | null>(null);
  // Trackpad pinch (or Ctrl + wheel) zooms; a plain wheel still scrolls the page.
  const area = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomTo(view.current.target * Math.exp(-e.deltaY * 0.01));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [zoomTo]);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={area}
        className={`h-full w-full select-none ${zoomed ? "touch-none cursor-move" : "touch-pan-y cursor-grab active:cursor-grabbing"}`}
        onPointerDown={(e) => {
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          try {
            e.currentTarget.setPointerCapture(e.pointerId); // keep the moves even if the finger leaves the area
          } catch {
            // the pointer is already gone (e.g. a very quick tap): nothing to keep
          }
          if (pointers.current.size === 2) {
            pinch.current = { dist: spread(), zoom: view.current.target, mid: middle() };
            drag.current.active = false;
            panFrom.current = null;
            e.stopPropagation(); // not a turn of the studio's stage
            return;
          }
          if (view.current.target > 1.05) {
            panFrom.current = { x: e.clientX, y: e.clientY, free: e.shiftKey };
            if (e.shiftKey) {
              e.stopPropagation(); // a pure move: the studio's stage does not turn either
              return;
            }
          }
          if (studio) return; // the studio's stage turns it
          drag.current.active = true;
          last.current = e.clientX;
        }}
        onPointerMove={(e) => {
          if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const h = e.currentTarget.clientHeight;
          if (pinch.current && pointers.current.size === 2) {
            e.stopPropagation();
            zoomTo((pinch.current.zoom * spread()) / Math.max(1, pinch.current.dist));
            const m = middle();
            panBy(m.x - pinch.current.mid.x, m.y - pinch.current.mid.y, h);
            pinch.current.mid = m;
            return;
          }
          if (panFrom.current) {
            const { x, y, free } = panFrom.current;
            panBy(free ? e.clientX - x : 0, e.clientY - y, h);
            panFrom.current = { x: e.clientX, y: e.clientY, free };
            if (free) {
              e.stopPropagation();
              return;
            }
          }
          if (!drag.current.active) return;
          drag.current.rot += (e.clientX - last.current) * 0.01;
          last.current = e.clientX;
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          if (pointers.current.size < 2) pinch.current = null;
          panFrom.current = null;
          drag.current.active = false;
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          pinch.current = null;
          panFrom.current = null;
          drag.current.active = false;
        }}
        onDoubleClick={() => zoomTo(view.current.target > 1.05 ? 1 : 2.2)}
        role="img"
        aria-label={`T-shirt porté par ${current.gender === "duo" ? "deux mannequins, homme et femme" : `un mannequin ${current.gender}, look ${current.look.toLowerCase()}`}, taille ${size}. Fais glisser pour le tourner, pince pour zoomer ; zoomé, deux doigts pour te déplacer.`}
      >
        <Safe3D>
          <Canvas dpr={[1, 1.5]} camera={{ position: [0, CAM_Y, CAM_Z], fov: 30 }} gl={{ antialias: true, alpha: true }} onCreated={({ gl }) => colorTrue(gl)}>
            <ambientLight intensity={0.3} />
            <directionalLight position={[2.5, 4, 4]} intensity={1.6} />
            <directionalLight position={[-3, 2, 2]} intensity={0.5} />
            <directionalLight position={[0, 3, -4]} intensity={0.9} />
            <Environment resolution={256}>
              <Lightformer intensity={2} position={[0, 3, 4]} scale={[10, 3, 1]} />
              <Lightformer intensity={0.8} position={[-5, 0, 2]} scale={[3, 8, 1]} />
              <Lightformer intensity={0.8} position={[5, 0, 2]} scale={[3, 8, 1]} />
            </Environment>
            <CameraRig view={view} />
            <Suspense fallback={null}>
              <Figure key={id} id={id} color={color} print={print} size={size} drag={drag} studio={studio} onFocus={onFocus} />
            </Suspense>
          </Canvas>
        </Safe3D>
      </div>
      {/* Zoom buttons (pinch, trackpad pinch and double-click also zoom). */}
      <div className="absolute right-3 top-3 grid gap-1.5">
        {([["+", "Zoomer sur le t-shirt", 1.5], ["−", "Dézoomer", 1 / 1.5]] as const).map(([sign, label, k]) => (
          <button
            key={sign}
            type="button"
            onClick={() => zoomTo(view.current.target * k)}
            disabled={sign === "−" && !zoomed}
            aria-label={label}
            className="grid size-9 place-items-center rounded-full bg-bg/85 text-lg leading-none text-ink shadow-[0_1px_4px_rgba(0,0,0,0.12)] transition-opacity disabled:opacity-35"
          >
            {sign}
          </button>
        ))}
      </div>
      {/* The picker: Homme / Femme / Duo, then that choice's looks. At the bottom, above the hint. */}
      <div className={`absolute inset-x-4 grid justify-items-center gap-2 bottom-14`}>
        <div className="flex gap-1 rounded-full bg-bg/80 p-0.5 text-[12px]" role="group" aria-label="Mannequin">
          {(["homme", "femme", "duo"] as const).map((g) => (
            <button key={g} type="button" onClick={() => current.gender !== g && setId(MANNEQUINS.find((m) => m.gender === g)!.id)} aria-pressed={current.gender === g} className={`rounded-full px-3 py-1 transition-colors ${current.gender === g ? "bg-ink text-on-ink" : "text-muted hover:text-ink"}`}>
              {g === "homme" ? "Homme" : g === "femme" ? "Femme" : "Duo"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1" role="group" aria-label="Look">
          {MANNEQUINS.filter((m) => m.gender === current.gender).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setId(m.id)}
              aria-pressed={id === m.id}
              className={`whitespace-nowrap border-b pb-0.5 text-[11px] tracking-[0.18em] uppercase transition-colors ${id === m.id ? "border-ink" : "border-transparent text-muted hover:text-ink"}`}
            >
              {m.look}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
