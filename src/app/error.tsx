"use client";

import { useEffect } from "react";
import { reportClientError } from "@/server/client-log";
import { PageFrame } from "@/components/PageFrame";
import { ErrorScreen } from "@/components/pages/ErrorScreen";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    void reportClientError("page.crash", error.message, { path: location.pathname, digest: error.digest }).catch(() => {});
  }, [error]);
  return (
    <PageFrame>
      <ErrorScreen code="500" title="Un souci de notre côté." text="Réessaie dans un instant. Si ça continue, écris-nous." onRetry={reset} />
    </PageFrame>
  );
}
