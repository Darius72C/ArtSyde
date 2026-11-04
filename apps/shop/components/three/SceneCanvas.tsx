"use client";

import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";

/**
 * Un seul canvas WebGL pour toute la page, posé par-dessus le contenu.
 * Chaque <View> (une carte du catalogue, par exemple) y dessine sa propre
 * scène dans le rectangle de son élément HTML. Les navigateurs limitent le
 * nombre de canvas 3D par page (environ 16) : cette technique évite la limite
 * et ne charge le modèle du t-shirt qu'une seule fois.
 *
 * Il ne capte aucun clic (pointer-events: none), donc les liens restent cliquables.
 * Son z-index le place sous l'en-tête collant, pour que les t-shirts passent dessous.
 */
export function SceneCanvas() {
  return (
    <Canvas
      className="pointer-events-none"
      style={{ position: "fixed", inset: 0, zIndex: 5, pointerEvents: "none" }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      aria-hidden="true"
    >
      <View.Port />
    </Canvas>
  );
}
