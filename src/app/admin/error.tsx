"use client";

import { useEffect } from "react";
import { reportClientError } from "@/server/client-log";
import { ErrorScreen } from "@/components/pages/ErrorScreen";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    void reportClientError("admin.crash", error.message, { path: location.pathname, digest: error.digest }).catch(() => {});
  }, [error]);
  return <ErrorScreen code="500" title="Cette page n'a pas pu se charger." text="Réessaie dans un instant. Si ça continue, le détail de l'erreur est dans le terminal de pnpm dev." onRetry={reset} />;
}
