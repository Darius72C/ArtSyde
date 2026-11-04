"use client";

import { useEffect } from "react";
import { PageShell } from "@/components/PageShell";
import { ErrorScreen } from "@/components/pages/ErrorScreen";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <PageShell>
      <ErrorScreen code="500" title="Un souci de notre côté." text="Réessaie dans un instant. Si ça continue, écris-nous." onRetry={reset} />
    </PageShell>
  );
}
