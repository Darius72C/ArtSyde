import type { Metadata } from "next";
import { brand } from "@artsyde/ui";
import { SiteHeader } from "@/components/SiteHeader";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${brand.name} — ${brand.slogan}`, template: `%s · ${brand.name}` },
  description: "T-shirts personnalisés de style manga. Wear the curse.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={fontVariables}>
      <body className="flex min-h-dvh flex-col antialiased">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-ash-gray px-4 py-6 text-center text-xs text-ghost-white/50">
          <p>© {new Date().getFullYear()} {brand.name}. {brand.slogan}.</p>
          {/* Attribution exigée par la licence CC BY 4.0 du modèle 3D. */}
          <p className="mt-1">
            Modèle 3D{" "}
            <a
              href="https://sketchfab.com/3d-models/t-shirt-low-poly-3e4b13a502884acfbd79cee0f9cd8876"
              className="underline hover:text-curse-violet"
              target="_blank"
              rel="noopener noreferrer"
            >
              « T-Shirt Low Poly »
            </a>{" "}
            par Chirag.Vijay, sous licence{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              className="underline hover:text-curse-violet"
              target="_blank"
              rel="noopener noreferrer"
            >
              CC BY 4.0
            </a>
            .
          </p>
        </footer>
      </body>
    </html>
  );
}
