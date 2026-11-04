"use client";

import { useMemo } from "react";
import * as THREE from "three";

/**
 * A soft oval shadow on the floor under a tee: one textured plane, drawn once.
 * Replaces drei's ContactShadows, which re-rendered the whole scene twice (plus a blur) every
 * frame — the main GPU cost of the tee scenes — for a shadow that barely changes.
 */
export function SoftShadow({ y, width, depth = width * 0.42, opacity = 0.32 }: { y: number; width: number; depth?: number; opacity?: number }) {
  const texture = useMemo(() => {
    const c = Object.assign(document.createElement("canvas"), { width: 128, height: 128 });
    const x = c.getContext("2d")!;
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(0.45, "rgba(0,0,0,0.55)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);

  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
