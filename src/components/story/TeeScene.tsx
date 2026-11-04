"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Lightformer } from "@react-three/drei";
import { TEE_COLORS } from "@/lib/data";
import { cubicBezier } from "motion/react";
import { DUR, EASE } from "@/lib/motion";
import { teeState } from "./teeState";
import { TEE_BOUNDS, TEE_OUTLINE } from "./teeOutline";

/**
 * TEMPORARY procedural t-shirt. Replace with the purchased model:
 *   const { nodes } = useGLTF("/models/tshirt.glb")
 * and keep the same material / colour logic.
 */
function teeShape() {
  const s = new THREE.Shape();
  for (const c of TEE_OUTLINE) {
    if (c[0] === "Q") s.quadraticCurveTo(c[1], c[2], c[3], c[4]);
    else if (c[0] === "M") s.moveTo(c[1], c[2]);
    else s.lineTo(c[1], c[2]);
  }
  s.closePath();
  return s;
}

function teeGeometry() {
  const shape = teeShape();
  const body = new THREE.ExtrudeGeometry(shape, {
    depth: 0.3,
    bevelEnabled: true,
    bevelThickness: 0.18,
    bevelSize: 0.1,
    bevelSegments: 10,
    curveSegments: 32,
  });
  body.computeBoundingBox();
  const offset = body.boundingBox!.getCenter(new THREE.Vector3()).negate();
  body.translate(offset.x, offset.y, offset.z);

  // Print surface (studio): the flat silhouette laid on the front / back face, so a design can go
  // anywhere on the tee, sleeves included. UVs span TEE_BOUNDS, the same rectangle as the print canvas.
  const print = new THREE.ShapeGeometry(shape, 32);
  const pos = print.attributes.position;
  const uv = print.attributes.uv;
  const { minX, maxX, minY, maxY } = TEE_BOUNDS;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - minX) / (maxX - minX), (pos.getY(i) - minY) / (maxY - minY));
  print.translate(offset.x, offset.y, 0);

  // The flat front face of the extrusion (the back one is its mirror).
  return { body, print, face: body.boundingBox!.max.z };
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

/** Set to true once the canvas is on screen: the entrance waits for it. */
type Play = { current: boolean };

// Entrance: the tee starts lower, smaller and turned away, then settles into place.
const INTRO = { s: DUR.grand, scale: 0.35, turn: -1.4, drop: -0.6 };
const settle = cubicBezier(...EASE.out);
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Tee({ front: frontCanvas, back: backCanvas, play }: Props & { play: Play }) {
  const seen = useRef(-1);
  const group = useRef<THREE.Group>(null);
  const lift = useRef<THREE.Group>(null);
  const intro = useRef(reducedMotion() ? 1 : 0); // 0 → 1 over INTRO.s
  const mat = useRef<THREE.MeshPhysicalMaterial>(null);
  const front = useRef<THREE.MeshBasicMaterial>(null);
  const backMat = useRef<THREE.MeshBasicMaterial>(null);
  const { viewport } = useThree();
  const { body, print, face } = useMemo(() => teeGeometry(), []);
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

  useFrame((state, dt) => {
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

    // Entrance, on its own inner group so it never fights the scroll / pointer values above.
    const l = lift.current;
    if (l && intro.current < 1) {
      // dt is capped so the first frame (shader compile) can't skip the entrance; 0.1 s keeps slow devices on time.
      if (play.current) intro.current = Math.min(1, intro.current + Math.min(dt, 0.1) / INTRO.s);
      const off = 1 - settle(intro.current);
      l.scale.setScalar(1 - INTRO.scale * off);
      l.rotation.y = INTRO.turn * off;
      l.position.y = INTRO.drop * off;
      state.gl.domElement.style.opacity = String(Math.min(1, intro.current * 2.5));
    }
  });

  const lift3 = face + 0.003; // just above the fabric, so the print never flickers into it

  return (
    <group ref={group}>
      <group ref={lift}>
      <Float speed={1} rotationIntensity={0.04} floatIntensity={studio ? 0.1 : 0.25}>
        {/* Fabric look: rough cotton with a soft sheen */}
        <mesh geometry={body} castShadow>
          <meshPhysicalMaterial ref={mat} roughness={0.9} metalness={0} sheen={0.5} sheenRoughness={0.8} sheenColor="#bbbbbb" envMapIntensity={0.55} />
        </mesh>
        {studio ? (
          <>
            {/* Studio: the customer's canvases cover the whole front and the whole back. */}
            <mesh geometry={print} position={[0, 0, lift3]}>
              <meshBasicMaterial ref={front} map={frontTex} transparent toneMapped={false} />
            </mesh>
            <mesh geometry={print} position={[0, 0, -lift3]} rotation={[0, Math.PI, 0]}>
              <meshBasicMaterial ref={backMat} map={backTex} transparent toneMapped={false} />
            </mesh>
          </>
        ) : (
          <>
            {/* Home page: small demo prints. */}
            <mesh position={[0, 0.12, lift3]}>
              <planeGeometry args={[1.15, 1.15]} />
              <meshBasicMaterial ref={front} map={frontTex} transparent opacity={0} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.1, -lift3]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[1.3, 1.3]} />
              <meshBasicMaterial ref={backMat} map={backTex} transparent toneMapped={false} />
            </mesh>
          </>
        )}
      </Float>
      </group>
    </group>
  );
}

export default function TeeScene(props: Props) {
  const play = useRef<boolean>(false);
  const seenOnScreen = useRef<IntersectionObserver | null>(null);
  useEffect(() => () => seenOnScreen.current?.disconnect(), []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      teeState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      teeState.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 6.2], fov: 35 }} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: props.preserve }}
      onCreated={({ gl }) => {
        // Start the entrance when a third of the canvas is visible (the home story sits below the fold).
        seenOnScreen.current = new IntersectionObserver(
          ([e]) => {
            if (!e.isIntersecting) return;
            play.current = true;
            seenOnScreen.current?.disconnect();
          },
          { threshold: 0.33 },
        );
        seenOnScreen.current.observe(gl.domElement);
      }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      {/* Studio lighting built in code (no HDR download) */}
      <Environment resolution={256}>
        <Lightformer intensity={2.2} position={[0, 3, 4]} scale={[10, 3, 1]} />
        <Lightformer intensity={0.9} position={[-5, 0, 2]} scale={[3, 8, 1]} />
        <Lightformer intensity={0.9} position={[5, 0, 2]} scale={[3, 8, 1]} />
      </Environment>
      <ContactShadows position={[0, -1.85, 0]} opacity={0.3} scale={7} blur={2.8} far={3} />
      <Tee {...props} play={play} />
    </Canvas>
  );
}
