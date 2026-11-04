"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import { DesignDecal } from "./DesignDecal";
import type { DesignPlacement } from "./design";

const MODEL_URL = "/models/tshirt.glb";

// Le modèle est en centimètres (environ 39 unités de haut) : on le ramène
// à environ 2 unités pour que la caméra et la lumière restent simples.
const SCALE = 0.05;

export type PlacedDesign = { id: string; url: string; placement: DesignPlacement };

type TshirtModelProps = {
  color: string;
  /** Images du client, de la plus basse à la plus haute. */
  designs?: PlacedDesign[];
  /** Face à montrer au client (celle de l'image sélectionnée). */
  focusSide?: DesignPlacement["side"];
};

export function TshirtModel({ color, designs = [], focusSide = "front" }: TshirtModelProps) {
  const { nodes } = useGLTF(MODEL_URL);
  const mesh = nodes["T-Shirt_Material_0"] as Mesh;
  const group = useRef<Group>(null);

  // On clone le matériau d'origine (il garde la texture du tissu) pour
  // pouvoir changer sa couleur sans modifier le modèle mis en cache.
  const material = useMemo(() => {
    const original = mesh.material as MeshStandardMaterial;
    return original.clone();
  }, [mesh]);

  useEffect(() => {
    material.color.set(color);
  }, [material, color]);

  useEffect(() => () => material.dispose(), [material]);

  // Quand le client travaille sur le dos, le t-shirt pivote doucement pour le montrer.
  const targetY = focusSide === "back" ? Math.PI : 0;
  useFrame((_, delta) => {
    if (!group.current) return;
    const r = group.current.rotation;
    r.y += (targetY - r.y) * Math.min(1, delta * 6);
  });

  return (
    <group ref={group}>
      <mesh
        geometry={mesh.geometry}
        material={material}
        scale={SCALE}
        // Le bas du t-shirt est à y = 0 dans le modèle : on le centre verticalement.
        position={[0, -0.95, 0]}
        castShadow
      >
        {designs.map((d, i) => (
          <Suspense key={d.id} fallback={null}>
            <DesignDecal url={d.url} placement={d.placement} layer={i} />
          </Suspense>
        ))}
      </mesh>
    </group>
  );
}

useGLTF.preload(MODEL_URL);
