"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Lightformer } from "@react-three/drei";
import { cubicBezier } from "motion/react";
import { DUR, EASE } from "@/lib/motion";
import { TEE_HEIGHT, TEE_WIDTH, colorTrue, emptyTexture, printMaterial, stickerTexture, tintSheen, useTeeModel } from "./teeModel";
import { heroState } from "./heroState";
import { SoftShadow } from "./SoftShadow";

/*
 * The hero's three real tees: white in front with the wordmark, red and navy behind it.
 * x / z in scene units, r: turn (radians), s: scale, d: entrance delay (s),
 * depth: how far it follows the mouse (the front one most, so the stack reads as layered).
 */
const TEES = [
  { color: "#C8102E", print: false, x: -1.75, z: -1.1, r: 0.42, s: 0.86, d: 0.5, depth: 0.45 },
  { color: "#F4F2EC", print: true, x: 0, z: 0, r: 0, s: 1, d: 0.35, depth: 1 },
  { color: "#1F2A44", print: false, x: 1.75, z: -1.1, r: -0.42, s: 0.86, d: 0.6, depth: 0.45 },
] as const;

const settle = cubicBezier(...EASE.out);
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Tees() {
  const { geometry, box, maps } = useTeeModel();
  const looks = useMemo(
    () =>
      TEES.map((t) => {
        const front = t.print ? stickerTexture("front", "#1d1d1f") : emptyTexture();
        const back = emptyTexture();
        const { mat } = printMaterial(box, front, back);
        Object.assign(mat, maps);
        mat.color.set(t.color);
        tintSheen(mat);
        return { mat, front, back };
      }),
    [box, maps],
  );
  useEffect(() => () => looks.forEach((l) => (l.mat.dispose(), l.front.dispose(), l.back.dispose())), [looks]);

  const still = useMemo(() => reducedMotion(), []);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const started = useRef<number | null>(null);
  const pointer = useRef({ x: 0, y: 0 }); // smoothed mouse

  useFrame((state, dt) => {
    const now = state.clock.elapsedTime;
    started.current ??= now;
    const k = 1 - Math.exp(-dt * 4);
    pointer.current.x += (heroState.px - pointer.current.x) * k;
    pointer.current.y += (heroState.py - pointer.current.y) * k;
    const { x: px, y: py } = pointer.current;

    TEES.forEach((t, i) => {
      const g = groups.current[i];
      if (!g) return;
      // Entrance: they rise from below and fan out from the centre, one after the other.
      const p = still ? 1 : Math.min(1, Math.max(0, (now - started.current! - t.d) / DUR.grand));
      const e = settle(p);
      g.position.set(t.x * heroState.spread * e + px * 0.25 * t.depth, -1.4 * (1 - e) - py * 0.12 * t.depth, t.z);
      g.rotation.set(py * 0.08 * t.depth, t.r * e + px * 0.35 * t.depth, 0);
      g.scale.setScalar(t.s * (0.9 + 0.1 * e));
    });
    const first = still ? 1 : Math.min(1, Math.max(0, (now - started.current - TEES[1].d) / DUR.grand));
    state.gl.domElement.style.opacity = String(Math.min(1, first * 2.5));
  });

  return (
    <>
      {TEES.map((t, i) => (
        <group key={t.color} ref={(el) => void (groups.current[i] = el)}>
          <Float speed={1 + i * 0.25} rotationIntensity={still ? 0 : 0.05} floatIntensity={still ? 0 : 0.3}>
            <mesh geometry={geometry} material={looks[i].mat} castShadow />
          </Float>
        </group>
      ))}
    </>
  );
}

export default function HeroTees() {
  const wrap = useRef<HTMLDivElement>(null);
  // Only render while the hero is on screen (the story further down has its own 3D scene).
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas dpr={[1, 1.5]} frameloop={onScreen ? "always" : "never"} camera={{ position: [0, 0, 6.2], fov: 35 }} gl={{ antialias: true, alpha: true }} onCreated={({ gl }) => {
          colorTrue(gl);
          gl.domElement.style.opacity = "0";
        }}>
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 4, 5]} intensity={1.4} />
        {/* Rim light from behind: outlines the tee, so dark colours stay readable on a dark page. */}
        <directionalLight position={[-3, 3, -5]} intensity={0.9} />
        <Environment resolution={256}>
          <Lightformer intensity={2.2} position={[0, 3, 4]} scale={[10, 3, 1]} />
          <Lightformer intensity={0.9} position={[-5, 0, 2]} scale={[3, 8, 1]} />
          <Lightformer intensity={0.9} position={[5, 0, 2]} scale={[3, 8, 1]} />
        </Environment>
        <SoftShadow y={-TEE_HEIGHT / 2 - 0.2} width={TEE_WIDTH * 2.9} depth={TEE_WIDTH * 0.9} opacity={0.35} />
        <Suspense fallback={null}>
          <Tees />
        </Suspense>
      </Canvas>
    </div>
  );
}
