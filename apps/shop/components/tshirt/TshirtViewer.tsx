"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, useProgress } from "@react-three/drei";
import { brand } from "@artsyde/ui";
import { TshirtModel } from "./TshirtModel";

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <span className="text-sm text-ghost-white/70">{Math.round(progress)} %</span>
    </Html>
  );
}

type TshirtViewerProps = {
  color: string;
  className?: string;
};

/** Visionneuse 3D : le client peut tourner autour du t-shirt et zoomer. */
export function TshirtViewer({ color, className }: TshirtViewerProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0.1, 3.2], fov: 40 }}
        dpr={[1, 2]}
        shadows
        aria-label="Aperçu 3D du t-shirt"
      >
        {/* Lumière douce générale + lumière principale de face. */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[2.5, 3, 4]} intensity={1.6} castShadow />
        {/* Contre-jour violet : détache les t-shirts sombres du fond noir. */}
        <directionalLight position={[-3, 2, -4]} intensity={2} color={brand.colors.curseViolet} />
        <pointLight position={[0, -2, 2]} intensity={0.4} />

        <Suspense fallback={<Loader />}>
          <TshirtModel color={color} />
        </Suspense>

        <ContactShadows position={[0, -1, 0]} opacity={0.5} scale={4} blur={2.5} far={2} />

        <OrbitControls
          enablePan={false}
          minDistance={2}
          maxDistance={5}
          // Empêche de passer sous le t-shirt ou de le voir pile du dessus.
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.7}
          autoRotate
          autoRotateSpeed={1.2}
        />
      </Canvas>
    </div>
  );
}
