import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "../globals.css";
import { body, display } from "../fonts";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Magnetic } from "@/components/Magnetic";
import { MotionProvider } from "@/components/MotionProvider";
import { Pwa } from "@/components/Pwa";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { SITE_INDEXING, SITE_URL } from "@/lib/site";
import { I18nProvider } from "@/components/I18nProvider";
import { LOCALES, makeT } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = makeT(locale);
  return {
  metadataBase: new URL(SITE_URL),
  title: t("ArtSyde — T-shirts imprimés dans notre atelier"),
  description: t("Des t-shirts imprimés dans notre atelier. Crée le tien en 3D."),
  robots: SITE_INDEXING ? { index: true, follow: true } : { index: false, follow: false },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
  openGraph: { type: "website", locale: locale === "en" ? "en_GB" : "fr_FR", siteName: "ArtSyde" },
  // The installed app (src/app/manifest.ts): its name and icon on the home screen, iPhone included.
  applicationName: "ArtSyde",
  appleWebApp: { capable: true, title: "ArtSyde", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "48x48" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  };
}

// The two languages of the site: French at / (rewritten to /fr by src/proxy.ts), English at /en.
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${display.variable} ${body.variable}`}>
      <body className="font-sans">
        <Suspense fallback={null}>
          <SmoothScroll />
        </Suspense>
        <Magnetic />
        <I18nProvider locale={locale}>
          <MotionProvider>
            {children}
            <Pwa />
          </MotionProvider>
        </I18nProvider>
        <SiteAnalytics />
      </body>
    </html>
  );
}
