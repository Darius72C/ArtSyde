import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { StudioView } from "@/components/pages/StudioView";
import { getStock, getStockColours } from "@/server/stock";

export const metadata: Metadata = { title: "Studio 3D — ArtSyde" };

// Full-screen tool: header but no footer.
export default async function Page() {
  // Blank t-shirts in stock: the studio orders only those (cached, refreshed when the stock changes).
  const [stock, stockColours] = await Promise.all([getStock(), getStockColours()]);
  return (
    <PageShell footer={false}>
      <StudioView stock={stock} stockColours={stockColours} />
    </PageShell>
  );
}
