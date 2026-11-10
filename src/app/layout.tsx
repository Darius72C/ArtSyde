import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Magnetic } from "@/components/Magnetic";
import { MotionProvider } from "@/components/MotionProvider";
import { Pwa } from "@/components/Pwa";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { SITE_INDEXING, SITE_URL } from "@/lib/site";

const display = Inter_Tight({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"] });
const body = Inter({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "ArtSyde — T-shirts imprimés dans notre atelier",
  description: "Des t-shirts imprimés dans notre atelier. Crée le tien en 3D.",
  robots: SITE_INDEXING ? { index: true, follow: true } : { index: false, follow: false },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
  openGraph: { type: "website", locale: "fr_FR", siteName: "ArtSyde" },
  // The installed app (src/app/manifest.ts): its name and icon on the home screen, iPhone included.
  applicationName: "ArtSyde",
  appleWebApp: { capable: true, title: "ArtSyde", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "48x48" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
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
        <MotionProvider>
          {children}
          <Pwa />
        </MotionProvider>
        <SiteAnalytics />
      </body>
    </html>
  );
}
