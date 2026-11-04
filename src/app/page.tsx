import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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

export default function Home() {
  return (
    <>
      <Header />
      <PageTransition>
      <div>
      <main>
        <Hero />
        <ScrollStory />
        <NewArrivals />
        <Bento />
        <Shop />
        <Teams />
        <Credits />
        <Faq />
        <Newsletter />
      </main>
      <Footer />
      </div>
      </PageTransition>
    </>
  );
}
