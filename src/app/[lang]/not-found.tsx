import { PageShell } from "@/components/PageShell";
import { ErrorScreen } from "@/components/pages/ErrorScreen";

export default function NotFound() {
  return (
    <PageShell>
      <ErrorScreen code="404" title="Cette page n'existe pas." text="Elle a peut-être été déplacée. La boutique, elle, t'attend toujours." />
    </PageShell>
  );
}
