import { AdSlot } from "@/components/AdSlot";
import { PageFrame } from "./PageFrame";

export { PageTransition } from "./PageFrame";

/** Shared frame for every page: header, content, footer, and a banner set for "all pages" (Admin > Accueil > Bannières) above the footer. */
export function PageShell({ children, footer = true }: { children: React.ReactNode; footer?: boolean }) {
  return (
    <PageFrame footer={footer} beforeFooter={<AdSlot placement="all.beforeFooter" />}>
      {children}
    </PageFrame>
  );
}
