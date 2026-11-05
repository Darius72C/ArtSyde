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
  const r = await load(() => db.heroCard.findMany({ select: { slot: true, imageUrl: true } }));
  if (r.problem) return <DbNotice problem={r.problem} />;
  const cards = r.data;
  const slots = HERO_SLOTS.map((slot) => {
    const c = cards.find((x) => x.slot === slot);
    return { slot, image: c?.imageUrl ?? null };
  });
  return <HeroCardsEditor slots={slots} configured={r2Config() !== null} />;
}

export default function Page() {
  return (
    <AdminPage>
      <PageTitle eyebrow="Accueil" lines={[{ text: "Les visuels de l'accueil.", muted: "En haut de la page." }]} />
      <Suspense fallback={<Loading />}>
        <HeroCards />
      </Suspense>
    </AdminPage>
  );
}
