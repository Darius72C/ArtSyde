import type { Metadata } from "next";
import { Suspense } from "react";
import { AdsManager } from "@/components/admin/AdEditor";
import { HeroCardsEditor } from "@/components/admin/HeroCardsEditor";
import { AdminPage, DbNotice, Loading, PageTitle, Panel } from "@/components/admin/ui";
import { ADS_KEY, LEGACY_AD_KEY, mergeAds } from "@/lib/ad";
import { load } from "@/server/admin/queries";
import { db } from "@/server/db";
import { HERO_SLOTS } from "@/server/hero";
import { r2Config } from "@/server/r2";

export const metadata: Metadata = { title: "Accueil" };

async function HomeSettings() {
  const r = await load(() => Promise.all([db.heroCard.findMany({ select: { slot: true, imageUrl: true } }), db.siteSetting.findMany({ where: { key: { in: [ADS_KEY, LEGACY_AD_KEY] } } })]));
  if (r.problem) return <DbNotice problem={r.problem} />;
  const [cards, settings] = r.data;
  const ads = mergeAds(settings.find((s) => s.key === ADS_KEY)?.value, settings.find((s) => s.key === LEGACY_AD_KEY)?.value);
  const slots = HERO_SLOTS.map((slot) => {
    const c = cards.find((x) => x.slot === slot);
    return { slot, image: c?.imageUrl ?? null };
  });
  const configured = r2Config() !== null;
  return (
    <div className="space-y-10">
      <HeroCardsEditor slots={slots} configured={configured} />
      <Panel title="Bannières de pub">
        <p className="-mt-2 mb-8 max-w-2xl text-sm text-muted">Des bandes horizontales, de taille fixe. Pour chacune, choisis où l&apos;afficher : un endroit de l&apos;accueil, les fiches produit, le panier, le studio, les crédits ou toutes les pages. Une bannière n&apos;apparaît que lorsqu&apos;elle est activée.</p>
        <AdsManager ads={ads} configured={configured} />
      </Panel>
    </div>
  );
}

export default function Page() {
  return (
    <AdminPage>
      <PageTitle eyebrow="Accueil" lines={[{ text: "Les visuels de l'accueil.", muted: "Cartes et bannières." }]} />
      <Suspense fallback={<Loading />}>
        <HomeSettings />
      </Suspense>
    </AdminPage>
  );
}
