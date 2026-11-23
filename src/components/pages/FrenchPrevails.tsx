import { getLocale } from "@/lib/i18n/server";

/** On the English legal pages: the translation is for convenience, the French text is the one that binds. */
export async function FrenchPrevails() {
  if ((await getLocale()) !== "en") return null;
  return (
    <p className="rounded-2xl bg-surface px-5 py-4 text-[15px] leading-relaxed text-muted">
      This English version is provided for convenience. The French version of this page is the legally binding one; if the two differ, the French text prevails.
    </p>
  );
}
