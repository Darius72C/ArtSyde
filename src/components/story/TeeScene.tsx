"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Safe3D } from "@/components/Safe3D";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, Lightformer, Preload } from "@react-three/drei";
import { TEE_COLORS } from "@/lib/data";
import { cubicBezier } from "motion/react";
import { DUR, EASE } from "@/lib/motion";
import { teeState } from "./teeState";
import { SoftShadow } from "./SoftShadow";
import { teeSnapshot, type TeeFace } from "./snapshot";
import { TEE_HEIGHT, TEE_WIDTH, canvasTexture, colorTrue, printMaterial, stickerTexture, tintSheen, useTeeModel } from "./teeModel";

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
  /** Studio mode: live 2D canvases (print areas) projected on the front and back. */
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
  const { viewport } = useThree();
  const { geometry, box, maps } = useTeeModel();
  const studio = Boolean(frontCanvas || backCanvas);
  const print = useMemo(() => {
    const frontTex = frontCanvas ? canvasTexture(frontCanvas) : stickerTexture("front");
    const backTex = backCanvas ? canvasTexture(backCanvas) : stickerTexture("back");
    const { mat, uniforms } = printMaterial(box, frontTex, backTex);
    Object.assign(mat, maps);
    return { mat, uniforms, frontTex, backTex };
  }, [box, maps, frontCanvas, backCanvas]);
  // The frame loop changes the material every frame: it reaches it through a ref, not the memo.
  const live = useRef(print);
  useEffect(() => {
    live.current = print;
    return () => {
      print.mat.dispose();
      print.frontTex.dispose();
      print.backTex.dispose();
    };
  }, [print]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const { mat, uniforms, frontTex, backTex } = live.current;
    if (studio && seen.current !== teeState.texVersion) {
      seen.current = teeState.texVersion;
      frontTex.needsUpdate = true;
      backTex.needsUpdate = true;
    }
    // Frame-rate independent smoothing. dt is capped: after the scene was paused off screen, the first
    // frame can carry seconds of delay, which made the tee snap to its angle in one go.
    const k = 1 - Math.exp(-Math.min(dt, 0.05) * 6);
    // Fit the tee to the visible width and height (world units, with room for the float),
    // so it never overflows nor runs into the copy above it.
    const fit = Math.min(1, (viewport.width * 0.78) / (TEE_WIDTH + 0.4), (viewport.height * 0.86) / (TEE_HEIGHT + 0.2));
    const targetS = teeState.scale * fit;
    g.scale.setScalar(g.scale.x + (targetS - g.scale.x) * k);
    g.rotation.y += (teeState.rotY + teeState.scrollRot + teeState.pointerX * 0.35 * teeState.parallax - g.rotation.y) * k;
    g.rotation.x += (-teeState.pointerY * 0.15 * teeState.parallax - g.rotation.x) * k;
    if (teeState.hex) mat.color.lerp(tmpTarget.set(teeState.hex), k);
    else colorAt(teeState.colorT, mat.color);
    tintSheen(mat);
    uniforms.uFrontOpacity.value = studio ? 1 : teeState.design;

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

  return (
    <group ref={group} name="tee-pose">
      <group ref={lift}>
        <Float speed={1} rotationIntensity={0.04} floatIntensity={studio ? 0.1 : 0.25}>
          <mesh geometry={geometry} material={print.mat} castShadow />
        </Float>
      </group>
    </group>
  );
}

/**
 * Studio only: lets the page render the scene at a chosen width (the views in the download).
 * The canvas keeps its size on the page; only the drawing buffer is enlarged for one frame, then
 * put back. With `face`, the tee is posed straight on for that frame (no turn, tilt, float or
 * entrance), front or back, then put back exactly as it was.
 */
function SnapshotBridge() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    teeSnapshot.current = (width, face?: TeeFace) => {
      const { gl, scene, camera, size } = get();
      // Straight pose: remember every transform under the tee, zero the motion, restore after the frame.
      const pose = face ? scene.getObjectByName("tee-pose") : undefined;
      const saved: [THREE.Object3D, THREE.Vector3, THREE.Euler, THREE.Vector3][] = [];
      pose?.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) return;
        saved.push([o, o.position.clone(), o.rotation.clone(), o.scale.clone()]);
        if (o === pose) o.rotation.set(0, face === "back" ? Math.PI : 0, 0);
        else {
          o.position.set(0, 0, 0);
          o.rotation.set(0, 0, 0);
          o.scale.setScalar(1);
        }
      });
      const restore = () => saved.forEach(([o, p, r, s]) => (o.position.copy(p), o.rotation.copy(r), o.scale.copy(s)));
      const max = gl.capabilities.maxTextureSize;
      const scale = Math.min(1, max / Math.max(width, (width * size.height) / size.width));
      const w = Math.round(width * scale);
      const h = Math.round(((width * size.height) / size.width) * scale);
      const ratio = gl.getPixelRatio();
      gl.setPixelRatio(1);
      gl.setSize(w, h, false);
      gl.render(scene, camera);
      restore();
      return new Promise<Blob | null>((resolve) => {
        gl.domElement.toBlob(resolve, "image/png"); // the pixels are captured now, encoded afterwards
        gl.setPixelRatio(ratio);
        gl.setSize(size.width, size.height, false);
        gl.render(scene, camera);
      });
    };
    return () => void (teeSnapshot.current = null);
  }, [get]);
  return null;
}

export default function TeeScene(props: Props) {
  const play = useRef<boolean>(false);
  const seenOnScreen = useRef<IntersectionObserver | null>(null);
  // Render only while the canvas is on screen: off screen it costs nothing.
  const [onScreen, setOnScreen] = useState(true);
  const watchOnScreen = useRef<IntersectionObserver | null>(null);
  useEffect(
    () => () => {
      seenOnScreen.current?.disconnect();
      watchOnScreen.current?.disconnect();
    },
    [],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      teeState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      teeState.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <Safe3D>
    <Canvas dpr={[1, 1.5]} frameloop={onScreen ? "always" : "never"} camera={{ position: [0, 0, 6.2], fov: 35 }} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: props.preserve }}
      onCreated={({ gl }) => {
        colorTrue(gl);
        watchOnScreen.current = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
        watchOnScreen.current.observe(gl.domElement);
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
        {/* Rim light from behind: outlines the tee, so dark colours stay readable on a dark page. */}
        <directionalLight position={[-3, 3, -5]} intensity={0.9} />
      {/* Studio lighting built in code (no HDR download) */}
      <Environment resolution={256}>
        <Lightformer intensity={2.2} position={[0, 3, 4]} scale={[10, 3, 1]} />
        <Lightformer intensity={0.9} position={[-5, 0, 2]} scale={[3, 8, 1]} />
        <Lightformer intensity={0.9} position={[5, 0, 2]} scale={[3, 8, 1]} />
      </Environment>
      <SoftShadow y={-TEE_HEIGHT / 2 - 0.25} width={TEE_WIDTH * 1.3} opacity={0.3} />
      {/* The model streams in; the entrance plays once it is there. */}
      <Suspense fallback={null}>
        <Tee {...props} play={play} />
        {/* Once the model is in: compile its shaders and upload its textures now, not on the first
            visible frame (that froze the page for a moment as the tee came on screen). */}
        <Preload all />
      </Suspense>
      {props.preserve && <SnapshotBridge />}
    </Canvas>
    </Safe3D>
  );
}
