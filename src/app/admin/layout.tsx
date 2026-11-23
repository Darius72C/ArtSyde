import type { Metadata } from "next";
import "../globals.css";
import { body, display } from "../fonts";
import { MotionProvider } from "@/components/MotionProvider";
import { I18nProvider } from "@/components/I18nProvider";
import { AdminBar } from "@/components/admin/AdminBar";
import { LiveAdmin } from "@/components/admin/LiveAdmin";

// Behind the admin password (ADMIN_PASSWORD): proxy.ts sends signed-out visitors to
// /connexion/admin, and every read checks the session again (requireAdmin in src/server/admin/auth.ts).
export const metadata: Metadata = {
  title: { default: "Admin — ArtSyde", template: "%s — Admin ArtSyde" },
  robots: { index: false, follow: false },
};

// The admin's own root layout (the site's is src/app/[lang]/layout.tsx): in French only.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`}>
      <body className="font-sans">
        <I18nProvider locale="fr">
          <MotionProvider>
            <AdminBar />
            {/* New orders, credit purchases and errors as they happen (src/app/api/live/admin). */}
            <LiveAdmin />
            <main className="min-h-[70svh]">{children}</main>
          </MotionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
