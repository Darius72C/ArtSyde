import { ViewTransition } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { WhatsAppButton } from "./WhatsAppButton";

/** Animated page body: the old page sinks and fades, the new one rises in (see globals.css). */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  );
}

/**
 * Shared frame for every page: header, content, footer. Safe in client components (the error page); pages use
 * PageShell, which adds the "all pages" banner above the footer.
 */
export function PageFrame({ children, footer = true, beforeFooter }: { children: React.ReactNode; footer?: boolean; beforeFooter?: React.ReactNode }) {
  return (
    <>
      <Header />
      <PageTransition>
        <div>
          <main className="min-h-[70svh]">{children}</main>
          {footer && beforeFooter}
          {footer && <Footer />}
        </div>
      </PageTransition>
      {/* Full-screen tools (the studio, sign-in) have no footer and no floating button. */}
      {footer && <WhatsAppButton />}
    </>
  );
}
