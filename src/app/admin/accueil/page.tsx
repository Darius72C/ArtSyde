import type { Metadata } from "next";
import { Suspense } from "react";
import { HeroCardsEditor } from "@/components/admin/HeroCardsEditor";
import { AdminPage, DbNotice, Loading, PageTitle } from "@/components/admin/ui";
import { load } from "@/server/admin/queries";
import { db } from "@/server/db";
import { HERO_SLOTS } from "@/server/hero";
import { r2Config } from "@/server/r2";

export const metadata: Metadata = { title: "Accueil" };

async function HeroCards() {
  const r = await load(() =>
    Promise.all([
      db.heroCard.findMany(),
      db.product.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, active: true } }),
    ]),
  );
  if (r.problem) return <DbNotice problem={r.problem} />;
  const [cards, products] = r.data;
  const slots = HERO_SLOTS.map((slot) => {
    const c = cards.find((x) => x.slot === slot);
    return { slot, image: c?.imageUrl ?? null, productId: c?.productId ?? null };
  });
  return <HeroCardsEditor slots={slots} products={products} configured={r2Config() !== null} />;
}

export default function Page() {
  return (
    <AdminPage>
      <PageTitle eyebrow="Accueil" lines={[{ text: "Les cartes de l'accueil.", muted: "En haut de la page." }]} />
      <Suspense fallback={<Loading />}>
        <HeroCards />
      </Suspense>
    </AdminPage>
  );
}
