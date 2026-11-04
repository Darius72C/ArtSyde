"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, View } from "@react-three/drei";
import type { Group } from "three";
import { brand } from "@artsyde/ui";
import { PRODUCT_PLACEMENT } from "./design";
import { TshirtModel } from "./TshirtModel";

const IDLE_SPEED = 0.35; // radians par seconde
const HOVER_SPEED = 1.6;

function Spinner({
  children,
  hovered,
  reducedMotion,
}: {
  children: React.ReactNode;
  hovered: boolean;
  reducedMotion: boolean;
}) {
  const group = useRef<Group>(null);
  const speed = useRef(IDLE_SPEED);

  useFrame((_, delta) => {
    if (!group.current || reducedMotion) return;
    // La vitesse change en douceur quand la souris entre ou sort de la carte.
    const target = hovered ? HOVER_SPEED : IDLE_SPEED;
    speed.current += (target - speed.current) * Math.min(1, delta * 4);
    group.current.rotation.y += speed.current * delta;
  });

  return (
    // Légère rotation de départ : on voit le design et un peu du volume.
    <group ref={group} rotation={[0, -0.35, 0]}>
      {children}
    </group>
  );
}

type TshirtTurntableProps = {
  color: string;
  designUrl: string;
  /** Accélère la rotation, par exemple au survol de la carte. */
  hovered?: boolean;
  className?: string;
};

/**
 * T-shirt 3D qui tourne lentement sur lui-même, pour les cartes du catalogue.
 * Il est dessiné dans le canvas partagé (SceneCanvas), dans le rectangle de ce composant.
 */
export function TshirtTurntable({ color, designUrl, hovered = false, className }: TshirtTurntableProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <View className={className}>
      <PerspectiveCamera makeDefault position={[0, 0.05, 2.9]} fov={40} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[2.5, 3, 4]} intensity={1.6} />
      <directionalLight position={[-3, 2, -4]} intensity={2} color={brand.colors.curseViolet} />
      <Suspense fallback={null}>
        <Spinner hovered={hovered} reducedMotion={reducedMotion}>
          <TshirtModel
            color={color}
            designs={[{ id: designUrl, url: designUrl, placement: PRODUCT_PLACEMENT }]}
          />
        </Spinner>
      </Suspense>
    </View>
  );
}
