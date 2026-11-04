import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { LoginView } from "@/components/pages/LoginView";

export const metadata: Metadata = { title: "Connexion — ArtSyde" };

export default function Page() {
  return (
    <PageShell footer={false}>
      <LoginView />
    </PageShell>
  );
}
