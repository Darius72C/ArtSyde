import { brand, Logo } from "@artsyde/ui";
import { TshirtStudio } from "@/components/tshirt/TshirtStudio";

// Page d'accueil provisoire : elle présente le t-shirt 3D avec le choix de couleur.
// Elle sera remplacée par la vraie boutique (catalogue, configurateur, panier).
export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center gap-8 px-4 py-10 text-center">
      <header className="flex flex-col items-center gap-3">
        <Logo size={40} />
        <p className="font-display text-xl text-curse-violet">{brand.slogan}</p>
      </header>

      <TshirtStudio />

      <p className="max-w-md text-sm text-ghost-white/60">
        Fais tourner le t-shirt avec la souris ou le doigt, et zoome pour voir les détails.
      </p>
    </main>
  );
}
