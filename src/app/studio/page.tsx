import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { StudioView } from "@/components/pages/StudioView";

export const metadata: Metadata = { title: "Studio 3D — ArtSyde" };

// Full-screen tool: header but no footer.
export default function Page() {
  return (
    <>
      <Header />
      <main>
        <StudioView />
      </main>
    </>
  );
}
