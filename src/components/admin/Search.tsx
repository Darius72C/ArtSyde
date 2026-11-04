import Form from "next/form";

/**
 * Search box that writes `?q=` in the URL (works without JavaScript, navigates client-side with it).
 * `keep` carries the other filters along.
 */
export function Search({ action, q, placeholder, keep = {} }: { action: string; q?: string; placeholder: string; keep?: Record<string, string | undefined> }) {
  return (
    <Form action={action} role="search" className="w-full lg:w-80">
      {Object.entries(keep).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <label className="sr-only" htmlFor="admin-search">
        Rechercher
      </label>
      <input id="admin-search" name="q" type="search" defaultValue={q} placeholder={placeholder} className="field !rounded-full !px-5 !py-2 !text-[15px]" />
    </Form>
  );
}
