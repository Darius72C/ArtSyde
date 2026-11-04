import type { Metadata } from "next";
import { TshirtStudio } from "@/components/tshirt/TshirtStudio";

export const metadata: Metadata = {
  title: "Personnaliser",
  description: "Crée ton t-shirt avec tes propres images, en 3D.",
};

export default function PersonnaliserPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-10 text-center">
      <header className="flex flex-col items-center gap-2">
        <h1 className="font-display text-4xl">Crée ton t-shirt</h1>
        <p className="max-w-lg text-ghost-white/70">
          Envoie tes images, place-les sur le devant ou le dos, choisis ta couleur. Fais tourner
          le t-shirt pour voir le résultat sous tous les angles.
        </p>
      </header>
      <TshirtStudio />
    </main>
  );
}
