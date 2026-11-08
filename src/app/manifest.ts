import type { MetadataRoute } from "next";

/** The web app manifest (/manifest.webmanifest): ArtSyde installs as an app on phones and computers. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ArtSyde — T-shirts imprimés dans notre atelier",
    short_name: "ArtSyde",
    description: "Des t-shirts imprimés dans notre atelier à Abidjan. Choisis un modèle, ou crée le tien en 3D.",
    lang: "fr",
    dir: "ltr",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Studio 3D", short_name: "Studio", description: "Crée ton t-shirt en 3D", url: "/studio?source=app", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Boutique", url: "/?source=app#boutique", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Mon compte", url: "/compte?source=app", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Suivre ma commande", short_name: "Suivi", url: "/suivi?source=app", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
