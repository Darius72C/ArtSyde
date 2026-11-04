import type { Metadata } from "next";
import { brand } from "@artsyde/ui";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `Monitoring — ${brand.name}`, template: `%s · Monitoring ${brand.name}` },
  // L'app de monitoring est privée : on demande aux moteurs de ne pas l'indexer.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={fontVariables}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
