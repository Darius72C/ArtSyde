import type { Metadata } from "next";
import { brand } from "@artsyde/ui";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${brand.name} — ${brand.slogan}`, template: `%s · ${brand.name}` },
  description: "T-shirts personnalisés de style manga. Wear the curse.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={fontVariables}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
