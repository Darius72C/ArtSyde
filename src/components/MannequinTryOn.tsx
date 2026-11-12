"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Safe3D } from "@/components/Safe3D";
import { PRINT_SIDES, type Print3D } from "@/lib/products";
import { canvasTexture, colorTrue } from "./story/teeModel";
import { PRINT_H, PRINT_W, drawPrint, usePrintImages } from "./ProductTee3D";

/*
 * The product worn by a shop mannequin (the "Porté" tab of a product page).
 *
 * Each mannequin is one dressed model (oversized tee, trousers, shoes) made with Meshy, in size L. The tee and
 * the body are found per pixel in a mask texture (red = tee, green = body): the tee takes the product's colour
 * and the prints, the body a matte black. The prints use the site's print area (TEE_ASPECT x tee length) through
 * a second UV set baked with the model (front u 0..1, back u 2..3), so a placement made in the admin's 3D tab
 * lands at the same spot. Other sizes widen or narrow the same model to that size's chest.
 */

export type Mannequin = "homme-baggy" | "homme-parachute" | "homme-assis" | "femme-baggy" | "femme-cargo";
// `y`: where the floor sits in the frame (a seated mannequin is shorter, so it sits higher).
export const MANNEQUINS: { id: Mannequin; label: string; y: number }[] = [
  { id: "homme-baggy", label: "Homme", y: -0.92 },
  { id: "homme-parachute", label: "Homme · parachute", y: -0.92 },
  { id: "homme-assis", label: "Homme · assis", y: -0.78 },
  { id: "femme-baggy", label: "Femme", y: -0.88 },
  { id: "femme-cargo", label: "Femme · cargo", y: -0.88 },
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

function Figure({ id, color, print, size, drag }: { id: Mannequin; color: string; print: Print3D; size: string; drag: React.RefObject<Drag> }) {
  const { scene } = useGLTF(`/models/mannequins/${id}.glb`);
  const mask = useLoader(THREE.TextureLoader, `/models/mannequins/${id}-mask.webp`);
  const images = usePrintImages(print);
  const group = useRef<THREE.Group>(null);

  const look = useMemo(() => {
    Object.assign(mask, { flipY: false, needsUpdate: true }); // the mask follows the model's UVs, as glTF textures do
    const canvases = { front: Object.assign(document.createElement("canvas"), { width: PRINT_W, height: PRINT_H }), back: Object.assign(document.createElement("canvas"), { width: PRINT_W, height: PRINT_H }) };
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
  }, [scene, mask]);
  useEffect(() => () => (look.textures.front.dispose(), look.textures.back.dispose()), [look]);

  useEffect(() => {
    look.uniforms.uTee.value.set(color);
  }, [look, color]);
  useEffect(() => {
    for (const s of PRINT_SIDES) {
      drawPrint(look.canvases[s], print[s] ? images.get(print[s].url) : undefined, print[s]);
      Object.assign(look.textures[s], { needsUpdate: true }); // re-upload the redrawn canvas
    }
  }, [look, print, images]);

  const gender = id.startsWith("homme") ? "homme" : "femme";
  const k = (CHEST[gender][size] ?? CHEST[gender].L) / CHEST[gender].L;

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y += (drag.current.rot - g.rotation.y) * (1 - Math.exp(-dt * 6));
    g.scale.x += (k - g.scale.x) * (1 - Math.exp(-dt * 8));
    g.scale.z = g.scale.x;
  });

  return (
    <group ref={group} position={[0, MANNEQUINS.find((m) => m.id === id)?.y ?? -0.92, 0]}>
      <primitive object={look.root} />
    </group>
  );
}

/** `size`: the size chosen on the product page (the mannequin widens to that size's chest). */
export default function MannequinTryOn({ color, print, size, className = "" }: { color: string; print: Print3D; size: string; className?: string }) {
  const [id, setId] = useState<Mannequin>("homme-baggy");
  const drag = useRef<Drag>({ rot: 0.35, active: false });
  const last = useRef(0);

  return (
    <div className={`relative ${className}`}>
      <div
        className="h-full w-full touch-pan-y cursor-grab select-none active:cursor-grabbing"
        onPointerDown={(e) => {
          drag.current.active = true;
          last.current = e.clientX;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current.active) return;
          drag.current.rot += (e.clientX - last.current) * 0.01;
          last.current = e.clientX;
        }}
        onPointerUp={() => (drag.current.active = false)}
        onPointerCancel={() => (drag.current.active = false)}
        role="img"
        aria-label={`T-shirt porté par un mannequin (${MANNEQUINS.find((m) => m.id === id)?.label}), taille ${size}. Fais glisser pour le tourner.`}
      >
        <Safe3D>
          <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0.02, 4.3], fov: 30 }} gl={{ antialias: true, alpha: true }} onCreated={({ gl }) => colorTrue(gl)}>
            <ambientLight intensity={0.3} />
            <directionalLight position={[2.5, 4, 4]} intensity={1.6} />
            <directionalLight position={[-3, 2, 2]} intensity={0.5} />
            <directionalLight position={[0, 3, -4]} intensity={0.9} />
            <Environment resolution={256}>
              <Lightformer intensity={2} position={[0, 3, 4]} scale={[10, 3, 1]} />
              <Lightformer intensity={0.8} position={[-5, 0, 2]} scale={[3, 8, 1]} />
              <Lightformer intensity={0.8} position={[5, 0, 2]} scale={[3, 8, 1]} />
            </Environment>
            <Suspense fallback={null}>
              <Figure key={id} id={id} color={color} print={print} size={size} drag={drag} />
            </Suspense>
          </Canvas>
        </Safe3D>
      </div>
      <div className="absolute inset-x-4 top-4 flex flex-wrap justify-center gap-x-5 gap-y-2" role="group" aria-label="Mannequin">
        {MANNEQUINS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setId(m.id)}
            aria-pressed={id === m.id}
            className={`whitespace-nowrap border-b pb-1 text-[11px] tracking-[0.18em] uppercase transition-colors ${id === m.id ? "border-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
