import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { PageTransition } from "@/components/PageShell";
import { Hero } from "@/components/home/Hero";
import { ScrollStory } from "@/components/home/ScrollStory";
import { NewArrivals } from "@/components/home/NewArrivals";
import { Bento } from "@/components/home/Bento";
import { Shop } from "@/components/home/Shop";
import { Teams } from "@/components/home/Teams";
import { Credits } from "@/components/home/Credits";
import { Faq } from "@/components/home/Faq";
import { Newsletter } from "@/components/home/Newsletter";
import { getCatalog } from "@/server/catalog";
import { getHeroCards } from "@/server/hero";

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
        <ScrollStory />
        <NewArrivals products={products} />
        <Bento />
        <Shop products={products} />
        <Teams />
        <Credits />
        <Faq />
        <Newsletter />
      </main>
      <Footer />
      </div>
      </PageTransition>
      <WhatsAppButton />
    </>
  );
}
