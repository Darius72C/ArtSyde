"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Safe3D } from "@/components/Safe3D";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { PRINT_SIDES, type Print3D, type PrintSide } from "@/lib/products";
import { TEE_HEIGHT, TEE_WIDTH, canvasTexture, colorTrue, printMaterial, tintSheen, useTeeModel } from "./story/teeModel";
import { TEE_ASPECT, teePath2D } from "./story/teeOutline";
import { SoftShadow } from "./story/SoftShadow";
import { loadPrint, loadedPrint } from "@/lib/printImages";

/*
 * A product's t-shirt in 3D: the fabric in the chosen colour, with the front and back prints set in
 * the admin's "3D" tab. Drag to turn it. Used by the shop's product page and by the admin editor.
 */

const PRINT_W = 1024;
const PRINT_H = Math.round(PRINT_W / TEE_ASPECT);

/** Draws one side's print on its canvas (transparent outside the image), cut to the tee's silhouette. */
function drawPrint(canvas: HTMLCanvasElement, img: HTMLImageElement | undefined, p: Print3D[PrintSide]) {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, PRINT_W, PRINT_H);
  if (!img || !p || !img.naturalWidth) return;
  ctx.save();
  ctx.clip(teePath2D(PRINT_W, PRINT_H));
  const w = p.w * PRINT_W;
  const h = (w * img.naturalHeight) / img.naturalWidth;
  ctx.drawImage(img, p.x * PRINT_W - w / 2, p.y * PRINT_H - h / 2, w, h);
  ctx.restore();
}

/** The print images, from the page-wide cache (already loading since the product page opened). */
function usePrintImages(print: Print3D) {
  const urls = PRINT_SIDES.map((s) => print[s]?.url).filter((u): u is string => Boolean(u));
  const key = urls.join("|");
  const [images, setImages] = useState<Map<string, HTMLImageElement>>(() => new Map(urls.flatMap((u) => (loadedPrint(u) ? [[u, loadedPrint(u)!]] : []))));
  useEffect(() => {
    // No cancel on re-run: an image already on its way still lands (setState after unmount is a no-op).
    for (const url of key ? key.split("|") : []) {
      loadPrint(url).then((img) => img && setImages((m) => (m.get(url) === img ? m : new Map(m).set(url, img))));
    }
  }, [key]);
  return images;
}

type Drag = { rot: number; active: boolean };

function Tee({ color, print, side, drag }: { color: string; print: Print3D; side: PrintSide; drag: React.RefObject<Drag> }) {
  const { geometry, box, maps } = useTeeModel();
  const group = useRef<THREE.Group>(null);
  const images = usePrintImages(print);

  const look = useMemo(() => {
    const canvases = { front: Object.assign(document.createElement("canvas"), { width: PRINT_W, height: PRINT_H }), back: Object.assign(document.createElement("canvas"), { width: PRINT_W, height: PRINT_H }) };
    const front = canvasTexture(canvases.front);
    const back = canvasTexture(canvases.back);
    const { mat } = printMaterial(box, front, back);
    Object.assign(mat, maps);
    return { mat, canvases, textures: { front, back } };
  }, [box, maps]);
  useEffect(() => () => (look.mat.dispose(), look.textures.front.dispose(), look.textures.back.dispose()), [look]);

  // Fabric colour, then each side's print, redrawn whenever the colour, an image or a placement changes.
  useEffect(() => {
    look.mat.color.set(color);
    tintSheen(look.mat);
  }, [look, color]);
  useEffect(() => {
    for (const s of PRINT_SIDES) {
      drawPrint(look.canvases[s], print[s] ? images.get(print[s].url) : undefined, print[s]);
      Object.assign(look.textures[s], { needsUpdate: true }); // re-upload the redrawn canvas
    }
  }, [look, print, images]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const target = (side === "back" ? Math.PI : 0) + drag.current.rot;
    g.rotation.y += (target - g.rotation.y) * (1 - Math.exp(-dt * 6));
  });

  return (
    <group ref={group}>
      <mesh geometry={geometry} material={look.mat} />
    </group>
  );
}

/**
 * `side`: which side faces the camera (the admin turns it to the side being edited). The customer
 * can always drag to turn it; a new `side` resets the drag.
 */
export default function ProductTee3D({ color, print, side = "front", className = "" }: { color: string; print: Print3D; side?: PrintSide; className?: string }) {
  const drag = useRef<Drag>({ rot: 0, active: false });
  const last = useRef(0);
  useEffect(() => {
    drag.current.rot = 0;
  }, [side]);

  return (
    <div
      className={`touch-pan-y cursor-grab select-none active:cursor-grabbing ${className}`}
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
      aria-label="T-shirt en 3D. Fais glisser pour le tourner."
    >
      <Safe3D>
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 6.2], fov: 35 }} gl={{ antialias: true, alpha: true }} onCreated={({ gl }) => colorTrue(gl)}>
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 4, 5]} intensity={1.4} />
        <directionalLight position={[-3, 3, -5]} intensity={0.9} />
        <Environment resolution={256}>
          <Lightformer intensity={2.2} position={[0, 3, 4]} scale={[10, 3, 1]} />
          <Lightformer intensity={0.9} position={[-5, 0, 2]} scale={[3, 8, 1]} />
          <Lightformer intensity={0.9} position={[5, 0, 2]} scale={[3, 8, 1]} />
        </Environment>
        <SoftShadow y={-TEE_HEIGHT / 2 - 0.2} width={TEE_WIDTH * 1.3} opacity={0.3} />
        <Suspense fallback={null}>
          <Tee color={color} print={print} side={side} drag={drag} />
        </Suspense>
      </Canvas>
      </Safe3D>
    </div>
  );
}
