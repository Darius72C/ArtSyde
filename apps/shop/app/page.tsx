import { brand, Logo } from "@artsyde/ui";

// Page d'accueil provisoire : elle sert à vérifier que le thème, les polices
// et le package UI partagé fonctionnent. Elle sera remplacée par la vraie boutique.
export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo size={48} />
      <p className="font-display text-2xl text-curse-violet">{brand.slogan}</p>
      <p className="max-w-md text-ghost-white/70">
        T-shirts personnalisés de style manga. La boutique arrive bientôt.
      </p>
    </main>
  );
}
