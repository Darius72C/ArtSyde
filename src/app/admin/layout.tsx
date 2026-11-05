import type { Metadata } from "next";
import { AdminBar } from "@/components/admin/AdminBar";
import { LiveAdmin } from "@/components/admin/LiveAdmin";

// Behind the admin password (ADMIN_PASSWORD): proxy.ts sends signed-out visitors to
// /connexion/admin, and every read checks the session again (requireAdmin in src/server/admin/auth.ts).
export const metadata: Metadata = {
  title: { default: "Admin — ArtSyde", template: "%s — Admin ArtSyde" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <AdminBar />
      {/* New orders, credit purchases and errors as they happen (src/app/api/live/admin). */}
      <LiveAdmin />
      <main className="min-h-[70svh]">{children}</main>
    </>
  );
}
