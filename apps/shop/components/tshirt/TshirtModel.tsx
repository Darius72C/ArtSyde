"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";

const MODEL_URL = "/models/tshirt.glb";

// Le modèle est en centimètres (environ 39 unités de haut) : on le ramène
// à environ 2 unités pour que la caméra et la lumière restent simples.
const SCALE = 0.05;

type TshirtModelProps = {
  color: string;
};

export function TshirtModel({ color }: TshirtModelProps) {
  const { nodes } = useGLTF(MODEL_URL);
  const mesh = nodes["T-Shirt_Material_0"] as Mesh;

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

  return (
    <mesh
      geometry={mesh.geometry}
      material={material}
      scale={SCALE}
      // Le bas du t-shirt est à y = 0 dans le modèle : on le centre verticalement.
      position={[0, -0.95, 0]}
      castShadow
    />
  );
}

useGLTF.preload(MODEL_URL);
