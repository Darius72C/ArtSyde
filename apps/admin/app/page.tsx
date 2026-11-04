import { Logo } from "@artsyde/ui";

const sections = [
  { title: "Commandes", text: "Suivre les commandes, télécharger les designs clients, gérer la livraison." },
  { title: "Catalogue", text: "Ajouter et modifier les t-shirts, leurs prix, tailles et couleurs." },
  { title: "Statistiques", text: "Ventes, revenus et visites de la boutique." },
];

// Tableau de bord provisoire du monitoring. Chaque section deviendra une page.
export default function DashboardPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-10 px-4 py-10">
      <header className="flex items-center justify-between gap-4">
        <Logo size={28} />
        <span className="rounded-md border border-ash-gray px-3 py-1 text-sm text-ghost-white/70">
          Monitoring
        </span>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {sections.map((s) => (
          <article key={s.title} className="rounded-xl border border-ash-gray p-5">
            <h2 className="mb-2 text-lg font-medium">{s.title}</h2>
            <p className="text-sm text-ghost-white/70">{s.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
