import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Magnetic } from "@/components/Magnetic";
import { MotionProvider } from "@/components/MotionProvider";

const display = Inter_Tight({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"] });
const body = Inter({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "ArtSyde — T-shirts imprimés dans notre atelier",
  description: "Des t-shirts imprimés dans notre atelier. Crée le tien en 3D.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`}>
      <body className="font-sans">
        <Suspense fallback={null}>
          <SmoothScroll />
        </Suspense>
        <Magnetic />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
