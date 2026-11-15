import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { PageTransition } from "@/components/PageShell";
import { Hero } from "@/components/home/Hero";
import { NewArrivals } from "@/components/home/NewArrivals";
import { Bento } from "@/components/home/Bento";
import { Shop } from "@/components/home/Shop";
import { Teams } from "@/components/home/Teams";
import { Credits } from "@/components/home/Credits";
import { Faq } from "@/components/home/Faq";
import { Newsletter } from "@/components/home/Newsletter";
import { getCatalog } from "@/server/catalog";
import { getHeroCards } from "@/server/hero";
import { StockWatch } from "@/components/StockWatch";
import { AdSlot } from "@/components/AdSlot";

export default async function Home() {
  // Cached ("use cache", tag "catalog"): saving a product in the admin refreshes it.
  const [products, heroCards] = await Promise.all([getCatalog(), getHeroCards()]);
  return (
    <>
      <Header />
      <PageTransition>
      <div>
      <main>
        <Hero products={products} cards={heroCards} />
        {/* Banner places (Admin > Accueil > Bannières): each shows nothing unless a banner is set for it. */}
        <AdSlot placement="home.afterHero" />
        {/* The shop right after the hero: visitors who scrolled past the 3D story left before seeing the products. */}
        <Shop products={products} />
        <AdSlot placement="home.afterShop" />
        <StockWatch />
        <NewArrivals products={products} />
        <AdSlot placement="home.afterNew" />
        <Bento />
        <AdSlot placement="home.afterWhy" />
        <Teams />
        <Credits />
        <AdSlot placement="home.beforeFaq" />
        <Faq />
        <Newsletter />
      </main>
      <AdSlot placement="all.beforeFooter" />
      <Footer />
      </div>
      </PageTransition>
      <WhatsAppButton />
    </>
  );
}
