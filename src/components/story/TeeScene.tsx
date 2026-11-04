"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Lightformer } from "@react-three/drei";
import { TEE_COLORS } from "@/lib/data";
import { teeState } from "./teeState";

/**
 * TEMPORARY procedural t-shirt. Replace with the purchased model:
 *   const { nodes } = useGLTF("/models/tshirt.glb")
 * and keep the same material / colour logic.
 */
function teeGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.38, 1.3);
  s.quadraticCurveTo(0, 0.92, 0.38, 1.3);
  s.lineTo(0.95, 1.18);
  s.lineTo(1.75, 0.55);
  s.lineTo(1.35, 0.1);
  s.lineTo(0.98, 0.4);
  s.lineTo(1.02, -1.22);
  s.quadraticCurveTo(1.03, -1.35, 0.9, -1.35);
  s.lineTo(-0.9, -1.35);
  s.quadraticCurveTo(-1.03, -1.35, -1.02, -1.22);
  s.lineTo(-0.98, 0.4);
  s.lineTo(-1.35, 0.1);
  s.lineTo(-1.75, 0.55);
  s.lineTo(-0.95, 1.18);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.3,
    bevelEnabled: true,
    bevelThickness: 0.18,
    bevelSize: 0.1,
    bevelSegments: 10,
    curveSegments: 32,
  });
  g.center();
  return g;
}

function stickerTexture(kind: "front" | "back") {
  // Minimal demo prints (home page). The studio replaces these with the customer's own canvases.
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const x = c.getContext("2d")!;
  const serif = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "serif";
  x.fillStyle = "#efe9df";
  x.textAlign = "center";
  x.textBaseline = "middle";
  if (kind === "front") {
    x.font = `400 92px ${serif}`;
    if ("letterSpacing" in x) (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "28px";
    x.fillText("ARTSYDE", 512, 470);
    x.fillRect(452, 560, 120, 3);
  } else {
    x.font = `italic 300 190px ${serif}`;
    x.fillText("Atelier", 512, 480);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}


const tmpA = new THREE.Color();
const tmpTarget = new THREE.Color();
const tmpB = new THREE.Color();
function colorAt(t: number, out: THREE.Color) {
  const n = TEE_COLORS.length;
  const i = Math.floor(t);
  const f = t - i;
  tmpA.set(TEE_COLORS[((i % n) + n) % n].hex);
  tmpB.set(TEE_COLORS[(((i + 1) % n) + n) % n].hex);
  // smoothstep for a softer blend
  return out.lerpColors(tmpA, tmpB, f * f * (3 - 2 * f));
}

type Props = {
  /** Studio mode: live 2D canvases (print areas) mapped on the front and back. */
  front?: HTMLCanvasElement | null;
  back?: HTMLCanvasElement | null;
  /** Keep the WebGL buffer so the studio can take a snapshot for the cart. */
  preserve?: boolean;
};

// Print areas on the tee (world units, ratio 0.7 ≈ A3 portrait).
const PRINT = { w: 1.2, h: 1.7, y: -0.12 };

function Tee({ front: frontCanvas, back: backCanvas }: Props) {
  const seen = useRef(-1);
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshPhysicalMaterial>(null);
  const front = useRef<THREE.MeshBasicMaterial>(null);
  const backMat = useRef<THREE.MeshBasicMaterial>(null);
  const { viewport } = useThree();
  const geometry = useMemo(() => teeGeometry(), []);
  const studio = Boolean(frontCanvas || backCanvas);
  const frontTex = useMemo(() => {
    if (!frontCanvas) return stickerTexture("front");
    const t = new THREE.CanvasTexture(frontCanvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [frontCanvas]);
  const backTex = useMemo(() => {
    if (!backCanvas) return stickerTexture("back");
    const t = new THREE.CanvasTexture(backCanvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [backCanvas]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g || !mat.current || !front.current) return;
    if (studio && seen.current !== teeState.texVersion) {
      seen.current = teeState.texVersion;
      if (front.current.map) front.current.map.needsUpdate = true;
      if (backMat.current?.map) backMat.current.map.needsUpdate = true;
    }
    const k = 1 - Math.exp(-dt * 6); // frame-rate independent smoothing
    // Fit the tee to the visible width (world units), so it never overflows.
    // Also fit the height (tee ≈ 3 units tall incl. float) so it never runs into the copy above it.
    const fit = Math.min(1, (viewport.width * 0.78) / 3.5, (viewport.height * 0.86) / 3);
    const targetS = teeState.scale * fit;
    g.scale.setScalar(g.scale.x + (targetS - g.scale.x) * k);
    g.rotation.y += (teeState.rotY + teeState.scrollRot + teeState.pointerX * 0.35 * teeState.parallax - g.rotation.y) * k;
    g.rotation.x += (-teeState.pointerY * 0.15 * teeState.parallax - g.rotation.x) * k;
    if (teeState.hex) mat.current.color.lerp(tmpTarget.set(teeState.hex), k);
    else colorAt(teeState.colorT, mat.current.color);
    front.current.opacity = studio ? 1 : teeState.design;
  });

  const frontSize: [number, number] = studio ? [PRINT.w, PRINT.h] : [1.15, 1.15];
  const backSize: [number, number] = studio ? [PRINT.w, PRINT.h] : [1.3, 1.3];

  return (
    <group ref={group}>
      <Float speed={1} rotationIntensity={0.04} floatIntensity={studio ? 0.1 : 0.25}>
        {/* Fabric look: rough cotton with a soft sheen */}
        <mesh geometry={geometry} castShadow>
          <meshPhysicalMaterial ref={mat} roughness={0.9} metalness={0} sheen={0.5} sheenRoughness={0.8} sheenColor="#bbbbbb" envMapIntensity={0.55} />
        </mesh>
        <mesh position={[0, studio ? PRINT.y : 0.12, 0.336]}>
          <planeGeometry args={frontSize} />
          <meshBasicMaterial ref={front} map={frontTex} transparent opacity={0} toneMapped={false} />
        </mesh>
        <mesh position={[0, studio ? PRINT.y : 0.1, -0.336]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={backSize} />
          <meshBasicMaterial ref={backMat} map={backTex} transparent toneMapped={false} />
        </mesh>
      </Float>
    </group>
  );
}

export default function TeeScene(props: Props) {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      teeState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      teeState.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 6.2], fov: 35 }} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: props.preserve }}>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      {/* Studio lighting built in code (no HDR download) */}
      <Environment resolution={256}>
        <Lightformer intensity={2.2} position={[0, 3, 4]} scale={[10, 3, 1]} />
        <Lightformer intensity={0.9} position={[-5, 0, 2]} scale={[3, 8, 1]} />
        <Lightformer intensity={0.9} position={[5, 0, 2]} scale={[3, 8, 1]} />
      </Environment>
      <ContactShadows position={[0, -1.85, 0]} opacity={0.3} scale={7} blur={2.8} far={3} />
      <Tee {...props} />
    </Canvas>
  );
}
