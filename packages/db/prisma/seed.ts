/*
 * Remplit la base avec quelques produits de démonstration.
 * Lancer avec : pnpm db:seed
 * Le script peut être relancé sans créer de doublons (upsert par slug).
 * Les visuels de démonstration sont dans apps/shop/public/designs.
 */
import { PrismaClient, Size } from "@prisma/client";

const prisma = new PrismaClient();

const ALL_SIZES = [Size.S, Size.M, Size.L, Size.XL, Size.XXL];

const products = [
  {
    slug: "sceau-gei",
    name: "Sceau 芸",
    description:
      "Le symbole d'ArtSyde : le kanji de l'art dans un cercle violet maudit. Le t-shirt de ceux qui portent la malédiction avec fierté.",
    priceXof: 12000,
    designUrl: "/designs/sceau-gei.png",
    colors: ["#000000", "#3A3A3A", "#0F1E3C", "#23133D"],
  },
  {
    slug: "oeil-maudit",
    name: "Œil maudit",
    description:
      "Un regard qui ne s'oublie pas. Pupille de démon et rayons violets, pour un look seinen assumé.",
    priceXof: 13500,
    designUrl: "/designs/oeil-maudit.png",
    colors: ["#000000", "#FFFFFF", "#E8E8E8", "#46276B"],
  },
  {
    slug: "ju-glitch",
    name: "呪 Glitch",
    description:
      "Le kanji de la malédiction, corrompu par un glitch violet. Pour ceux qui ont déjà signé le pacte.",
    priceXof: 15000,
    designUrl: "/designs/ju-glitch.png",
    colors: ["#000000", "#7C1123", "#004924", "#0E3D84"],
  },
];

async function main() {
  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: { ...p, sizes: ALL_SIZES },
      create: { ...p, sizes: ALL_SIZES },
    });
  }
  console.log(`${products.length} produits de démonstration enregistrés.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
