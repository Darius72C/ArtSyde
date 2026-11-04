"use client";

import { useEffect } from "react";
import { Decal, useTexture } from "@react-three/drei";
import { SRGBColorSpace } from "three";
import type { DesignPlacement } from "./design";

// Le décalque est projeté dans une "boîte". Ces centres et cette profondeur
// garantissent qu'il touche une seule face : le devant (z ≈ +4 à +6) ou le dos (z ≈ -7 à -8).
const FRONT_Z = 1;
const BACK_Z = -3.5;
const PROJECTION_DEPTH = 12;

type DesignDecalProps = {
  url: string;
  placement: DesignPlacement;
};

/** Image du client projetée sur le t-shirt. Doit être un enfant du <mesh> du t-shirt. */
export function DesignDecal({ url, placement }: DesignDecalProps) {
  const texture = useTexture(url);

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);

  const image = texture.image as { width: number; height: number } | undefined;
  const aspect = image && image.width > 0 ? image.height / image.width : 1;

  const isBack = placement.side === "back";
  // Vu de dos, la gauche et la droite sont inversées : on inverse x pour que
  // « vers la droite » reste vers la droite à l'écran.
  const x = isBack ? -placement.x : placement.x;
  const rotationZ = (placement.rotation * Math.PI) / 180;

  return (
    <Decal
      position={[x, placement.y, isBack ? BACK_Z : FRONT_Z]}
      rotation={[0, isBack ? Math.PI : 0, rotationZ]}
      scale={[placement.width, placement.width * aspect, PROJECTION_DEPTH]}
    >
      <meshStandardMaterial
        map={texture}
        transparent
        roughness={0.9}
        polygonOffset
        polygonOffsetFactor={-10}
        depthWrite={false}
      />
    </Decal>
  );
}
