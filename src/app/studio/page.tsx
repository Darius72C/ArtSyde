import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { StudioView } from "@/components/pages/StudioView";

export const metadata: Metadata = { title: "Studio 3D — ArtSyde" };

// Full-screen tool: header but no footer.
export default function Page() {
  return (
    <PageShell footer={false}>
      <StudioView />
    </PageShell>
  );
}
